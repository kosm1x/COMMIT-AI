import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { generateMindMap } from '../../services/aiService';
import type { MermaidConfig } from 'mermaid';
import {
  Sparkles,
  History,
  Trash2,
  Target,
  Flag,
  CheckSquare,
  X,
  Maximize,
  Minimize,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Network,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MindMap {
  id: string;
  title: string;
  problem_statement: string;
  mermaid_syntax: string;
  created_at: string;
}

interface CreateItemModal {
  type: 'goal' | 'objective' | 'task' | 'idea' | null;
  nodeText: string;
}


interface NavigationState {
  mindMap: MindMap;
  context: string;
}

export default function MindMapView() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [problemStatement, setProblemStatement] = useState('');
  const [currentMindMap, setCurrentMindMap] = useState<MindMap | null>(null);
  const [savedMindMaps, setSavedMindMaps] = useState<MindMap[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [createModal, setCreateModal] = useState<CreateItemModal>({ type: null, nodeText: '' });
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [contextChain, setContextChain] = useState<string>('');
  const diagramRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<typeof import('mermaid').default | null>(null);

  // Lazy load mermaid library
  const loadMermaid = useCallback(async () => {
    if (mermaidRef.current) return mermaidRef.current;
    
    const mermaidModule = await import('mermaid');
    mermaidRef.current = mermaidModule.default;
    mermaidRef.current.initialize({ 
      startOnLoad: false, 
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    } as MermaidConfig);
    return mermaidRef.current;
  }, [theme]);

  // Re-initialize mermaid when theme changes
  useEffect(() => {
    if (mermaidRef.current) {
      mermaidRef.current.initialize({ 
        startOnLoad: false, 
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
      } as MermaidConfig);
    }
    if (currentMindMap && diagramRef.current) {
      renderMermaid();
    }
  }, [theme, currentMindMap]);

  useEffect(() => {
    if (user) {
      loadSavedMindMaps();
    }
  }, [user]);

  useEffect(() => {
    // Pre-fill problem statement from navigation state
    if (location.state?.problemStatement) {
      setProblemStatement(location.state.problemStatement);
    }
  }, [location.state]);

  useEffect(() => {
    if (currentMindMap && diagramRef.current) {
      renderMermaid();
    }
  }, [currentMindMap]);

  const loadSavedMindMaps = async () => {
    const { data } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) {
      setSavedMindMaps(data);
    }
  };

  const renderMermaid = async () => {
    if (!diagramRef.current || !currentMindMap) return;

    try {
      // Lazy load mermaid if not loaded yet
      const mermaid = await loadMermaid();
      
      diagramRef.current.innerHTML = '';
      const { svg } = await mermaid.render(
        `mermaid-${Date.now()}`,
        currentMindMap.mermaid_syntax
      );
      diagramRef.current.innerHTML = svg;
      addNodeClickHandlers();
    } catch (error) {
      console.error('Error rendering mermaid:', error);
      diagramRef.current.innerHTML = `<div class="text-red-600 p-4">Error rendering mind map. Please try regenerating.</div>`;
    }
  };

  const addNodeClickHandlers = () => {
    if (!diagramRef.current) return;

    const nodes = diagramRef.current.querySelectorAll('.mindmap-node, .node');
    nodes.forEach((node) => {
      // Single click for selection
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const textElement = node.querySelector('text, span');
        if (textElement) {
          const nodeText = textElement.textContent || '';
          handleNodeClick(nodeText);
        }
      });
      
      // Double click to create new tree
      node.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const textElement = node.querySelector('text, span');
        if (textElement) {
          const nodeText = textElement.textContent || '';
          handleNodeDoubleClick(nodeText);
        }
      });
      
      (node as HTMLElement).style.cursor = 'pointer';
    });
  };

  const handleNodeClick = async (nodeText: string) => {
    const cleanText = nodeText.replace(/[()]/g, '').trim();
    
    // Double-click or special interaction to create new tree from this node
    // For now, we'll use a modifier key or add a separate handler
    // But first, let's handle single click for selection
    if (selectedNodes.includes(cleanText)) {
      setSelectedNodes(selectedNodes.filter((n) => n !== cleanText));
    } else {
      setSelectedNodes([...selectedNodes, cleanText]);
    }
  };

  const handleNodeDoubleClick = async (nodeText: string) => {
    const cleanText = nodeText.replace(/[()]/g, '').trim();
    
    // Create new tree from this node with context
    if (!currentMindMap) return;
    
    setGenerating(true);
    try {
      // Build context from current tree and previous context
      const newContext = contextChain 
        ? `${contextChain}\n\nPrevious Tree: ${currentMindMap.title}\nProblem: ${currentMindMap.problem_statement}`
        : `Previous Tree: ${currentMindMap.title}\nProblem: ${currentMindMap.problem_statement}`;
      
      const result = await generateMindMap(cleanText, newContext);

      const { data, error } = await supabase
        .from('mind_maps')
        .insert({
          user_id: user!.id,
          title: result.title,
          problem_statement: cleanText,
          mermaid_syntax: result.mermaidSyntax,
        })
        .select()
        .single();

      if (data && !error) {
        // Add current mind map to navigation history before creating new one
        const newHistoryItem: NavigationState = {
          mindMap: currentMindMap,
          context: contextChain,
        };
        
        // Remove any "future" history if we're not at the end
        const newHistory = navigationHistory.slice(0, historyIndex + 1);
        newHistory.push(newHistoryItem);
        
        // Add the new mind map to history
        const newMindMapState: NavigationState = {
          mindMap: data,
          context: newContext,
        };
        newHistory.push(newMindMapState);
        
        setNavigationHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        
        // Update context chain
        setContextChain(newContext);
        
        // Set new mind map
        setCurrentMindMap(data);
        setIsFullscreen(true); // Expand mind map by default after generation
        setSelectedNodes([]);
        loadSavedMindMaps();
      }
    } catch (error) {
      console.error('Error generating new mind map:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!problemStatement.trim()) return;

    setGenerating(true);
    try {
      const result = await generateMindMap(problemStatement);

      const { data, error } = await supabase
        .from('mind_maps')
        .insert({
          user_id: user!.id,
          title: result.title,
          problem_statement: problemStatement,
          mermaid_syntax: result.mermaidSyntax,
        })
        .select()
        .single();

      if (data && !error) {
        // Reset navigation history for new root tree
        const rootState: NavigationState = {
          mindMap: data,
          context: '',
        };
        setNavigationHistory([rootState]);
        setHistoryIndex(0);
        setContextChain('');
        setCurrentMindMap(data);
        setIsFullscreen(true); // Expand mind map by default after generation
        loadSavedMindMaps();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleNavigateBack = () => {
    if (historyIndex > 0) {
      const previousIndex = historyIndex - 1;
      const previousItem = navigationHistory[previousIndex];
      setCurrentMindMap(previousItem.mindMap);
      setContextChain(previousItem.context);
      setHistoryIndex(previousIndex);
      setSelectedNodes([]);
    }
  };

  const handleNavigateForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextItem = navigationHistory[nextIndex];
      setCurrentMindMap(nextItem.mindMap);
      setContextChain(nextItem.context);
      setHistoryIndex(nextIndex);
      setSelectedNodes([]);
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm('Delete this mind map?')) return;

    await supabase.from('mind_maps').delete().eq('id', id);
    loadSavedMindMaps();

    if (currentMindMap?.id === id) {
      setCurrentMindMap(null);
    }
  };

  const loadMindMap = (mindMap: MindMap) => {
    // Reset navigation when loading from history
    const rootState: NavigationState = {
      mindMap: mindMap,
      context: '',
    };
    setNavigationHistory([rootState]);
    setHistoryIndex(0);
    setContextChain('');
    setCurrentMindMap(mindMap);
    setProblemStatement(mindMap.problem_statement);
    setIsFullscreen(true); // Expand mind map by default after retrieval
    setSelectedNodes([]);
  };

  const openCreateModal = (type: 'goal' | 'objective' | 'task' | 'idea') => {
    if (selectedNodes.length === 0) {
      alert('Please select a node from the mind map first');
      return;
    }
    
    if (type === 'idea') {
      // Navigate to ideate page with the selected node text
      const nodeText = selectedNodes[selectedNodes.length - 1];
      navigate('/ideate', { state: { initialInput: nodeText } });
      return;
    }
    
    setCreateModal({ type, nodeText: selectedNodes[selectedNodes.length - 1] });
  };

  const handleCreateItem = async () => {
    if (!createModal.type) return;

    const itemData: any = {
      user_id: user!.id,
      title: createModal.nodeText,
      description: `Created from mind map: ${currentMindMap?.title}`,
    };

    let table = '';
    switch (createModal.type) {
      case 'goal':
        table = 'goals';
        itemData.status = 'not_started';
        break;
      case 'objective':
        table = 'objectives';
        itemData.status = 'not_started';
        itemData.priority = 'medium';
        break;
      case 'task':
        table = 'tasks';
        itemData.status = 'not_started';
        itemData.priority = 'medium';
        break;
    }

    const { error } = await supabase.from(table).insert(itemData);

    if (!error) {
      setCreateModal({ type: null, nodeText: '' });
      setSelectedNodes([]);
      alert(`${createModal.type} created successfully!`);
    }
  };

  const renderHistorySnapshot = (mindMap: MindMap, index: number) => {
    return (
      <div
        key={mindMap.id}
        onClick={() => {
          const historyItem = navigationHistory[index];
          if (historyItem) {
            setCurrentMindMap(historyItem.mindMap);
            setContextChain(historyItem.context);
            setHistoryIndex(index);
            setSelectedNodes([]);
          } else {
            loadMindMap(mindMap);
          }
        }}
        className={`flex-shrink-0 w-48 p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
          currentMindMap?.id === mindMap.id
            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-blue-300 dark:hover:border-blue-700'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 flex-1">
            {mindMap.title}
          </h4>
          {currentMindMap?.id === mindMap.id && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1 ml-2"></div>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
          {mindMap.problem_statement.substring(0, 80)}...
        </p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(mindMap.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <Network className="w-3 h-3" />
            Map
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex">
      <div className={`flex-1 flex flex-col p-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-50 dark:bg-black' : ''}`}>
        <div className={`bg-white dark:bg-white/5 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 p-6 ${isFullscreen ? 'hidden' : 'mb-6'}`}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Generate Mind Map from Problem
          </h2>
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="Describe your problem or challenge here... The AI will break it down into a structured mind map."
            className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-black/40 text-text-primary"
            rows={4}
          />
          <div className="space-y-2 mt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating || !problemStatement.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-blue-500/20"
              >
                <Sparkles className="w-5 h-5" />
                {generating ? 'Generating...' : 'Generate & Save Mind Map'}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHistory(!showHistory);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors font-medium"
              >
                <History className="w-5 h-5" />
                All History ({savedMindMaps.length})
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Mind maps are automatically saved for future reference
            </p>
          </div>

          {/* Navigation History Snapshots */}
          {navigationHistory.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Session History
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ({navigationHistory.length} {navigationHistory.length === 1 ? 'map' : 'maps'})
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {navigationHistory.map((item, index) => renderHistorySnapshot(item.mindMap, index))}
              </div>
            </div>
          )}
        </div>

        {currentMindMap && (
          <div className={`bg-white dark:bg-white/5 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 flex-1 flex flex-col overflow-hidden ${isFullscreen ? 'h-full' : ''}`}>
            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNavigateBack}
                    disabled={historyIndex < 0}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    title="Go back"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNavigateForward}
                    disabled={historyIndex >= navigationHistory.length - 1}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    title="Go forward"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{currentMindMap.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openCreateModal('goal')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                >
                  <Target className="w-4 h-4" />
                  Goal
                </button>
                <button
                  onClick={() => openCreateModal('objective')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                >
                  <Flag className="w-4 h-4" />
                  Objective
                </button>
                <button
                  onClick={() => openCreateModal('task')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors text-sm font-medium"
                >
                  <CheckSquare className="w-4 h-4" />
                  Task
                </button>
                <button
                  onClick={() => openCreateModal('idea')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-sm font-medium"
                >
                  <Lightbulb className="w-4 h-4" />
                  Ideate
                </button>
                <button
                  onClick={() => {
                    setIsFullscreen(!isFullscreen);
                    // Ensure history is visible when exiting fullscreen if it was visible before
                    if (isFullscreen) {
                      setShowHistory(true);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-sm font-medium"
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {selectedNodes.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Selected:</strong> {selectedNodes[selectedNodes.length - 1]}
                  <span className="ml-2 text-xs opacity-75">(Double-click to create new tree from this node)</span>
                </p>
              </div>
            )}
            <div className="flex-1 overflow-auto p-6 bg-white dark:bg-black/40">
              <div
                ref={diagramRef}
                className="flex items-center justify-center min-h-full"
              ></div>
            </div>
          </div>
        )}

        {!currentMindMap && !generating && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Enter a problem and generate a mind map to get started</p>
            </div>
          </div>
        )}
      </div>

      {showHistory && !isFullscreen && (
        <div className="w-80 bg-white dark:bg-black border-l border-gray-200 dark:border-white/10 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
            <h3 className="font-bold text-gray-900 dark:text-white">Saved Mind Maps</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-text-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 min-h-0">
            {savedMindMaps.map((map) => (
              <div
                key={map.id}
                className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => loadMindMap(map)}
                    className="flex-1 text-left"
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">{map.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(map.created_at).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(map.id)}
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {savedMindMaps.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                No saved mind maps yet
              </div>
            )}
          </div>
        </div>
      )}

      {createModal.type && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-white/10 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Create {createModal.type.charAt(0).toUpperCase() + createModal.type.slice(1)}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
              <input
                type="text"
                value={createModal.nodeText}
                onChange={(e) =>
                  setCreateModal({ ...createModal, nodeText: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white/5 text-text-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCreateModal({ type: null, nodeText: '' })}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateItem}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
