import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { analyzeJournalEntry } from '../services/aiService';
import {
  Calendar,
  Plus,
  Sparkles,
  Trash2,
  Heart,
  Frown,
  Smile,
  Meh,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

interface JournalEntry {
  id: string;
  content: string;
  entry_date: string;
  created_at: string;
  primary_emotion?: string;
}

interface AIAnalysis {
  id: string;
  emotions: { name: string; intensity: number; color: string }[];
  patterns: string[];
  coping_strategies: string[];
}

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [content, setContent] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadEntries();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEntry) {
      setContent(selectedEntry.content);
      setSelectedDate(selectedEntry.entry_date);
      loadAnalysis(selectedEntry.id);
    }
  }, [selectedEntry]);

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (content && content !== selectedEntry?.content) {
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave();
        autoSaveTimerRef.current = null;
      }, 3000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [content, selectedEntry?.content]);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user!.id)
      .order('entry_date', { ascending: false })
      .limit(30);

    if (!error && data) {
      setEntries(data);
      if (data.length > 0 && !selectedEntry) {
        setSelectedEntry(data[0]);
      }
    }
  };

  const loadAnalysis = async (entryId: string) => {
    const { data } = await supabase
      .from('ai_analysis')
      .select('*')
      .eq('entry_id', entryId)
      .maybeSingle();

    if (data) {
      setAnalysis(data as AIAnalysis);
    } else {
      setAnalysis(null);
    }
  };

  const handleSave = async () => {
    if (!content.trim() || !user) return;

    setSaving(true);
    try {
      if (selectedEntry) {
        const contentChanged = content !== selectedEntry.content;
        const { error } = await supabase
          .from('journal_entries')
          .update({ content, entry_date: selectedDate })
          .eq('id', selectedEntry.id);

        if (!error) {
          setSelectedEntry({ ...selectedEntry, content, entry_date: selectedDate });
          if (contentChanged && analysis) {
            setAnalysis(null);
          }
        }
      } else {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            user_id: user.id,
            content,
            entry_date: selectedDate,
          })
          .select()
          .single();

        if (!error && data) {
          setSelectedEntry(data);
          setAnalysis(null);
          loadEntries();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!content.trim()) return;

    if (!selectedEntry) {
      await handleSave();
      return;
    }

    if (content !== selectedEntry.content) {
      await handleSave();
    }

    setAnalyzing(true);
    try {
      const result = await analyzeJournalEntry(content);

      const analysisData: AIAnalysis = {
        id: 'temp',
        emotions: result.emotions,
        patterns: result.patterns,
        coping_strategies: result.coping_strategies,
      };

      const { error } = await supabase.from('ai_analysis').upsert(
        {
          entry_id: selectedEntry.id,
          user_id: user!.id,
          emotions: analysisData.emotions,
          patterns: analysisData.patterns,
          coping_strategies: analysisData.coping_strategies,
        },
        {
          onConflict: 'entry_id',
        }
      );

      if (!error) {
        setAnalysis(analysisData);

        await supabase
          .from('journal_entries')
          .update({ primary_emotion: result.primary_emotion })
          .eq('id', selectedEntry.id);

        setSelectedEntry({ ...selectedEntry, primary_emotion: result.primary_emotion });
        loadEntries();
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNewEntry = () => {
    setSelectedEntry(null);
    setContent('');
    setAnalysis(null);
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleDelete = async () => {
    if (!selectedEntry || !confirm('Delete this entry?')) return;

    await supabase.from('journal_entries').delete().eq('id', selectedEntry.id);

    setSelectedEntry(null);
    setContent('');
    setAnalysis(null);
    loadEntries();
  };

  const getEmotionIcon = (name: string) => {
    if (name.toLowerCase().includes('happy') || name.toLowerCase().includes('hopeful'))
      return <Smile className="w-4 h-4 text-green-500" />;
    if (name.toLowerCase().includes('sad') || name.toLowerCase().includes('anxious'))
      return <Frown className="w-4 h-4 text-amber-500" />;
    return <Meh className="w-4 h-4 text-blue-500" />;
  };

  const [showSidebar, setShowSidebar] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 lg:gap-6 relative pb-20 lg:pb-0">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-2 glass-card border border-white/40">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5 text-text-primary" />
        </button>
        <span className="text-sm font-medium text-text-secondary">
          {selectedEntry
            ? new Date(selectedEntry.entry_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : 'New Entry'}
        </span>
        <button
          onClick={handleNewEntry}
          className="p-2 rounded-lg bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {showSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar - Entry List */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 lg:w-72 xl:w-80 flex flex-col gap-4
        bg-bg-primary lg:bg-transparent
        transform transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:flex p-4 lg:p-0
      `}>
        {/* Close button on mobile */}
        <button
          onClick={() => setShowSidebar(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-text-primary" />
        </button>

        <button
          onClick={() => {
            handleNewEntry();
            setShowSidebar(false);
          }}
          className="btn-primary w-full shadow-lg shadow-accent-primary/20 hidden lg:flex"
        >
          <Plus className="w-5 h-5" />
          New Entry
        </button>

        <div className="glass-card flex-1 overflow-hidden flex flex-col border border-white/40 dark:border-white/10 mt-8 lg:mt-0">
          <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm">
            <h3 className="font-semibold text-text-secondary text-sm uppercase tracking-wider">Recent Entries</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  setSelectedEntry(entry);
                  setShowSidebar(false);
                }}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${
                  selectedEntry?.id === entry.id
                    ? 'bg-accent-primary text-white shadow-md'
                    : 'hover:bg-white/50 dark:bg-white/5 dark:hover:bg-white/10 text-text-primary'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-3.5 h-3.5 ${selectedEntry?.id === entry.id ? 'text-white/80' : 'text-text-tertiary'}`} />
                    <span className={`text-xs font-medium ${selectedEntry?.id === entry.id ? 'text-white/90' : 'text-text-secondary'}`}>
                      {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {entry.primary_emotion && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      selectedEntry?.id === entry.id
                        ? 'bg-white/20 text-white'
                        : 'bg-accent-subtle text-accent-primary'
                    }`}>
                      {entry.primary_emotion}
                    </span>
                  )}
                </div>
                <p className={`text-sm line-clamp-2 ${selectedEntry?.id === entry.id ? 'text-white/80' : 'text-text-secondary group-hover:text-text-primary'}`}>
                  {entry.content}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 lg:gap-6 min-w-0">
        <div className="glass-card flex-1 flex flex-col overflow-hidden relative border border-white/40 dark:border-white/10">
          {/* Editor Header */}
          <div className="p-3 lg:p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 lg:gap-4 w-full sm:w-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-text-primary font-heading font-bold text-base lg:text-lg focus:ring-0 p-0 cursor-pointer flex-1 sm:flex-none"
              />
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/50 dark:bg-white/5 text-text-tertiary border border-white/20 whitespace-nowrap">
                {saving ? 'Saving...' : 'Auto-saved'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {content.trim() && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="btn-secondary py-1.5 px-3 text-sm border-accent-primary/20 text-accent-primary hover:bg-accent-subtle"
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{analyzing ? 'Analyzing...' : 'Analyze'}</span>
                </button>
              )}
              {analysis && (
                <button
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="lg:hidden p-2 text-text-tertiary hover:text-accent-primary hover:bg-accent-subtle rounded-lg transition-colors"
                  title={showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
                >
                  {showAnalysis ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              )}
              {selectedEntry && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-text-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            <div className={`flex-1 flex flex-col transition-all duration-500 min-w-0 ${analysis && showAnalysis ? 'lg:w-2/3' : 'w-full'} ${analysis && showAnalysis ? 'min-h-0 flex-[2]' : 'flex-1'}`}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write about your day, your thoughts, your feelings..."
                className="flex-1 w-full p-4 sm:p-6 lg:p-8 bg-transparent border-none resize-none focus:ring-0 text-base lg:text-lg leading-relaxed text-text-primary placeholder:text-text-tertiary custom-scrollbar min-h-[300px] lg:min-h-[200px]"
              />
            </div>

            {/* Analysis Panel */}
            {analysis && showAnalysis && (
              <div className={`
                lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border-secondary/50 
                bg-white/40 dark:bg-black/40 backdrop-blur-md overflow-y-auto custom-scrollbar animate-slide-up
                flex-shrink-0 lg:flex-shrink
                h-auto lg:h-auto
                max-h-[35vh] lg:max-h-none
                flex-[1] lg:flex-none
              `}>
                <div className="p-3 lg:p-6 space-y-3 lg:space-y-6">
                  <div className="glass-card p-3 lg:p-5 bg-white/60 dark:bg-black/60 border border-white/40 dark:border-white/10">
                    <h3 className="text-xs lg:text-sm font-bold text-text-primary mb-2 lg:mb-4 flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-pink-500" />
                      <span className="hidden sm:inline">Emotional Insights</span>
                      <span className="sm:hidden">Emotions</span>
                    </h3>
                    <div className="space-y-2 lg:space-y-4">
                      {analysis.emotions.map((emotion, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              {getEmotionIcon(emotion.name)}
                              <span className="text-xs lg:text-sm font-medium text-text-secondary capitalize truncate">{emotion.name}</span>
                            </div>
                            <span className="text-xs font-bold text-text-primary flex-shrink-0 ml-2">{emotion.intensity}%</span>
                          </div>
                          <div className="h-1 lg:h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${emotion.color.replace('bg-', 'bg-opacity-80 bg-')}`}
                              style={{ width: `${emotion.intensity}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-3 lg:p-5 bg-white/60 dark:bg-black/60 border border-white/40 dark:border-white/10">
                    <h3 className="text-xs lg:text-sm font-bold text-text-primary mb-2 lg:mb-3">Patterns</h3>
                    <ul className="space-y-1.5 lg:space-y-3">
                      {analysis.patterns.slice(0, 3).map((pattern, idx) => (
                        <li key={idx} className="flex items-start gap-2 lg:gap-3 text-xs lg:text-sm text-text-secondary">
                          <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-accent-primary mt-1.5 flex-shrink-0" />
                          <span className="leading-relaxed line-clamp-2">{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="glass-card p-3 lg:p-5 bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800">
                    <h3 className="text-xs lg:text-sm font-bold text-green-900 dark:text-green-300 mb-2 lg:mb-3">Strategies</h3>
                    <ul className="space-y-1.5 lg:space-y-3">
                      {analysis.coping_strategies.slice(0, 2).map((strategy, idx) => (
                        <li key={idx} className="flex gap-2 lg:gap-3 text-xs lg:text-sm text-green-800 dark:text-green-300">
                          <span className="flex-shrink-0 w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed line-clamp-2">{strategy}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
