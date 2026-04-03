import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { supabase } from "../lib/supabase";
import { findIdeaConnections } from "../services/aiService";
import {
  loadConnections as loadSavedConnections,
  saveConnections as persistConnections,
} from "../services/ideaConnectionService";
import { useIdeaEditor } from "../hooks/useIdeaEditor";
import { SelectionMenu, ConnectionsSidebar } from "../components/ideas";
import type { Idea, Connection } from "../components/ideas/types";
import Editor from "react-simple-code-editor";

// Lazy-load AIAssistantPanel to reduce initial bundle size
const AIAssistantPanel = lazy(() => import("../components/AIAssistantPanel"));
import {
  Save,
  Trash2,
  Download,
  ArrowLeft,
  Loader2,
  Clock,
  FileText,
  FileCode,
  File,
  Sparkles,
  Wand2,
  CornerDownRight,
  Scissors,
  Users,
} from "lucide-react";
import { logger } from "../utils/logger";

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
  const editorRef = useRef<HTMLDivElement>(null);
  const [aiCache, setAiCache] = useState<{
    divergentPaths?: Array<{
      title: string;
      description: string;
      approach: string;
      potentialOutcome: string;
    }>;
    nextSteps?: Array<{
      step: string;
      description: string;
      timeEstimate: string;
      priority: "high" | "medium" | "low";
    }>;
    criticalAnalysis?: {
      strengths: string[];
      challenges: string[];
      assumptions: string[];
      alternativePerspectives: string[];
    } | null;
    relatedConcepts?: Array<{
      concept: string;
      description: string;
      relevance: string;
      resources: string[];
    }>;
  }>({});

  const loadedIdeaIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const editor = useIdeaEditor(
    idea,
    (updated) => setIdea(updated),
    editorRef,
    language,
    t,
  );

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/";
      return;
    }

    if (user && id) {
      if (loadedIdeaIdRef.current === id) {
        return;
      }

      loadedIdeaIdRef.current = id;
      isInitialLoadRef.current = true;
      loadIdea();
    }
  }, [user, id, authLoading]);

  // Clear AI cache when idea ID changes
  useEffect(() => {
    setAiCache({});
  }, [id]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        idea &&
        loadedIdeaIdRef.current === id
      ) {
        return;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [idea, id]);

  const loadIdea = async () => {
    const currentId = id;
    if (!currentId || loadedIdeaIdRef.current !== currentId) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .eq("id", currentId)
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;

      if (data && data.id === currentId) {
        const ideaData = data as Idea;
        setIdea(ideaData);
        isInitialLoadRef.current = false;

        const scheduleIdle =
          window.requestIdleCallback ||
          ((cb: () => void) => setTimeout(cb, 100));
        scheduleIdle(() => {
          loadConnections(ideaData);
        });
      }
    } catch (error) {
      logger.error("Error loading idea:", error);
      if (isInitialLoadRef.current) {
        navigate("/ideate");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async (currentIdea: Idea) => {
    setLoadingConnections(true);
    try {
      // Load saved connections from DB first
      const saved = await loadSavedConnections(currentIdea.id);
      if (saved.length > 0) {
        setConnections(saved);
      }

      // Then discover new connections via AI
      const { data: allIdeas, error } = await supabase
        .from("ideas")
        .select("id, title, content, tags")
        .eq("user_id", user!.id)
        .neq("id", currentIdea.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) {
        logger.error("[IdeaDetail] Error fetching ideas:", error);
        throw error;
      }

      if (allIdeas && allIdeas.length > 0) {
        const foundConnections = await findIdeaConnections(
          `${currentIdea.title}\n${currentIdea.content || ""}`,
          allIdeas.map((idea) => ({
            id: idea.id,
            title: idea.title,
            content: idea.content || "",
            tags: (idea.tags || []) as string[],
          })),
          {
            title: currentIdea.title,
            tags: currentIdea.tags || [],
          },
          language,
        );
        if (foundConnections.length > 0) {
          setConnections(foundConnections);
          // Persist AI-discovered connections to DB
          persistConnections(currentIdea.id, user!.id, foundConnections).catch(
            () => {},
          );
        }
      } else if (saved.length === 0) {
        setConnections([]);
      }
    } catch (error) {
      logger.error("[IdeaDetail] Error loading connections:", error);
      // Keep saved connections if AI fails
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleSave = async () => {
    if (!idea || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("ideas")
        .update({
          title: idea.title,
          content: idea.content,
          category: idea.category,
          tags: idea.tags,
          status: idea.status,
        })
        .eq("id", idea.id)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      logger.error("Error saving idea:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!idea || !user) return;
    if (!confirm(t("ideaDetail.deleteConfirm"))) return;

    try {
      const { error } = await supabase
        .from("ideas")
        .delete()
        .eq("id", idea.id)
        .eq("user_id", user.id);

      if (error) throw error;
      window.close();
    } catch (error) {
      logger.error("Error deleting idea:", error);
    }
  };

  const handleExport = (format: "txt" | "md" | "json") => {
    if (!idea) return;

    let content = "";
    let filename = "";
    let mimeType = "";

    switch (format) {
      case "txt":
        content = `${idea.title}\n\n${idea.content}\n\nCategory: ${idea.category}\nTags: ${idea.tags.join(", ")}\nCreated: ${new Date(idea.created_at).toLocaleDateString()}`;
        filename = `${idea.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
        mimeType = "text/plain";
        break;

      case "md":
        content = `# ${idea.title}\n\n${idea.content}\n\n---\n\n**Category:** ${idea.category}  \n**Tags:** ${idea.tags.join(", ")}  \n**Created:** ${new Date(idea.created_at).toLocaleDateString()}\n\n## Connections\n\n${connections.map((c) => `- **${c.ideaTitle}** (${c.connectionType}): ${c.reason}`).join("\n")}`;
        filename = `${idea.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
        mimeType = "text/markdown";
        break;

      case "json":
        content = JSON.stringify({ ...idea, connections }, null, 2);
        filename = `${idea.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;
        mimeType = "application/json";
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addTag = (tag: string) => {
    if (!idea || idea.tags.includes(tag)) return;
    setIdea({ ...idea, tags: [...idea.tags, tag] });
  };

  const removeTag = (tag: string) => {
    if (!idea) return;
    setIdea({ ...idea, tags: idea.tags.filter((t) => t !== tag) });
  };

  const handleConnectionClick = (connectedId: string) => {
    window.open(`/ideate/${connectedId}`, "_blank");
  };

  const handleSaveAsNewIdea = async (title: string, content: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("ideas")
        .insert({
          user_id: user.id,
          title,
          content,
          initial_input: `Divergent path from: ${idea?.title}`,
          category: idea?.category || "general",
          tags: idea?.tags || [],
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        window.open(`/ideate/${data.id}`, "_blank");
      }
    } catch (error) {
      logger.error("Error creating new idea:", error);
    }
  };

  const handleCreateTask = async (
    title: string,
    description: string,
    priority: "high" | "medium" | "low",
  ) => {
    if (!user) return;

    logger.info("Creating task with:", { title, description, priority });

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title,
          description: description || "",
          priority,
          status: "not_started",
          objective_id: null,
          is_recurring: false,
        })
        .select()
        .single();

      if (error) {
        logger.error("Supabase error:", error);
        throw error;
      }

      logger.info("Task created successfully:", data);
      alert(t("ideaDetail.taskCreatedSuccess").replace("{{title}}", title));
    } catch (error) {
      logger.error("Error creating task:", error);
      alert(t("ideaDetail.taskCreateFailed"));
    }
  };

  const handleConvertSelectedToIdea = () => {
    if (!editor.selectionMenu) return;
    const text = editor.selectionMenu.text;
    editor.setSelectionMenu(null);
    const el = document.querySelector(
      "#idea-content-editor",
    ) as HTMLTextAreaElement;
    if (el) {
      el.blur();
      window.getSelection()?.removeAllRanges();
    }
    navigate("/ideate", { state: { initialInput: text } });
  };

  const handleConvertSelectedToTask = () => {
    if (!editor.selectionMenu) return;
    const text = editor.selectionMenu.text;
    const title = text.length > 50 ? text.substring(0, 47) + "..." : text;
    handleCreateTask(title, text, "medium");
    editor.setSelectionMenu(null);
    const el = document.querySelector(
      "#idea-content-editor",
    ) as HTMLTextAreaElement;
    if (el) {
      el.blur();
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleConvertSelectedToMindMap = () => {
    if (!editor.selectionMenu) return;
    navigate("/mindmap", {
      state: { problemStatement: editor.selectionMenu.text },
    });
    editor.setSelectionMenu(null);
    const el = document.querySelector(
      "#idea-content-editor",
    ) as HTMLTextAreaElement;
    if (el) {
      el.blur();
      window.getSelection()?.removeAllRanges();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">
            {t("ideaDetail.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <p className="text-text-secondary mb-4">
            {t("ideaDetail.ideaNotFound")}
          </p>
          <button
            onClick={() => navigate("/ideate")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t("ideaDetail.backToIdeas")}
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
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {t("ideaDetail.editIdea")}
              </h1>
              <p className="text-xs text-text-tertiary hidden sm:block">
                {t("ideaDetail.lastUpdated")}:{" "}
                {new Date(idea.updated_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="relative group hidden sm:block">
              <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-secondary transition-colors text-sm">
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">
                  {t("ideaDetail.export")}
                </span>
              </button>
              <div className="absolute right-0 mt-2 w-48 glass-strong border-border-primary opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport("txt")}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-secondary text-left text-sm"
                >
                  <FileText className="w-4 h-4" />
                  {t("ideaDetail.plainText")}
                </button>
                <button
                  onClick={() => handleExport("md")}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-secondary text-left text-sm"
                >
                  <FileCode className="w-4 h-4" />
                  {t("ideaDetail.markdown")}
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-secondary text-left text-sm"
                >
                  <File className="w-4 h-4" />
                  {t("ideaDetail.json")}
                </button>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{t("ideaDetail.save")}</span>
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">{t("ideaDetail.delete")}</span>
            </button>

            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                showAIPanel
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </button>
          </div>
        </div>
      </div>

      {showAIPanel && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-bg-primary rounded-lg p-6 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-text-secondary">
                  Loading AI Assistant...
                </span>
              </div>
            </div>
          }
        >
          <AIAssistantPanel
            ideaTitle={idea.title}
            ideaContent={idea.content}
            onClose={() => setShowAIPanel(false)}
            onSaveAsNewIdea={handleSaveAsNewIdea}
            onCreateTask={handleCreateTask}
            cache={aiCache}
            onCacheUpdate={setAiCache}
          />
        </Suspense>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-3 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              <div className="glass-card border-border-primary p-4 lg:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {t("ideaDetail.title")}
                    </label>
                    <input
                      type="text"
                      value={idea.title}
                      onChange={(e) =>
                        setIdea({ ...idea, title: e.target.value })
                      }
                      className="w-full px-3 lg:px-4 py-2 border border-border-primary bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base lg:text-lg font-semibold"
                    />
                  </div>

                  <div ref={editorRef} className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className="block text-sm font-medium text-text-secondary">
                        {t("ideaDetail.content")}
                      </label>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {[
                          {
                            mode: "enhance" as const,
                            label: t("ideaDetail.enhance"),
                            icon: <Wand2 className="w-3.5 h-3.5" />,
                          },
                          {
                            mode: "complete" as const,
                            label: t("ideaDetail.complete"),
                            icon: <CornerDownRight className="w-3.5 h-3.5" />,
                          },
                          {
                            mode: "shorten" as const,
                            label: t("ideaDetail.shorten"),
                            icon: <Scissors className="w-3.5 h-3.5" />,
                          },
                          {
                            mode: "summarize" as const,
                            label: t("ideaDetail.summarize"),
                            icon: <FileText className="w-3.5 h-3.5" />,
                          },
                          {
                            mode: "cocreate" as const,
                            label: t("ideaDetail.cocreate"),
                            icon: <Users className="w-3.5 h-3.5" />,
                          },
                        ].map((action) => (
                          <button
                            key={action.mode}
                            onClick={() => editor.handleTransform(action.mode)}
                            disabled={!!editor.aiTransforming}
                            title={action.label}
                            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                              editor.aiTransforming === action.mode
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-bg-secondary text-text-primary border-border-primary hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {editor.aiTransforming === action.mode ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              action.icon
                            )}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div
                      className="w-full h-96 border border-border-primary bg-bg-primary rounded-lg focus-within:ring-2 focus-within:ring-yellow-500 focus-within:border-transparent overflow-auto"
                      onMouseUp={editor.captureSelection}
                    >
                      <Editor
                        value={idea.content}
                        onValueChange={(content) =>
                          setIdea({ ...idea, content })
                        }
                        highlight={(code) => code}
                        padding={16}
                        textareaId="idea-content-editor"
                        className="font-mono text-sm"
                        style={{
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          fontSize: "0.875rem",
                          minHeight: "100%",
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* Selection Menu */}
                    {editor.selectionMenu && (
                      <SelectionMenu
                        selectionMenu={editor.selectionMenu}
                        onConvertToIdea={handleConvertSelectedToIdea}
                        onConvertToTask={handleConvertSelectedToTask}
                        onConvertToMindMap={handleConvertSelectedToMindMap}
                        t={t}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t("ideaDetail.category")}
                      </label>
                      <input
                        type="text"
                        value={idea.category}
                        onChange={(e) =>
                          setIdea({ ...idea, category: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border-primary bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t("ideaDetail.status")}
                      </label>
                      <select
                        value={idea.status}
                        onChange={(e) =>
                          setIdea({
                            ...idea,
                            status: e.target.value as Idea["status"],
                          })
                        }
                        className="w-full px-4 py-2 border border-border-primary bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      >
                        <option value="draft">{t("ideaDetail.draft")}</option>
                        <option value="active">{t("ideaDetail.active")}</option>
                        <option value="completed">
                          {t("ideaDetail.completed")}
                        </option>
                        <option value="archived">
                          {t("ideaDetail.archived")}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t("ideaDetail.tags")}
                    </label>
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
                      placeholder={t("ideaDetail.addTagPlaceholder")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                          addTag(e.currentTarget.value.trim());
                          e.currentTarget.value = "";
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
                    <h3 className="text-sm font-semibold text-blue-900">
                      {t("ideaDetail.originalInput")}
                    </h3>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {idea.initial_input}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass-card border-border-primary p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-text-secondary" />
                  <h3 className="font-semibold text-text-primary">
                    {t("ideaDetail.timeline")}
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-text-secondary">
                      {t("ideaDetail.created")}
                    </span>
                    <p className="text-text-primary">
                      {new Date(idea.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary">
                      {t("ideaDetail.updated")}
                    </span>
                    <p className="text-text-primary">
                      {new Date(idea.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <ConnectionsSidebar
                connections={connections}
                loadingConnections={loadingConnections}
                onConnectionClick={handleConnectionClick}
                t={t}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
