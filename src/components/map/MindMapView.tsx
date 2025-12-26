import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { generateMindMap } from '../../services/aiService';
import mermaid from 'mermaid';
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
  const { language, t } = useLanguage();
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

  useEffect(() => {
    // Custom color palettes for better variety
    const darkModeColors = {
      // Bright, vibrant colors for dark mode (good contrast with black text)
      primaryColor: '#60a5fa',      // Blue
      secondaryColor: '#34d399',    // Emerald
      tertiaryColor: '#fbbf24',     // Amber
      primaryBorderColor: '#3b82f6',
      secondaryBorderColor: '#10b981',
      tertiaryBorderColor: '#f59e0b',
      lineColor: '#94a3b8',
      // Additional node colors for deeper levels
      nodeBkg: '#a78bfa',           // Purple
      mainBkg: '#fb7185',           // Rose
      clusterBkg: '#2dd4bf',        // Teal
    };

    const lightModeColors = {
      // Vibrant, saturated colors for light mode (good contrast with white text)
      primaryColor: '#2563eb',      // Vivid blue
      secondaryColor: '#059669',    // Emerald green
      tertiaryColor: '#ea580c',     // Bright orange
      primaryBorderColor: '#1d4ed8',
      secondaryBorderColor: '#047857',
      tertiaryBorderColor: '#c2410c',
      lineColor: '#64748b',
      // Additional node colors for deeper levels - more variety
      nodeBkg: '#7c3aed',           // Vivid purple
      mainBkg: '#dc2626',           // Bright red
      clusterBkg: '#0891b2',        // Cyan
    };

    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'base',
      themeVariables: theme === 'dark' ? darkModeColors : lightModeColors,
      securityLevel: 'loose',
    });
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

    // Capture current theme value to use after async render
    const currentTheme = theme;
    const textColor = currentTheme === 'dark' ? '#000000' : '#ffffff';

    try {
      diagramRef.current.innerHTML = '';
      const { svg } = await mermaid.render(
        `mermaid-${Date.now()}`,
        currentMindMap.mermaid_syntax
      );
      diagramRef.current.innerHTML = svg;
      
      // Apply custom text colors with !important: black text in dark mode, white text in light mode
      const svgElement = diagramRef.current.querySelector('svg');
      if (svgElement) {
        // Apply to all text elements including nested ones
        const textElements = svgElement.querySelectorAll('text, tspan, .nodeLabel, .label');
        textElements.forEach((textEl) => {
          (textEl as HTMLElement).style.setProperty('fill', textColor, 'important');
          (textEl as HTMLElement).style.setProperty('color', textColor, 'important');
        });
        
        // Also apply to foreignObject text content (used in some diagram types)
        const foreignObjects = svgElement.querySelectorAll('foreignObject div, foreignObject span, foreignObject p');
        foreignObjects.forEach((el) => {
          (el as HTMLElement).style.setProperty('color', textColor, 'important');
        });
      }
      
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
      alert(t('map.createdSuccessfully').replace('{{type}}', createModal.type || ''));
    }
  };

  const handleExportPNG = async () => {
    if (!currentMindMap || !diagramRef.current) {
      alert(t('map.noMapToExport'));
      return;
    }

    try {
      const svgElement = diagramRef.current.querySelector('svg');
      if (!svgElement) {
        alert(t('map.noSvgFound'));
        return;
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Get dimensions - try multiple methods
      let svgWidth: number = 800;
      let svgHeight: number = 600;
      
      // Method 1: Try viewBox
      const viewBox = clonedSvg.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/\s+/).filter(p => p.length > 0);
        if (parts.length >= 4) {
          svgWidth = parseFloat(parts[2]) || 800;
          svgHeight = parseFloat(parts[3]) || 600;
        }
      }
      
      // Method 2: Try width/height attributes
      if (svgWidth === 800 || svgHeight === 600) {
        const widthAttr = clonedSvg.getAttribute('width');
        const heightAttr = clonedSvg.getAttribute('height');
        if (widthAttr) {
          const width = parseFloat(widthAttr);
          if (!isNaN(width) && width > 0) svgWidth = width;
        }
        if (heightAttr) {
          const height = parseFloat(heightAttr);
          if (!isNaN(height) && height > 0) svgHeight = height;
        }
      }
      
      // Method 3: Try getBBox (may fail if SVG not rendered)
      if (svgWidth === 800 || svgHeight === 600) {
        try {
          const bbox = svgElement.getBBox();
          if (bbox.width > 0) svgWidth = bbox.width;
          if (bbox.height > 0) svgHeight = bbox.height;
        } catch (e) {
          // getBBox failed, use defaults
        }
      }
      
      // Method 4: Try client dimensions
      if (svgWidth === 800 || svgHeight === 600) {
        const clientWidth = svgElement.clientWidth;
        const clientHeight = svgElement.clientHeight;
        if (clientWidth > 0) svgWidth = clientWidth;
        if (clientHeight > 0) svgHeight = clientHeight;
      }

      // Ensure valid dimensions
      if (isNaN(svgWidth) || svgWidth <= 0) svgWidth = 800;
      if (isNaN(svgHeight) || svgHeight <= 0) svgHeight = 600;

      // Set explicit dimensions on cloned SVG
      clonedSvg.setAttribute('width', svgWidth.toString());
      clonedSvg.setAttribute('height', svgHeight.toString());
      clonedSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
      
      // Ensure SVG has proper namespace
      if (!clonedSvg.getAttribute('xmlns')) {
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
      
      // Remove any style that might interfere
      clonedSvg.removeAttribute('style');

      // Create a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        alert(t('map.canvasError'));
        return;
      }

      // Set canvas size with padding
      const padding = 20;
      const canvasWidth = svgWidth + padding * 2;
      const canvasHeight = svgHeight + padding * 2;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fill background based on theme
      ctx.fillStyle = theme === 'dark' ? '#000000' : '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      // Encode SVG data properly - use base64 for better compatibility
      let svgDataUrl: string;
      try {
        // Try base64 encoding first (more compatible)
        const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
        svgDataUrl = `data:image/svg+xml;base64,${base64Svg}`;
      } catch (e) {
        // Fallback to URI encoding if base64 fails
        const encodedSvg = encodeURIComponent(svgData);
        svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
      }

      // Create an image from the SVG data URL
      const img = new Image();
      
      // Use a promise to handle async image loading
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Draw the image on canvas with padding
            ctx.drawImage(img, padding, padding, svgWidth, svgHeight);
            resolve();
          } catch (error) {
            console.error('Error drawing image to canvas:', error);
            reject(error);
          }
        };

        img.onerror = (error) => {
          console.error('Error loading SVG image:', error);
          reject(new Error('Failed to load SVG image'));
        };

        // Set image source
        img.src = svgDataUrl;
      });

      // Convert canvas to PNG and download
      canvas.toBlob((blob) => {
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          const sanitizedTitle = currentMindMap.title.replace(/[^a-z0-9]/gi, '_');
          link.download = `${sanitizedTitle}_${new Date().getTime()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } else {
          alert(t('map.exportError'));
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert(t('map.exportError'));
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
            {t('map.mindMap')}
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
            {t('map.generateFromProblem')}
          </h2>
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder={t('map.placeholder')}
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
                {generating ? t('map.generating') : t('map.generateAndSave')}
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
                {t('map.allHistory')} ({savedMindMaps.length})
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('map.autoSavedDescription')}
            </p>
          </div>

          {/* Navigation History Snapshots */}
          {navigationHistory.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('map.sessionHistory')}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ({navigationHistory.length} {navigationHistory.length === 1 ? t('map.map') : t('map.maps')})
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
                    title={t('map.goBack')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNavigateForward}
                    disabled={historyIndex >= navigationHistory.length - 1}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    title={t('map.goForward')}
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
                  {t('objectives.goal')}
                </button>
                <button
                  onClick={() => openCreateModal('objective')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                >
                  <Flag className="w-4 h-4" />
                  {t('objectives.objective')}
                </button>
                <button
                  onClick={() => openCreateModal('task')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors text-sm font-medium"
                >
                  <CheckSquare className="w-4 h-4" />
                  {t('objectives.task')}
                </button>
                <button
                  onClick={() => openCreateModal('idea')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-sm font-medium"
                >
                  <Lightbulb className="w-4 h-4" />
                  {t('nav.ideate')}
                </button>
                <button
                  onClick={handleExportPNG}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors text-sm font-medium"
                  title={t('map.exportPNG')}
                >
                  <Download className="w-4 h-4" />
                  {t('map.exportPNG')}
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
                  title={isFullscreen ? t('map.exitFullscreen') : t('map.enterFullscreen')}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {selectedNodes.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>{t('map.selected')}</strong> {selectedNodes[selectedNodes.length - 1]}
                  <span className="ml-2 text-xs opacity-75">{t('map.doubleClickInstruction')}</span>
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
              <p className="text-lg">{t('map.emptyState')}</p>
            </div>
          </div>
        )}
      </div>

      {showHistory && !isFullscreen && (
        <div className="w-80 bg-white dark:bg-black border-l border-gray-200 dark:border-white/10 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
            <h3 className="font-bold text-gray-900 dark:text-white">{t('map.savedMindMaps')}</h3>
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
                {t('map.noSavedMindMaps')}
              </div>
            )}
          </div>
        </div>
      )}

      {createModal.type && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-white/10 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {t('map.createItem').replace('{{type}}', createModal.type === 'goal' ? t('objectives.goal') : createModal.type === 'objective' ? t('objectives.objective') : createModal.type === 'task' ? t('objectives.task') : t('nav.ideate'))}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('objectives.title')}</label>
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
