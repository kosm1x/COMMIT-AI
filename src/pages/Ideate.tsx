import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useNotification } from "../contexts/NotificationContext";
import { supabase } from "../lib/supabase";
import { completeIdea, findIdeaConnections } from "../services/aiService";
import { Header, Card, Button, BottomSheet } from "../components/ui";
import {
  Lightbulb,
  Sparkles,
  Save,
  Loader2,
  Trash2,
  Search,
  Filter,
  ExternalLink,
  Clock,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { logger } from "../utils/logger";

interface Idea {
  id: string;
  user_id: string;
  title: string;
  content: string;
  initial_input: string;
  category: string;
  tags: string[];
  status: "draft" | "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

interface IdeaSuggestion {
  type: string;
  content: string;
}

export default function Ideate() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { notify } = useNotification();
  const location = useLocation();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialInput, setInitialInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<IdeaSuggestion[]>([]);
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedCategory, setGeneratedCategory] = useState("");
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 30;

  useEffect(() => {
    if (user) loadIdeas();
  }, [user]);
  useEffect(() => {
    if (location.state?.initialInput)
      setInitialInput(location.state.initialInput);
  }, [location.state]);

  const loadIdeas = async (offset = 0) => {
    if (offset === 0) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ideas")
        .select(
          "id, user_id, title, content, initial_input, category, tags, status, created_at, updated_at",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;

      const newIdeas = (data || []) as Idea[];
      setHasMore(newIdeas.length === PAGE_SIZE);

      if (offset === 0) {
        setIdeas(newIdeas);
      } else {
        setIdeas((prev) => [...prev, ...newIdeas]);
      }
    } catch (error) {
      logger.error("Error loading ideas:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreIdeas = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    loadIdeas(ideas.length);
  };

  const handleGenerateIdea = async () => {
    if (!initialInput.trim() || generating) return;
    setGenerating(true);
    setSuggestions([]);
    setGeneratedTitle("");
    setGeneratedContent("");
    setGeneratedCategory("");
    setGeneratedTags([]);

    try {
      const result = await completeIdea(initialInput, language);

      if (result.status !== "ok") {
        notify({ type: "error", message: t("ai.unavailable") });
        return;
      }

      const data = result.data;
      setGeneratedTitle(data.title);
      setGeneratedContent(data.expandedContent);
      setGeneratedCategory(data.category);
      setGeneratedTags(data.tags);
      setSuggestions(
        data.suggestions.map((s) => ({ type: "suggestion", content: s })),
      );
      setLibraryCollapsed(true);

      if (ideas.length > 0) {
        const connections = await findIdeaConnections(
          `${data.title}\n${data.expandedContent}`,
          ideas.map((idea) => ({
            id: idea.id,
            title: idea.title,
            content: idea.content,
            tags: idea.tags || [],
          })),
          { title: data.title, tags: data.tags || [] },
          language,
        );
        if (connections.length > 0) {
          connections.forEach((conn) => {
            setSuggestions((prev) => [
              ...prev,
              {
                type: "connection",
                content: `Connected to "${conn.ideaTitle}" (${conn.connectionType}): ${conn.reason}`,
              },
            ]);
          });
        }
      }
    } catch (error) {
      logger.error("Error generating idea:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveIdea = async () => {
    if (!generatedTitle || !user) return;
    try {
      const { data, error } = await supabase
        .from("ideas")
        .insert({
          user_id: user.id,
          title: generatedTitle,
          content: generatedContent,
          initial_input: initialInput,
          category: generatedCategory,
          tags: generatedTags,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      setIdeas((prev) => [data as Idea, ...prev]);
      setInitialInput("");
      setGeneratedTitle("");
      setGeneratedContent("");
      setGeneratedCategory("");
      setGeneratedTags([]);
      setSuggestions([]);
      setLibraryCollapsed(false);
    } catch (error) {
      logger.error("Error saving idea:", error);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm(t("ideate.deleteIdeaConfirm"))) return;
    try {
      await supabase.from("ideas").delete().eq("id", id);
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
    } catch (error) {
      logger.error("Error deleting idea:", error);
    }
  };

  const handleOpenIdea = (idea: Idea) =>
    window.open(`/ideate/${idea.id}`, "_blank");

  const uniqueCategories = Array.from(
    new Set(
      ideas
        .map((idea) => idea.category?.trim() || "uncategorized")
        .filter((cat) => cat !== ""),
    ),
  ).sort();
  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch =
      idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.content.toLowerCase().includes(searchTerm.toLowerCase());
    const ideaCategory = idea.category?.trim() || "uncategorized";
    const matchesCategory =
      filterCategory === "all" || ideaCategory === filterCategory;
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => idea.tags?.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
  });
  const allTags = Array.from(
    new Set(ideas.flatMap((idea) => idea.tags || [])),
  ).sort();
  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header
        title={t("ideate.ideationLab")}
        rightAction={
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
            aria-label="Filter ideas"
          >
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        }
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 pb-24 max-w-7xl mx-auto w-full">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
          <div
            className={`flex-shrink-0 overflow-y-auto transition-all ${libraryCollapsed ? "flex-1" : "max-h-[60%]"}`}
          >
            <div className="space-y-4 pb-4">
              <Card padding="md">
                <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
                  <Lightbulb className="w-5 h-5" />
                  <h2 className="font-semibold">{t("ideate.newIdeaSpark")}</h2>
                </div>
                <textarea
                  value={initialInput}
                  onChange={(e) => setInitialInput(e.target.value)}
                  placeholder={t("ideate.placeholder")}
                  className="w-full h-28 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">
                    {initialInput.length} chars
                  </span>
                  <Button
                    onClick={handleGenerateIdea}
                    disabled={!initialInput.trim() || generating}
                    loading={generating}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {t("ideate.generate")}
                    </span>
                  </Button>
                </div>
              </Card>

              {(generatedTitle || suggestions.length > 0) && (
                <Card
                  padding="lg"
                  className="border-indigo-200 dark:border-indigo-800"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <h2 className="font-bold text-gray-900 dark:text-gray-100">
                        {t("ideate.aiGeneratedConcept")}
                      </h2>
                    </div>
                    {generatedTitle && (
                      <Button
                        variant="primary"
                        onClick={handleSaveIdea}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="w-4 h-4" />
                        {t("ideate.saveToLibrary")}
                      </Button>
                    )}
                  </div>

                  {generatedTitle && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          {t("ideate.ideaTitle")}
                        </label>
                        <input
                          type="text"
                          value={generatedTitle}
                          onChange={(e) => setGeneratedTitle(e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          {t("ideate.expandedContent")}
                        </label>
                        <textarea
                          value={generatedContent}
                          onChange={(e) => setGeneratedContent(e.target.value)}
                          className="w-full h-40 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl resize-none text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                            {t("ideate.category")}
                          </label>
                          <input
                            type="text"
                            value={generatedCategory}
                            onChange={(e) =>
                              setGeneratedCategory(e.target.value)
                            }
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                            {t("ideate.ideaTags")}
                          </label>
                          <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            {generatedTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium"
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
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3">
                        {t("ideate.aiSuggestions")}
                      </h3>
                      <div className="space-y-2">
                        {suggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                          >
                            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {suggestion.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>

          {!libraryCollapsed && (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-600" />
                  {t("ideate.ideaLibrary")}
                </h2>
                <div className="flex items-center gap-2">
                  {filteredIdeas.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {filteredIdeas.length} {t("ideate.ideas")}
                    </span>
                  )}
                  <button
                    onClick={() => setLibraryCollapsed(true)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    aria-label="Collapse idea library"
                  >
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : ideas.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {t("emptyState.ideate") ||
                      "What's been on your mind? Capture a rough idea."}
                  </p>
                </div>
              ) : filteredIdeas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-base font-medium">
                    {t("ideate.noIdeasFound")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                  {filteredIdeas.map((idea) => (
                    <Card
                      key={idea.id}
                      padding="md"
                      className="hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer group relative"
                      onClick={() => handleOpenIdea(idea)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex-1 line-clamp-2 pr-6">
                          {idea.title}
                        </h3>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 absolute top-4 right-4" />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-3">
                        {idea.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {idea.category || t("ideate.uncategorized")}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {new Date(idea.created_at).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </div>
                      </div>
                      {idea.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {idea.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                            >
                              #{tag}
                            </span>
                          ))}
                          {idea.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400">
                              +{idea.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteIdea(idea.id);
                        }}
                        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Card>
                  ))}
                  {hasMore && (
                    <div className="col-span-full flex justify-center pt-4">
                      <Button
                        variant="ghost"
                        onClick={loadMoreIdeas}
                        disabled={loadingMore}
                      >
                        {loadingMore ? "..." : t("common.loadMore")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {libraryCollapsed && (
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 pt-4">
              <button
                onClick={() => setLibraryCollapsed(false)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("ideate.showIdeaLibrary")}
                </span>
                <ChevronUp className="w-4 h-4 text-gray-500" />
                {filteredIdeas.length > 0 && (
                  <span className="ml-auto text-xs text-gray-500">
                    {filteredIdeas.length} {t("ideate.ideas")}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="hidden lg:block w-72 flex-shrink-0">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                {t("ideate.filters")}
              </h2>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("ideate.searchIdeas")}
                  aria-label={t("common.search")}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="all">{t("ideate.allCategories")}</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "uncategorized" ? t("ideate.uncategorized") : cat}
                  </option>
                ))}
              </select>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <BottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title={t("ideate.filters")}
        height="auto"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("ideate.searchIdeas")}
              aria-label={t("common.search")}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100"
          >
            <option value="all">{t("ideate.allCategories")}</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
