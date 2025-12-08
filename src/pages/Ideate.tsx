import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { completeIdea, findIdeaConnections } from '../services/aiService';
import {
  Lightbulb,
  Plus,
  Sparkles,
  Save,
  Loader2,
  Trash2,
  Search,
  Filter,
  ExternalLink,
  Tag,
  Clock,
  FolderOpen,
  ChevronDown,
  ChevronUp,
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

interface IdeaSuggestion {
  type: string;
  content: string;
}

export default function Ideate() {
  const { user } = useAuth();
  const location = useLocation();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialInput, setInitialInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<IdeaSuggestion[]>([]);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedCategory, setGeneratedCategory] = useState('');
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [tagsExpanded, setTagsExpanded] = useState<boolean>(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      loadIdeas();
    }
  }, [user]);

  useEffect(() => {
    // Pre-fill initial input from navigation state
    if (location.state?.initialInput) {
      setInitialInput(location.state.initialInput);
    }
  }, [location.state]);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (error) {
      console.error('Error loading ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIdea = async () => {
    if (!initialInput.trim() || generating) return;

    setGenerating(true);
    setSuggestions([]);
    setGeneratedTitle('');
    setGeneratedContent('');
    setGeneratedCategory('');
    setGeneratedTags([]);

    try {
      const result = await completeIdea(initialInput);

      setGeneratedTitle(result.title);
      setGeneratedContent(result.expandedContent);
      setGeneratedCategory(result.category);
      setGeneratedTags(result.tags);
      setSuggestions(result.suggestions.map(s => ({ type: 'suggestion', content: s })));
      // Auto-collapse library when AI result is first displayed
      setLibraryCollapsed(true);

      if (ideas.length > 0) {
        const connections = await findIdeaConnections(
          `${result.title}\n${result.expandedContent}`,
          ideas.map(idea => ({ id: idea.id, title: idea.title, content: idea.content, tags: idea.tags || [] })),
          {
            title: result.title,
            tags: result.tags || []
          }
        );

        if (connections.length > 0) {
          connections.forEach(conn => {
            setSuggestions(prev => [
              ...prev,
              {
                type: 'connection',
                content: `Connected to "${conn.ideaTitle}" (${conn.connectionType}): ${conn.reason}`,
              },
            ]);
          });
        }
      }
    } catch (error) {
      console.error('Error generating idea:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveIdea = async () => {
    if (!generatedTitle || !user) return;

    try {
      const { data, error } = await supabase
        .from('ideas')
        .insert({
          user_id: user.id,
          title: generatedTitle,
          content: generatedContent,
          initial_input: initialInput,
          category: generatedCategory,
          tags: generatedTags,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      setIdeas(prev => [data, ...prev]);
      setInitialInput('');
      setGeneratedTitle('');
      setGeneratedContent('');
      setGeneratedCategory('');
      setGeneratedTags([]);
      setSuggestions([]);
      // Expand library after saving
      setLibraryCollapsed(false);
    } catch (error) {
      console.error('Error saving idea:', error);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) return;

    try {
      const { error } = await supabase.from('ideas').delete().eq('id', id);
      if (error) throw error;
      setIdeas(prev => prev.filter(idea => idea.id !== id));
      if (selectedIdea?.id === id) setSelectedIdea(null);
    } catch (error) {
      console.error('Error deleting idea:', error);
    }
  };

  const handleOpenIdea = (idea: Idea) => {
    window.open(`/ideate/${idea.id}`, '_blank');
  };

  // Extract unique categories, handling null/undefined/empty values
  const uniqueCategories = Array.from(new Set(
    ideas
      .map(idea => {
        const cat = idea.category?.trim();
        return cat && cat !== '' ? cat : 'uncategorized';
      })
      .filter(cat => cat !== '')
  )).sort();

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         idea.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Handle category filtering - account for null, undefined, or empty categories
    const ideaCategory = (idea.category?.trim() || 'uncategorized');
    const matchesCategory = filterCategory === 'all' || ideaCategory === filterCategory;
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => idea.tags && idea.tags.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
  });
  const allTags = Array.from(new Set(ideas.flatMap(idea => idea.tags || []))).sort();

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 lg:gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 lg:gap-4 shrink-0">
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
          <Lightbulb className="w-5 h-5 lg:w-7 lg:h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-heading font-bold text-text-primary">Ideation Lab</h1>
          <p className="text-sm lg:text-base text-text-tertiary hidden sm:block">Explore, expand, and connect your thoughts with AI</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 overflow-hidden">
        {/* Main Area */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-6 overflow-hidden min-h-0">
          {/* Generator Area - Scrollable */}
          <div className={`flex-shrink-0 overflow-y-auto custom-scrollbar pr-2 transition-all duration-300 ${
            libraryCollapsed ? 'flex-1' : 'max-h-[60%] lg:max-h-[50%]'
          }`}>
            <div className="space-y-4 lg:space-y-6 pb-4">
              <div className="glass-card p-4 lg:p-6 border border-white/40 dark:border-white/10">
                <div className="flex items-center gap-2 mb-3 lg:mb-4 text-text-secondary">
                  <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                  <h2 className="font-semibold text-sm lg:text-base">New Idea Spark</h2>
                </div>

                <textarea
                  value={initialInput}
                  onChange={(e) => setInitialInput(e.target.value)}
                  placeholder="Enter a concept, problem, or rough thought... AI will help structure and expand it."
                  className="w-full h-24 lg:h-32 px-3 lg:px-4 py-2.5 lg:py-3 bg-white/50 dark:bg-white/5 border border-border-secondary rounded-xl focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all resize-none outline-none text-sm lg:text-base text-text-primary placeholder:text-text-tertiary"
                />

                <div className="flex items-center justify-between mt-3 lg:mt-4">
                  <span className="text-xs text-text-tertiary font-medium">{initialInput.length} chars</span>
                  <button
                    onClick={handleGenerateIdea}
                    disabled={!initialInput.trim() || generating}
                    className="btn-primary bg-gradient-to-r from-yellow-500 to-orange-500 border-none shadow-orange-200 text-sm lg:text-base py-2 px-3 lg:py-2.5 lg:px-4"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span className="hidden sm:inline">Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {(generatedTitle || suggestions.length > 0) && (
                <div className="glass-strong p-4 lg:p-6 animate-slide-up border border-white/60 dark:border-white/10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 lg:mb-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-500" />
                      <h2 className="font-bold text-base lg:text-lg text-text-primary">AI Generated Concept</h2>
                    </div>
                    {generatedTitle && (
                      <button
                        onClick={handleSaveIdea}
                        className="btn-primary bg-green-600 hover:bg-green-700 shadow-green-200 text-sm w-full sm:w-auto"
                      >
                        <Save className="w-4 h-4" />
                        Save to Library
                      </button>
                    )}
                  </div>

                  {generatedTitle && (
                    <div className="space-y-4 lg:space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 ml-1">Title</label>
                        <input
                          type="text"
                          value={generatedTitle}
                          onChange={(e) => setGeneratedTitle(e.target.value)}
                          className="input-modern bg-white/80 dark:bg-white/5 font-heading text-base lg:text-lg font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 ml-1">Expanded Content</label>
                        <textarea
                          value={generatedContent}
                          onChange={(e) => setGeneratedContent(e.target.value)}
                          className="w-full h-36 lg:h-48 px-3 lg:px-4 py-2.5 lg:py-3 bg-white/80 dark:bg-white/5 border border-border-primary rounded-xl focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none outline-none leading-relaxed text-sm lg:text-base"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 ml-1">Category</label>
                          <input
                            type="text"
                            value={generatedCategory}
                            onChange={(e) => setGeneratedCategory(e.target.value)}
                            className="input-modern bg-white/80 dark:bg-white/5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 ml-1">Tags</label>
                          <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-white/50 dark:bg-white/5 rounded-xl border border-border-primary">
                            {generatedTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-yellow-100/80 text-yellow-800 rounded-lg text-xs font-medium border border-yellow-200"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border-secondary">
                      <h3 className="text-sm font-bold text-text-secondary mb-4">AI Suggestions</h3>
                      <div className="grid gap-3">
                        {suggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-4 bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 dark:bg-white/5 transition-colors"
                          >
                            <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-text-secondary leading-relaxed">{suggestion.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Idea Cards Mosaic */}
          {!libraryCollapsed && (
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-accent-primary" />
                  Idea Library
                </h2>
                <div className="flex items-center gap-2">
                  {filteredIdeas.length > 0 && (
                    <span className="text-sm text-text-tertiary">
                      {filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'}
                    </span>
                  )}
                  <button
                    onClick={() => setLibraryCollapsed(true)}
                    className="p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors"
                    title="Collapse library"
                  >
                    <ChevronDown className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
              </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent-subtle" />
              </div>
            ) : filteredIdeas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
                <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-base font-medium">No ideas found</p>
                <p className="text-sm mt-1">Try adjusting your filters or create a new idea</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                {filteredIdeas.map(idea => (
                  <div
                    key={idea.id}
                    onClick={() => handleOpenIdea(idea)}
                    className="glass-card p-4 border border-white/40 dark:border-white/10 hover:border-accent-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group relative h-fit"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-text-primary text-sm flex-1 line-clamp-2 pr-6">
                        {idea.title}
                      </h3>
                      <ExternalLink className="w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4" />
                    </div>

                    <p className="text-xs text-text-secondary line-clamp-3 mb-3 leading-relaxed opacity-80">{idea.content}</p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const cat = idea.category || 'uncategorized';
                            setFilterCategory(cat === filterCategory ? 'all' : cat);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide border transition-all ${
                            filterCategory === (idea.category || 'uncategorized')
                              ? 'bg-accent-primary text-white border-accent-primary'
                              : 'bg-bg-tertiary text-text-secondary border-border-secondary hover:bg-accent-subtle hover:border-accent-primary'
                          }`}
                        >
                          {idea.category || 'Uncategorized'}
                        </button>
                        
                        <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                          <Clock className="w-3 h-3" />
                          {new Date(idea.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      
                      {idea.tags && idea.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {idea.tags.slice(0, 3).map((tag, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTag(tag);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all ${
                                selectedTags.includes(tag)
                                  ? 'bg-yellow-500 text-white border-yellow-600'
                                  : 'bg-yellow-100/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-900/40'
                              }`}
                            >
                              #{tag}
                            </button>
                          ))}
                          {idea.tags.length > 3 && (
                            <span className="px-1.5 py-0.5 text-[10px] text-text-tertiary">
                              +{idea.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIdea(idea.id);
                      }}
                      className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}
          
          {/* Collapsed Library Toggle */}
          {libraryCollapsed && (
            <div className="flex-shrink-0 border-t border-border-primary pt-4">
              <button
                onClick={() => setLibraryCollapsed(false)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-bg-tertiary hover:bg-bg-secondary rounded-lg transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-accent-primary" />
                <span className="text-sm font-medium text-text-primary">Show Idea Library</span>
                <ChevronUp className="w-4 h-4 text-text-secondary" />
                {filteredIdeas.length > 0 && (
                  <span className="ml-auto text-xs text-text-tertiary">
                    {filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Filters */}
        <div className="w-80 flex flex-col gap-4 flex-shrink-0">
          <div className="glass-card p-4 border border-white/40 dark:border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-accent-primary" />
              <h2 className="font-bold text-text-primary">Filters</h2>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search ideas..."
                  className="input-modern pl-10 py-2 text-sm bg-white/50 dark:bg-white/5"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none z-10" />
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                  }}
                  className="w-full pl-10 pr-8 py-2 text-sm rounded-xl border transition-all duration-200 outline-none shadow-sm appearance-none cursor-pointer
                    bg-gray-900 dark:bg-gray-900 text-gray-100 dark:text-gray-100 border-gray-700 dark:border-gray-700
                    hover:bg-gray-800 dark:hover:bg-gray-800 hover:border-gray-600 dark:hover:border-gray-600 hover:text-white dark:hover:text-white
                    focus:ring-2 focus:ring-indigo-600/20 focus:border-accent-primary"
                  style={{
                    colorScheme: 'dark'
                  }}
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'uncategorized' ? 'Uncategorized' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {allTags.length > 0 && (
                <div>
                  <button
                    onClick={() => setTagsExpanded(!tagsExpanded)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-text-secondary mb-2 hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Filter by Tags
                      {selectedTags.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-accent-primary text-white rounded-full text-[10px]">
                          {selectedTags.length}
                        </span>
                      )}
                    </div>
                    {tagsExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  
                  {tagsExpanded && (
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-white/30 dark:bg-white/5 rounded-lg border border-border-secondary">
                      {allTags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              isSelected
                                ? 'bg-yellow-500 text-white border-yellow-600 shadow-sm'
                                : 'bg-white/50 dark:bg-white/5 text-text-secondary border-border-secondary hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20 hover:border-yellow-300 dark:hover:border-yellow-700'
                            }`}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {selectedTags.length > 0 && tagsExpanded && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="mt-2 text-xs text-accent-primary hover:text-accent-hover font-medium"
                    >
                      Clear tags ({selectedTags.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
