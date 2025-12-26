import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { findIdeaConnections, transformIdeaText } from '../services/aiService';
import AIAssistantPanel from '../components/AIAssistantPanel';
import {
  Save,
  Trash2,
  Download,
  ArrowLeft,
  Loader2,
  Clock,
  Link2,
  FileText,
  FileCode,
  File,
  Sparkles,
  Wand2,
  CornerDownRight,
  Scissors,
  Users,
  Lightbulb,
  CheckSquare,
  Network,
} from 'lucide-react';

interface Idea {
  id: string;
  user_id: string;
  title: string;
  content: string;
  initial_input: string;
  category: string;
  tags: string[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

interface Connection {
  ideaId: string;
  ideaTitle: string;
  connectionType: 'similar' | 'complementary' | 'prerequisite' | 'related';
  strength: number;
  reason: string;
}

export default function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string }>({
    start: 0,
    end: 0,
    text: '',
  });
  const [selectionMenu, setSelectionMenu] = useState<{ text: string; x: number; y: number } | null>(null);
  const [aiTransforming, setAiTransforming] = useState<'enhance' | 'complete' | 'shorten' | 'summarize' | 'cocreate' | null>(null);
  const [aiCache, setAiCache] = useState<{
    divergentPaths?: Array<{ title: string; description: string; approach: string; potentialOutcome: string }>;
    nextSteps?: Array<{ step: string; description: string; timeEstimate: string; priority: 'high' | 'medium' | 'low' }>;
    criticalAnalysis?: { strengths: string[]; challenges: string[]; assumptions: string[]; alternativePerspectives: string[] } | null;
    relatedConcepts?: Array<{ concept: string; description: string; relevance: string; resources: string[] }>;
  }>({});

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/';
      return;
    }

    if (user && id) {
      loadIdea();
    }
  }, [user, id, authLoading]);

  // Clear AI cache when idea ID changes or when idea content changes
  useEffect(() => {
    setAiCache({});
  }, [id, idea?.title, idea?.content]);

  const loadIdea = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setIdea(data);

      await loadConnections(data);
    } catch (error) {
      console.error('Error loading idea:', error);
      navigate('/ideate');
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async (currentIdea: Idea) => {
    setLoadingConnections(true);
    try {
      const { data: allIdeas, error } = await supabase
        .from('ideas')
        .select('id, title, content, tags')
        .eq('user_id', user?.id)
        .neq('id', currentIdea.id);

      if (error) {
        console.error('[IdeaDetail] Error fetching ideas:', error);
        throw error;
      }

      // Debug logging (only in development)
      if (import.meta.env.DEV) {
        console.log(`[IdeaDetail] Found ${allIdeas?.length || 0} other ideas to compare`);
      }

      if (allIdeas && allIdeas.length > 0) {
        const foundConnections = await findIdeaConnections(
          `${currentIdea.title}\n${currentIdea.content || ''}`,
          allIdeas.map(idea => ({
            id: idea.id,
            title: idea.title,
            content: idea.content || '',
            tags: idea.tags || []
          })),
          {
            title: currentIdea.title,
            tags: currentIdea.tags || []
          },
          language
        );
        // Debug logging (only in development)
        if (import.meta.env.DEV) {
          console.log(`[IdeaDetail] Found ${foundConnections.length} connections`);
        }
        setConnections(foundConnections);
      } else {
        // Debug logging (only in development)
        if (import.meta.env.DEV) {
          console.log('[IdeaDetail] No other ideas found, cannot create connections');
        }
        setConnections([]);
      }
    } catch (error) {
      console.error('[IdeaDetail] Error loading connections:', error);
      setConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleSave = async () => {
    if (!idea || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ideas')
        .update({
          title: idea.title,
          content: idea.content,
          category: idea.category,
          tags: idea.tags,
          status: idea.status,
        })
        .eq('id', idea.id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving idea:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!idea || !user) return;
    if (!confirm(t('ideaDetail.deleteConfirm'))) return;

    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', idea.id)
        .eq('user_id', user.id);

      if (error) throw error;
      window.close();
    } catch (error) {
      console.error('Error deleting idea:', error);
    }
  };

  const handleExport = (format: 'txt' | 'md' | 'json') => {
    if (!idea) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'txt':
        content = `${idea.title}\n\n${idea.content}\n\nCategory: ${idea.category}\nTags: ${idea.tags.join(', ')}\nCreated: ${new Date(idea.created_at).toLocaleDateString()}`;
        filename = `${idea.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        mimeType = 'text/plain';
        break;

      case 'md':
        content = `# ${idea.title}\n\n${idea.content}\n\n---\n\n**Category:** ${idea.category}  \n**Tags:** ${idea.tags.join(', ')}  \n**Created:** ${new Date(idea.created_at).toLocaleDateString()}\n\n## Connections\n\n${connections.map(c => `- **${c.ideaTitle}** (${c.connectionType}): ${c.reason}`).join('\n')}`;
        filename = `${idea.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        mimeType = 'text/markdown';
        break;

      case 'json':
        content = JSON.stringify({ ...idea, connections }, null, 2);
        filename = `${idea.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const captureSelection = () => {
    const el = textareaRef.current;
    if (!el || !editorRef.current) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const text = el.value.slice(start, end);
    setSelection({ start, end, text });
    
    // Show selection menu if text is selected
    if (text.trim().length >= 3) {
      // Use a small delay to ensure selection is complete
      setTimeout(() => {
        // Calculate position based on selection in textarea
        const textBeforeSelection = el.value.slice(0, start);
        const linesBefore = textBeforeSelection.split('\n');
        const currentLineIndex = linesBefore.length - 1;
        
        // Get computed styles for accurate calculations
        const computedStyle = getComputedStyle(el);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 16;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 12;
        const fontSize = parseFloat(computedStyle.fontSize) || 14;
        
        // Calculate character width (monospace font assumption)
        const charWidth = fontSize * 0.6; // Approximate for monospace
        
        // Find the start of the current line
        const lineStart = textBeforeSelection.lastIndexOf('\n') + 1;
        const charsInLine = start - lineStart;
        
        // Calculate X position (middle of selection) as percentage of textarea width
        const selectionLength = end - start;
        const selectionStartInLine = charsInLine;
        const selectionMiddleInLine = selectionStartInLine + (selectionLength / 2);
        const textareaWidth = el.offsetWidth;
        const xPixel = paddingLeft + (selectionMiddleInLine * charWidth);
        const xPercent = (xPixel / textareaWidth) * 100;
        
        // Calculate Y position (middle of the line where selection is)
        const y = paddingTop + (currentLineIndex * lineHeight) + (lineHeight / 2);
        
        // Clamp X to reasonable bounds (15% to 85% of textarea width to keep menu visible)
        const clampedXPercent = Math.max(15, Math.min(85, xPercent));
        
        setSelectionMenu({
          text: text.trim(),
          x: clampedXPercent,
          y: y,
        });
      }, 10);
    } else {
      setSelectionMenu(null);
    }
  };

  const replaceSelection = (replacement: string) => {
    if (!idea) return;
    const content = idea.content || '';
    if (selection.text && selection.end > selection.start) {
      const before = content.slice(0, selection.start);
      const after = content.slice(selection.end);
      const newContent = `${before}${replacement}${after}`;
      setIdea({ ...idea, content: newContent });
      // update selection to new text
      const newStart = selection.start;
      const newEnd = selection.start + replacement.length;
      setSelection({ start: newStart, end: newEnd, text: replacement });
      // restore selection in textarea
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newStart;
          textareaRef.current.selectionEnd = newEnd;
        }
      });
    } else {
      setIdea({ ...idea, content: replacement });
      const newStart = 0;
      const newEnd = replacement.length;
      setSelection({ start: newStart, end: newEnd, text: replacement });
    }
  };

  const insertAtCursor = (textToInsert: string) => {
    if (!idea) return;
    const content = idea.content || '';
    const cursorPos = selection.start;
    const before = content.slice(0, cursorPos);
    const after = content.slice(cursorPos);
    const newContent = `${before}${textToInsert}${after}`;
    setIdea({ ...idea, content: newContent });
    // Move cursor to end of inserted text
    const newPos = cursorPos + textToInsert.length;
    setSelection({ start: newPos, end: newPos, text: '' });
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
      }
    });
  };

  const handleTransform = async (mode: 'enhance' | 'complete' | 'shorten' | 'summarize' | 'cocreate') => {
    if (!idea) return;
    
    let targetText = '';
    let contextText = '';
    
    try {
      setAiTransforming(mode);
      
      switch (mode) {
        case 'enhance':
          // Enhance: Only work on selected text
          if (!selection.text || selection.text.trim().length === 0) {
            alert(t('ideaDetail.selectTextToEnhance'));
            return;
          }
          targetText = selection.text;
          break;
          
        case 'complete':
          // Complete: Use everything before cursor as context, continue from cursor
          contextText = idea.content.slice(0, selection.start);
          targetText = contextText;
          break;
          
        case 'shorten':
          // Shorten: Only work on selected text
          if (!selection.text || selection.text.trim().length === 0) {
            alert(t('ideaDetail.selectTextToShorten'));
            return;
          }
          targetText = selection.text;
          break;
          
        case 'summarize':
          // Summarize: Work on all text
          targetText = idea.content || '';
          break;
          
        case 'cocreate':
          // Co-create: Use last paragraph before cursor as context
          const beforeCursor = idea.content.slice(0, selection.start);
          const paragraphs = beforeCursor.split(/\n\n+/);
          const lastParagraph = paragraphs[paragraphs.length - 1] || beforeCursor;
          targetText = lastParagraph.trim();
          contextText = beforeCursor;
          break;
      }
      
      if (!targetText.trim()) {
        alert(t('ideaDetail.noContentToTransform'));
        return;
      }
      
      const result = await transformIdeaText(mode, targetText, { 
        title: idea.title, 
        content: idea.content,
        cursorPosition: selection.start,
        fullContext: contextText
      }, language);
      
      // Apply result based on mode behavior
      if (mode === 'complete' || mode === 'cocreate') {
        // Insert at cursor, don't replace
        insertAtCursor(result);
      } else if (mode === 'enhance' || mode === 'shorten') {
        // Replace selected text
        replaceSelection(result);
      } else if (mode === 'summarize') {
        // Replace all content with summary
        setIdea({ ...idea, content: result });
        setSelection({ start: 0, end: result.length, text: result });
      }
      
    } catch (error) {
      console.error('Error transforming text:', error);
    } finally {
      setAiTransforming(null);
    }
  };

  const addTag = (tag: string) => {
    if (!idea || idea.tags.includes(tag)) return;
    setIdea({ ...idea, tags: [...idea.tags, tag] });
  };

  const removeTag = (tag: string) => {
    if (!idea) return;
    setIdea({ ...idea, tags: idea.tags.filter(t => t !== tag) });
  };

  const handleConnectionClick = (connectedId: string) => {
    window.open(`/ideate/${connectedId}`, '_blank');
  };


  const handleSaveAsNewIdea = async (title: string, content: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ideas')
        .insert({
          user_id: user.id,
          title,
          content,
          initial_input: `Divergent path from: ${idea?.title}`,
          category: idea?.category || 'general',
          tags: idea?.tags || [],
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        window.open(`/ideate/${data.id}`, '_blank');
      }
    } catch (error) {
      console.error('Error creating new idea:', error);
    }
  };

  const handleCreateTask = async (title: string, description: string, priority: 'high' | 'medium' | 'low') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title,
          notes: description,
          priority,
          status: 'not_started',
          objective_id: null, // Orphan task
          is_recurring: false,
        });

      if (error) throw error;

      alert(t('ideaDetail.taskCreatedSuccess').replace('{{title}}', title));
    } catch (error) {
      console.error('Error creating task:', error);
      alert(t('ideaDetail.taskCreateFailed'));
    }
  };

  // Handle text selection menu actions
  const handleConvertSelectedToIdea = () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    setSelectionMenu(null);
    if (textareaRef.current) {
      textareaRef.current.blur();
      window.getSelection()?.removeAllRanges();
    }
    // Navigate to Ideate page with selected text as input
    navigate('/ideate', { state: { initialInput: text } });
  };

  const handleConvertSelectedToTask = () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    const title = text.length > 50 ? text.substring(0, 47) + '...' : text;
    handleCreateTask(title, text, 'medium');
    setSelectionMenu(null);
    if (textareaRef.current) {
      textareaRef.current.blur();
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleConvertSelectedToMindMap = () => {
    if (!selectionMenu) return;
    navigate('/mindmap', { state: { problemStatement: selectionMenu.text } });
    setSelectionMenu(null);
    if (textareaRef.current) {
      textareaRef.current.blur();
      window.getSelection()?.removeAllRanges();
    }
  };

  // Close selection menu on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectionMenu && editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setSelectionMenu(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionMenu) {
        setSelectionMenu(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectionMenu]);

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">{t('ideaDetail.loading')}</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <p className="text-text-secondary mb-4">{t('ideaDetail.ideaNotFound')}</p>
          <button
            onClick={() => navigate('/ideate')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('ideaDetail.backToIdeas')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg-secondary">
      <div className="bg-bg-primary border-b border-border-primary px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => window.close()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">{t('ideaDetail.editIdea')}</h1>
              <p className="text-xs text-text-tertiary hidden sm:block">
                {t('ideaDetail.lastUpdated')}: {new Date(idea.updated_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="relative group hidden sm:block">
              <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-secondary transition-colors text-sm">
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">{t('ideaDetail.export')}</span>
              </button>
              <div className="absolute right-0 mt-2 w-48 glass-strong border-border-primary opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('txt')}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-secondary text-left text-sm"
                >
                  <FileText className="w-4 h-4" />
                  {t('ideaDetail.plainText')}
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-secondary text-left text-sm"
                >
                  <FileCode className="w-4 h-4" />
                  {t('ideaDetail.markdown')}
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-secondary text-left text-sm"
                >
                  <File className="w-4 h-4" />
                  {t('ideaDetail.json')}
                </button>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">{t('ideaDetail.save')}</span>
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">{t('ideaDetail.delete')}</span>
            </button>

            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                showAIPanel
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </button>
          </div>
        </div>
      </div>

      {showAIPanel && (
        <AIAssistantPanel
          ideaTitle={idea.title}
          ideaContent={idea.content}
          onClose={() => setShowAIPanel(false)}
          onSaveAsNewIdea={handleSaveAsNewIdea}
          onCreateTask={handleCreateTask}
          cache={aiCache}
          onCacheUpdate={setAiCache}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-3 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              <div className="glass-card border-border-primary p-4 lg:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">{t('ideaDetail.title')}</label>
                    <input
                      type="text"
                      value={idea.title}
                      onChange={(e) => setIdea({ ...idea, title: e.target.value })}
                      className="w-full px-3 lg:px-4 py-2 border border-border-primary bg-bg-primary rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base lg:text-lg font-semibold"
                    />
                  </div>

                  <div ref={editorRef} className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className="block text-sm font-medium text-text-secondary">{t('ideaDetail.content')}</label>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {[
                          { mode: 'enhance' as const, label: t('ideaDetail.enhance'), icon: <Wand2 className="w-3.5 h-3.5" /> },
                          { mode: 'complete' as const, label: t('ideaDetail.complete'), icon: <CornerDownRight className="w-3.5 h-3.5" /> },
                          { mode: 'shorten' as const, label: t('ideaDetail.shorten'), icon: <Scissors className="w-3.5 h-3.5" /> },
                          { mode: 'summarize' as const, label: t('ideaDetail.summarize'), icon: <FileText className="w-3.5 h-3.5" /> },
                          { mode: 'cocreate' as const, label: t('ideaDetail.cocreate'), icon: <Users className="w-3.5 h-3.5" /> },
                        ].map((action) => (
                          <button
                            key={action.mode}
                            onClick={() => handleTransform(action.mode)}
                            disabled={!!aiTransforming}
                            title={action.label}
                            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                              aiTransforming === action.mode
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-bg-secondary text-text-primary border-border-primary hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {aiTransforming === action.mode ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              action.icon
                            )}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={idea.content}
                      onChange={(e) => setIdea({ ...idea, content: e.target.value })}
                      onSelect={captureSelection}
                      onKeyUp={captureSelection}
                      onMouseUp={captureSelection}
                      className="w-full h-96 px-4 py-3 border border-border-primary bg-bg-primary rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none font-mono text-sm"
                    />
                    
                    {/* Selection Menu */}
                    {selectionMenu && (
                      <div
                        className="absolute z-50 bg-bg-primary border border-border-primary rounded-lg shadow-xl p-2 flex gap-2 animate-in fade-in slide-in-from-bottom-2"
                        style={{
                          left: `${selectionMenu.x}%`,
                          top: `${Math.max(8, selectionMenu.y - 40)}px`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        <button
                          onClick={handleConvertSelectedToIdea}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
                          title={t('ideaDetail.convertToIdea')}
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          {t('ideate.newIdea')}
                        </button>
                        <button
                          onClick={handleConvertSelectedToTask}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-green-50 dark:hover:bg-green-950/30 rounded transition-colors"
                          title={t('ideaDetail.convertToTask')}
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          {t('objectives.task')}
                        </button>
                        <button
                          onClick={handleConvertSelectedToMindMap}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded transition-colors"
                          title={t('ideaDetail.convertToMindMap')}
                        >
                          <Network className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          {t('map.mindMap')}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">{t('ideaDetail.category')}</label>
                      <input
                        type="text"
                        value={idea.category}
                        onChange={(e) => setIdea({ ...idea, category: e.target.value })}
                        className="w-full px-4 py-2 border border-border-primary bg-bg-primary rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">{t('ideaDetail.status')}</label>
                      <select
                        value={idea.status}
                        onChange={(e) => setIdea({ ...idea, status: e.target.value as Idea['status'] })}
                        className="w-full px-4 py-2 border border-border-primary bg-bg-primary rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      >
                        <option value="draft">{t('ideaDetail.draft')}</option>
                        <option value="active">{t('ideaDetail.active')}</option>
                        <option value="completed">{t('ideaDetail.completed')}</option>
                        <option value="archived">{t('ideaDetail.archived')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">{t('ideaDetail.tags')}</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {idea.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-yellow-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder={t('ideaDetail.addTagPlaceholder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          addTag(e.currentTarget.value.trim());
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full px-4 py-2 border border-border-primary bg-bg-primary rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {idea.initial_input && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-900">{t('ideaDetail.originalInput')}</h3>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{idea.initial_input}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass-card border-border-primary p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-text-secondary" />
                  <h3 className="font-semibold text-text-primary">{t('ideaDetail.timeline')}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-text-secondary">{t('ideaDetail.created')}</span>
                    <p className="text-text-primary">{new Date(idea.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">{t('ideaDetail.updated')}</span>
                    <p className="text-text-primary">{new Date(idea.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card border-border-primary p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-text-secondary" />
                    <h3 className="font-semibold text-text-primary">{t('ideaDetail.connections')}</h3>
                  </div>
                  {loadingConnections && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                </div>

                {connections.length === 0 ? (
                  <p className="text-sm text-text-tertiary">{t('ideaDetail.noConnections')}</p>
                ) : (
                  <div className="space-y-3">
                    {connections.map((conn) => (
                      <button
                        key={conn.ideaId}
                        onClick={() => handleConnectionClick(conn.ideaId)}
                        className="w-full text-left p-3 bg-bg-secondary rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-text-primary text-sm">{conn.ideaTitle}</h4>
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded font-medium capitalize">
                            {conn.connectionType}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary">{conn.reason}</p>
                        <div className="mt-2 h-1 bg-border-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{ width: `${conn.strength}%` }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
