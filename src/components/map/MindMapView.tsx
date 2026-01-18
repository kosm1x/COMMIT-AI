import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { generateMindMap } from '../../services/aiService';
import { formatShortDate } from '../../utils/trackingStats';
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
  Download,
  ChevronDown,
  FileCode,
  Image,
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
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [problemStatement, setProblemStatement] = useState('');
  const [currentMindMap, setCurrentMindMap] = useState<MindMap | null>(null);
  const [savedMindMaps, setSavedMindMaps] = useState<MindMap[]>([]);
  const [generating, setGenerating] = useState(false);
  // Initialize showHistory to false on mobile (screen width < 1024px), true on desktop
  const [showHistory, setShowHistory] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });
  const [createModal, setCreateModal] = useState<CreateItemModal>({ type: null, nodeText: '' });
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
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
      diagramRef.current.innerHTML = `<div class="text-red-600 p-4">${t('map.errorRendering')}</div>`;
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
        ? `${contextChain}\n\n${t('map.previousTree')} ${currentMindMap.title}\n${t('map.problem')} ${currentMindMap.problem_statement}`
        : `${t('map.previousTree')} ${currentMindMap.title}\n${t('map.problem')} ${currentMindMap.problem_statement}`;
      
      const result = await generateMindMap(cleanText, newContext, language);

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
      const result = await generateMindMap(problemStatement, undefined, language);

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
    if (!confirm(t('map.deleteMindMapConfirm'))) return;

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
      alert(t('map.selectNodeFirst'));
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

  const handleDownloadPNG = async () => {
    if (!currentMindMap || !diagramRef.current) return;
    
    try {
      // Get SVG directly from the diagram container
      const svgElement = diagramRef.current.querySelector('svg') as SVGElement;
      if (!svgElement) {
        alert(t('map.noMapToDownload'));
        return;
      }

      // Clone SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Important SVG/CSS properties to inline for accurate rendering
      const importantProperties = [
        'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin',
        'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline',
        'color', 'opacity', 'visibility', 'display', 'transform', 'filter',
      ];
      
      // Inline computed styles for each element
      const inlineStyles = (sourceEl: Element, targetEl: Element) => {
        const computedStyle = window.getComputedStyle(sourceEl);
        
        // Build style string with only important properties
        let styleString = '';
        importantProperties.forEach(prop => {
          const value = computedStyle.getPropertyValue(prop);
          if (value && value !== 'none' && value !== 'normal' && value !== '') {
            styleString += `${prop}:${value};`;
          }
        });
        
        // Special handling for text elements - ensure fill is set
        if (sourceEl.tagName.toLowerCase() === 'text' || sourceEl.tagName.toLowerCase() === 'tspan') {
          const fill = computedStyle.getPropertyValue('fill');
          const color = computedStyle.getPropertyValue('color');
          if (fill && fill !== 'none') {
            styleString += `fill:${fill};`;
          } else if (color) {
            styleString += `fill:${color};`;
          }
        }
        
        if (styleString) {
          const existingStyle = targetEl.getAttribute('style') || '';
          targetEl.setAttribute('style', existingStyle + styleString);
        }
        
        // Recursively process children
        const sourceChildren = Array.from(sourceEl.children);
        const targetChildren = Array.from(targetEl.children);
        sourceChildren.forEach((child, index) => {
          if (targetChildren[index]) {
            inlineStyles(child, targetChildren[index]);
          }
        });
      };
      
      inlineStyles(svgElement, clonedSvg);
      
      // Set explicit dimensions on the cloned SVG
      const svgRect = svgElement.getBoundingClientRect();
      clonedSvg.setAttribute('width', String(svgRect.width));
      clonedSvg.setAttribute('height', String(svgRect.height));

      // Get SVG data with inlined styles
      const serializer = new XMLSerializer();
      const svgData = serializer.serializeToString(clonedSvg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();

      // Set canvas size (2x for better quality)
      canvas.width = svgRect.width * 2;
      canvas.height = svgRect.height * 2;

      img.onload = () => {
        if (ctx) {
          // Theme-aware background
          ctx.fillStyle = theme === 'dark' ? '#1a1a1a' : '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Draw SVG
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${currentMindMap.title.replace(/[^a-z0-9]/gi, '_')}_mindmap.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
          });
        }
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error('Error downloading PNG:', error);
      alert(t('map.downloadError'));
    }
    setShowDownloadMenu(false);
  };

  const handleDownloadMermaid = () => {
    if (!currentMindMap) return;
    
    const blob = new Blob([currentMindMap.mermaid_syntax], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentMindMap.title.replace(/[^a-z0-9]/gi, '_')}_mindmap.mmd`;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const handleCreateItem = async () => {
    if (!createModal.type) return;

    const itemData: any = {
      user_id: user!.id,
      title: createModal.nodeText,
      description: `${t('map.createdFromMindMap')} ${currentMindMap?.title}`,
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
      const typeLabel = createModal.type === 'goal' ? t('objectives.goal') : 
                        createModal.type === 'objective' ? t('objectives.objective') : 
                        createModal.type === 'task' ? t('objectives.task') : 
                        t('ideate.title');
      alert(t('map.createdSuccessfully').replace('{{type}}', typeLabel));
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
        className={`flex-shrink-0 w-40 sm:w-48 p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
          currentMindMap?.id === mindMap.id
            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-blue-300 dark:hover:border-blue-700'
        }`}
      >
        <div className="flex items-start justify-between mb-1 sm:mb-2">
          <h4 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 flex-1">
            {mindMap.title}
          </h4>
          {currentMindMap?.id === mindMap.id && (
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1 ml-2"></div>
          )}
        </div>
        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 line-clamp-2">
          {mindMap.problem_statement.substring(0, 60)}...
        </p>
        <div className="flex items-center justify-between mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-gray-200 dark:border-white/10">
          <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500">
            {formatShortDate(new Date(mindMap.created_at))}
          </span>
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500">
            <Network className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="hidden sm:inline">{t('map.mapLabel')}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col sm:flex-row overflow-hidden">
      <div className={`flex-1 flex flex-col p-3 sm:p-4 lg:p-6 min-w-0 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-50 dark:bg-black' : ''}`}>
        <div className={`bg-white dark:bg-white/5 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 p-3 sm:p-4 lg:p-6 flex-shrink-0 ${isFullscreen ? 'hidden' : 'mb-3 sm:mb-4 lg:mb-6'}`}>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            {t('map.generateFromProblem')}
          </h2>
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder={t('map.placeholder')}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-black/40 text-text-primary text-sm sm:text-base"
            rows={3}
          />
          <div className="space-y-2 mt-3 sm:mt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating || !problemStatement.trim()}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-blue-500/20 text-sm sm:text-base"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{generating ? t('map.generating') : t('map.generateAndSave')}</span>
                <span className="sm:hidden">{generating ? t('map.generating') : t('ideate.generate')}</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHistory(!showHistory);
                }}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors font-medium text-sm sm:text-base"
              >
                <History className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{t('map.allHistory')} ({savedMindMaps.length})</span>
                <span className="sm:hidden">{t('map.history')} ({savedMindMaps.length})</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('map.autoSavedDescription')}
            </p>
          </div>

          {/* Navigation History Snapshots */}
          {navigationHistory.length > 0 && (
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <History className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('map.sessionHistory')}
                </h3>
                <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                  ({navigationHistory.length} {navigationHistory.length === 1 ? t('map.map') : t('map.maps')})
                </span>
              </div>
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {navigationHistory.map((item, index) => renderHistorySnapshot(item.mindMap, index))}
              </div>
            </div>
          )}
        </div>

        {currentMindMap && (
          <div className={`bg-white dark:bg-white/5 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 flex-1 flex flex-col overflow-hidden min-h-0 ${isFullscreen ? 'h-full' : ''}`}>
            <div className="p-2 sm:p-3 lg:p-4 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={handleNavigateBack}
                    disabled={historyIndex < 0}
                    className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium"
                    title={t('map.goBack')}
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={handleNavigateForward}
                    disabled={historyIndex >= navigationHistory.length - 1}
                    className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium"
                    title={t('map.goForward')}
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate">{currentMindMap.title}</h3>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                {/* Download Button with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs sm:text-sm font-medium"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('map.download')}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-border-primary z-10 min-w-[160px] animate-in slide-in-from-top-2">
                      <button
                        onClick={handleDownloadPNG}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary rounded-t-lg transition-colors"
                      >
                        <Image className="w-4 h-4" />
                        {t('map.downloadPNG')}
                      </button>
                      <button
                        onClick={handleDownloadMermaid}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary rounded-b-lg transition-colors"
                      >
                        <FileCode className="w-4 h-4" />
                        {t('map.downloadMermaid')}
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => openCreateModal('goal')}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-xs sm:text-sm font-medium"
                >
                  <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('objectives.goal')}</span>
                </button>
                <button
                  onClick={() => openCreateModal('objective')}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-xs sm:text-sm font-medium"
                >
                  <Flag className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('objectives.objective')}</span>
                </button>
                <button
                  onClick={() => openCreateModal('task')}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors text-xs sm:text-sm font-medium"
                >
                  <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('objectives.task')}</span>
                </button>
                <button
                  onClick={() => openCreateModal('idea')}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-xs sm:text-sm font-medium"
                >
                  <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('nav.ideate')}</span>
                </button>
                <button
                  onClick={() => {
                    setIsFullscreen(!isFullscreen);
                    // Ensure history is visible when exiting fullscreen if it was visible before
                    if (isFullscreen) {
                      setShowHistory(true);
                    }
                  }}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-xs sm:text-sm font-medium"
                  title={isFullscreen ? t('map.exitFullscreen') : t('map.enterFullscreen')}
                >
                  {isFullscreen ? <Minimize className="w-3 h-3 sm:w-4 sm:h-4" /> : <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </div>
            {selectedNodes.length > 0 && (
              <div className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex-shrink-0">
                <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                  <strong>{t('map.selected')}</strong> {selectedNodes[selectedNodes.length - 1]}
                  <span className="hidden sm:inline ml-2 text-xs opacity-75">{t('map.doubleClickInstruction')}</span>
                </p>
              </div>
            )}
            <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 bg-white dark:bg-black/40 min-h-0">
              <div
                ref={diagramRef}
                className="flex items-center justify-center min-h-full"
              ></div>
            </div>
          </div>
        )}

        {!currentMindMap && !generating && (
          <div className="flex-1 flex items-center justify-center text-gray-400 min-h-0">
            <div className="text-center px-4">
              <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base lg:text-lg">{t('map.emptyState')}</p>
            </div>
          </div>
        )}
      </div>

      {/* History Sidebar - Responsive: overlay on mobile, side panel on desktop */}
      {showHistory && !isFullscreen && (
        <>
          {/* Mobile overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setShowHistory(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 bottom-0 w-[85vw] sm:w-80 max-w-sm bg-white dark:bg-black border-l border-gray-200 dark:border-white/10 flex flex-col overflow-hidden z-50 lg:relative lg:z-auto lg:w-64 xl:w-80 shadow-xl lg:shadow-none">
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">{t('map.savedMindMaps')}</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-text-secondary"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2 min-h-0">
              {savedMindMaps.map((map) => (
                <div
                  key={map.id}
                  className="p-2 sm:p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => {
                        loadMindMap(map);
                        setShowHistory(false); // Close sidebar on mobile after selection
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm mb-1 truncate">{map.title}</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {formatShortDate(new Date(map.created_at))}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDelete(map.id)}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {savedMindMaps.length === 0 && (
                <div className="text-center py-8 text-xs sm:text-sm text-gray-400">
                  {t('map.noSavedMindMaps')}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {createModal.type && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-white/10 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {t('map.createItem').replace('{{type}}', createModal.type === 'goal' ? t('objectives.goal') : 
                createModal.type === 'objective' ? t('objectives.objective') : 
                createModal.type === 'task' ? t('objectives.task') : 
                t('ideate.title'))}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ideaDetail.title')}</label>
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateItem}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
