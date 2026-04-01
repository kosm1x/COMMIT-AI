import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Sparkles,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  BookOpen,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckSquare,
  RefreshCw,
  Network,
} from "lucide-react";
import {
  generateDivergentPaths,
  suggestNextSteps,
  generateCriticalAnalysis,
  generateRelatedConcepts,
} from "../services/aiService";
import { logger } from '../utils/logger';

interface AICache {
  divergentPaths?: DivergentPath[];
  nextSteps?: NextStep[];
  criticalAnalysis?: CriticalAnalysis | null;
  relatedConcepts?: RelatedConcept[];
}

interface AIAssistantPanelProps {
  ideaTitle: string;
  ideaContent: string;
  onClose: () => void;
  onSaveAsNewIdea: (title: string, content: string) => void;
  onCreateTask?: (
    title: string,
    description: string,
    priority: "high" | "medium" | "low",
  ) => void;
  cache?: AICache;
  onCacheUpdate?: (cache: AICache) => void;
}

interface SelectionMenu {
  text: string;
  x: number;
  y: number;
}

type ToolType = "divergent" | "nextSteps" | "critical" | "concepts" | null;

interface DivergentPath {
  title: string;
  description: string;
  approach: string;
  potentialOutcome: string;
}

interface NextStep {
  step: string;
  description: string;
  timeEstimate: string;
  priority: "high" | "medium" | "low";
}

interface CriticalAnalysis {
  strengths: string[];
  challenges: string[];
  assumptions: string[];
  alternativePerspectives: string[];
}

interface RelatedConcept {
  concept: string;
  description: string;
  relevance: string;
  resources: string[];
}

export default function AIAssistantPanel({
  ideaTitle,
  ideaContent,
  onClose,
  onSaveAsNewIdea,
  onCreateTask,
  cache,
  onCacheUpdate,
}: AIAssistantPanelProps) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [loading, setLoading] = useState(false);
  const [divergentPaths, setDivergentPaths] = useState<DivergentPath[]>(
    cache?.divergentPaths || [],
  );
  const [nextSteps, setNextSteps] = useState<NextStep[]>(
    cache?.nextSteps || [],
  );
  const [criticalAnalysis, setCriticalAnalysis] =
    useState<CriticalAnalysis | null>(cache?.criticalAnalysis ?? null);
  const [relatedConcepts, setRelatedConcepts] = useState<RelatedConcept[]>(
    cache?.relatedConcepts || [],
  );
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu | null>(
    null,
  );
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset state when idea content changes (new idea loaded)
  useEffect(() => {
    // Clear all state when idea changes
    setDivergentPaths([]);
    setNextSteps([]);
    setCriticalAnalysis(null);
    setRelatedConcepts([]);
    setActiveTool(null);
    setExpandedItems(new Set());
  }, [ideaTitle, ideaContent]);

  // Sync state with cache when cache prop changes (only populate if local state is empty)
  useEffect(() => {
    if (cache?.divergentPaths && divergentPaths.length === 0) {
      setDivergentPaths(cache.divergentPaths);
    }
    if (cache?.nextSteps && nextSteps.length === 0) {
      setNextSteps(cache.nextSteps);
    }
    if (cache?.criticalAnalysis !== undefined && criticalAnalysis === null) {
      setCriticalAnalysis(cache.criticalAnalysis);
    }
    if (cache?.relatedConcepts && relatedConcepts.length === 0) {
      setRelatedConcepts(cache.relatedConcepts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache]);

  // Update cache when data changes
  const updateCache = (updates: Partial<AICache>) => {
    const newCache: AICache = {
      ...cache,
      ...updates,
    };
    onCacheUpdate?.(newCache);
  };

  const handleToolClick = async (tool: ToolType) => {
    if (activeTool === tool) {
      setActiveTool(null);
      return;
    }

    setActiveTool(tool);
    setLoading(true);

    try {
      switch (tool) {
        case "divergent":
          if (divergentPaths.length === 0 && !cache?.divergentPaths) {
            const paths = await generateDivergentPaths(
              ideaTitle,
              ideaContent,
              language,
            );
            setDivergentPaths(paths);
            updateCache({ divergentPaths: paths });
          } else if (cache?.divergentPaths && divergentPaths.length === 0) {
            setDivergentPaths(cache.divergentPaths);
          }
          break;
        case "nextSteps":
          if (nextSteps.length === 0 && !cache?.nextSteps) {
            const steps = await suggestNextSteps(
              ideaTitle,
              ideaContent,
              language,
            );
            setNextSteps(steps);
            updateCache({ nextSteps: steps });
          } else if (cache?.nextSteps && nextSteps.length === 0) {
            setNextSteps(cache.nextSteps);
          }
          break;
        case "critical":
          if (!criticalAnalysis && cache?.criticalAnalysis === undefined) {
            const analysis = await generateCriticalAnalysis(
              ideaTitle,
              ideaContent,
              language,
            );
            setCriticalAnalysis(analysis);
            updateCache({ criticalAnalysis: analysis });
          } else if (
            cache?.criticalAnalysis !== undefined &&
            criticalAnalysis === null
          ) {
            setCriticalAnalysis(cache.criticalAnalysis);
          }
          break;
        case "concepts":
          if (relatedConcepts.length === 0 && !cache?.relatedConcepts) {
            const concepts = await generateRelatedConcepts(
              ideaTitle,
              ideaContent,
              language,
            );
            setRelatedConcepts(concepts);
            updateCache({ relatedConcepts: concepts });
          } else if (cache?.relatedConcepts && relatedConcepts.length === 0) {
            setRelatedConcepts(cache.relatedConcepts);
          }
          break;
      }
    } catch (error) {
      logger.error("Error generating AI content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (tool: ToolType) => {
    setLoading(true);

    try {
      switch (tool) {
        case "divergent": {
          const paths = await generateDivergentPaths(
            ideaTitle,
            ideaContent,
            language,
          );
          setDivergentPaths(paths);
          updateCache({ divergentPaths: paths });
          break;
        }
        case "nextSteps": {
          const steps = await suggestNextSteps(
            ideaTitle,
            ideaContent,
            language,
          );
          setNextSteps(steps);
          updateCache({ nextSteps: steps });
          break;
        }
        case "critical": {
          const analysis = await generateCriticalAnalysis(
            ideaTitle,
            ideaContent,
            language,
          );
          setCriticalAnalysis(analysis);
          updateCache({ criticalAnalysis: analysis });
          break;
        }
        case "concepts": {
          const concepts = await generateRelatedConcepts(
            ideaTitle,
            ideaContent,
            language,
          );
          setRelatedConcepts(concepts);
          updateCache({ relatedConcepts: concepts });
          break;
        }
      }
    } catch (error) {
      logger.error("Error refreshing AI content:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "low":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
      default:
        return "bg-bg-tertiary text-text-secondary border-border-primary";
    }
  };

  // Handle text selection in selectable sections
  const handleTextSelection = () => {
    // Only handle in critical analysis or related concepts sections
    if (activeTool !== "critical" && activeTool !== "concepts") {
      setSelectionMenu(null);
      return;
    }

    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setSelectionMenu(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length < 3) {
        setSelectionMenu(null);
        return;
      }

      // Check if selection is within the panel
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      if (
        !panelRef.current?.contains(
          commonAncestor.nodeType === Node.TEXT_NODE
            ? commonAncestor.parentElement
            : (commonAncestor as Node),
        )
      ) {
        setSelectionMenu(null);
        return;
      }

      // Get selection position
      const rect = range.getBoundingClientRect();
      const panelRect = panelRef.current?.getBoundingClientRect();

      if (panelRect) {
        setSelectionMenu({
          text: selectedText,
          x: rect.left - panelRect.left + rect.width / 2,
          y: rect.top - panelRect.top - 10,
        });
      }
    }, 10);
  };

  // Handle conversion actions
  const handleConvertToIdea = () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    const title = text.length > 50 ? text.substring(0, 47) + "..." : text;
    onSaveAsNewIdea(title, text);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleConvertToTask = () => {
    if (!selectionMenu || !onCreateTask) return;
    const text = selectionMenu.text;
    const title = text.length > 50 ? text.substring(0, 47) + "..." : text;
    onCreateTask(title, text, "medium");
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleConvertToMindMap = () => {
    if (!selectionMenu) return;
    navigate("/mindmap", { state: { problemStatement: selectionMenu.text } });
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  // Close selection menu on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        selectionMenu &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setSelectionMenu(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectionMenu) {
        setSelectionMenu(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectionMenu]);

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 h-screen w-96 bg-bg-primary/95 backdrop-blur-md border-l border-border-primary shadow-xl flex flex-col z-50"
      onMouseUp={handleTextSelection}
    >
      <div className="flex items-center justify-between p-4 border-b border-border-primary bg-gradient-to-r from-blue-50 to-bg-primary dark:from-blue-950/30 dark:to-bg-primary">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-text-primary">
            AI Collaborator
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-bg-tertiary rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="space-y-2">
          <button
            onClick={() => handleToolClick("divergent")}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              activeTool === "divergent"
                ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                : "border-border-primary hover:border-blue-500 dark:hover:border-blue-400 bg-bg-primary hover:bg-bg-secondary"
            }`}
          >
            <div className="flex items-start gap-3">
              <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary mb-1">
                  {t("ideate.aiAssistant.exploreDivergent")}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t("ideate.aiAssistant.exploreDivergentDesc")}
                </p>
              </div>
            </div>
          </button>

          {activeTool === "divergent" && (
            <div className="ml-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-tertiary">
                  {t("ideate.aiAssistant.divergentPaths")}
                </span>
                <button
                  onClick={() => handleRefresh("divergent")}
                  disabled={loading}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh results"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                  />
                  {t("ideate.aiAssistant.refresh")}
                </button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : (
                divergentPaths.map((path, index) => (
                  <div
                    key={index}
                    className="bg-bg-primary border border-border-primary rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-text-primary">
                        {path.title}
                      </h4>
                      <button
                        onClick={() =>
                          onSaveAsNewIdea(
                            path.title,
                            `${path.description}\n\n**Approach:**\n${path.approach}\n\n**Potential Outcome:**\n${path.potentialOutcome}`,
                          )
                        }
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-950/30 rounded transition-colors flex-shrink-0"
                        title="Save as new idea"
                      >
                        <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      {path.description}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-text-primary">
                          {t("ideate.aiAssistant.approach")}{" "}
                        </span>
                        <span className="text-text-secondary">
                          {path.approach}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-text-primary">
                          {t("ideate.aiAssistant.outcome")}{" "}
                        </span>
                        <span className="text-text-secondary">
                          {path.potentialOutcome}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => handleToolClick("nextSteps")}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            activeTool === "nextSteps"
              ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30"
              : "border-border-primary hover:border-blue-500 dark:hover:border-blue-400 bg-bg-primary hover:bg-bg-secondary"
          }`}
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary mb-1">
                {t("ideate.aiAssistant.suggestNextSteps")}
              </h3>
              <p className="text-sm text-text-secondary">
                {t("ideate.aiAssistant.suggestNextStepsDesc")}
              </p>
            </div>
          </div>
        </button>

        {activeTool === "nextSteps" && (
          <div className="ml-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-tertiary">
                {t("ideate.aiAssistant.nextSteps")}
              </span>
              <button
                onClick={() => handleRefresh("nextSteps")}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh results"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : (
              nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="bg-bg-primary border border-border-primary rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleExpanded(index)}
                      className="mt-1 flex-shrink-0"
                    >
                      {expandedItems.has(index) ? (
                        <ChevronUp className="w-4 h-4 text-text-tertiary" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-tertiary" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-text-primary text-sm">
                          {step.step}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(
                              step.priority,
                            )}`}
                          >
                            {step.priority}
                          </span>
                          {onCreateTask && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCreateTask(
                                  step.step,
                                  step.description,
                                  step.priority,
                                );
                              }}
                              className="p-1 hover:bg-green-100 dark:hover:bg-green-950/30 rounded transition-colors"
                              title="Convert to task"
                            >
                              <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </button>
                          )}
                        </div>
                      </div>
                      {expandedItems.has(index) && (
                        <div className="space-y-1 mt-2 text-sm">
                          <p className="text-text-secondary">
                            {step.description}
                          </p>
                          <p className="text-text-tertiary text-xs">
                            Estimated time: {step.timeEstimate}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={() => handleToolClick("critical")}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            activeTool === "critical"
              ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30"
              : "border-border-primary hover:border-blue-500 dark:hover:border-blue-400 bg-bg-primary hover:bg-bg-secondary"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary mb-1">
                {t("ideate.aiAssistant.criticalAnalysis")}
              </h3>
              <p className="text-sm text-text-secondary">
                {t("ideate.aiAssistant.criticalAnalysisDesc")}
              </p>
            </div>
          </div>
        </button>

        {activeTool === "critical" && (
          <div className="ml-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-tertiary">
                {t("ideate.aiAssistant.criticalAnalysis")}
              </span>
              {criticalAnalysis && (
                <button
                  onClick={() => handleRefresh("critical")}
                  disabled={loading}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh results"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                  />
                  {t("ideate.aiAssistant.refresh")}
                </button>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : criticalAnalysis ? (
              <>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 select-text">
                  <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 text-sm">
                    {t("ideate.aiAssistant.strengths")}
                  </h4>
                  <ul className="space-y-1">
                    {criticalAnalysis.strengths.map((strength, index) => (
                      <li
                        key={index}
                        className="text-sm text-green-800 dark:text-green-300 flex gap-2"
                      >
                        <span className="text-green-600 dark:text-green-400">
                          •
                        </span>
                        <span className="select-text">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 select-text">
                  <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-2 text-sm">
                    {t("ideate.aiAssistant.challenges")}
                  </h4>
                  <ul className="space-y-1">
                    {criticalAnalysis.challenges.map((challenge, index) => (
                      <li
                        key={index}
                        className="text-sm text-orange-800 dark:text-orange-300 flex gap-2"
                      >
                        <span className="text-orange-600 dark:text-orange-400">
                          •
                        </span>
                        <span className="select-text">{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 select-text">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 text-sm">
                    {t("ideate.aiAssistant.assumptions")}
                  </h4>
                  <ul className="space-y-1">
                    {criticalAnalysis.assumptions.map((assumption, index) => (
                      <li
                        key={index}
                        className="text-sm text-blue-800 dark:text-blue-300 flex gap-2"
                      >
                        <span className="text-blue-600 dark:text-blue-400">
                          •
                        </span>
                        <span className="select-text">{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-bg-tertiary border border-border-primary rounded-lg p-3 select-text">
                  <h4 className="font-semibold text-text-primary mb-2 text-sm">
                    {t("ideate.aiAssistant.alternatives")}
                  </h4>
                  <ul className="space-y-1">
                    {criticalAnalysis.alternativePerspectives.map(
                      (perspective, index) => (
                        <li
                          key={index}
                          className="text-sm text-text-secondary flex gap-2"
                        >
                          <span className="text-text-tertiary">•</span>
                          <span className="select-text">{perspective}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </>
            ) : null}
          </div>
        )}

        <button
          onClick={() => handleToolClick("concepts")}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            activeTool === "concepts"
              ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30"
              : "border-border-primary hover:border-blue-500 dark:hover:border-blue-400 bg-bg-primary hover:bg-bg-secondary"
          }`}
        >
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary mb-1">
                {t("ideate.aiAssistant.relatedConcepts")}
              </h3>
              <p className="text-sm text-text-secondary">
                {t("ideate.aiAssistant.relatedConceptsDesc")}
              </p>
            </div>
          </div>
        </button>

        {activeTool === "concepts" && (
          <div className="ml-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-tertiary">
                {t("ideate.aiAssistant.relatedConcepts")}
              </span>
              <button
                onClick={() => handleRefresh("concepts")}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh results"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : (
              relatedConcepts.map((concept, index) => (
                <div
                  key={index}
                  className="bg-bg-primary border border-border-primary rounded-lg p-4 hover:shadow-md transition-shadow select-text"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <h4 className="font-semibold text-text-primary text-sm select-text">
                      {concept.concept}
                    </h4>
                  </div>
                  <p className="text-sm text-text-secondary mb-2 select-text">
                    {concept.description}
                  </p>
                  <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800 rounded p-2 mb-2 select-text">
                    <p className="text-xs text-purple-900 dark:text-purple-300">
                      <span className="font-medium">
                        {t("ideate.aiAssistant.relevance")}{" "}
                      </span>
                      <span className="select-text">{concept.relevance}</span>
                    </p>
                  </div>
                  {concept.resources.length > 0 && (
                    <div className="select-text">
                      <p className="text-xs font-medium text-text-primary mb-1">
                        {t("ideate.aiAssistant.resources")}
                      </p>
                      <ul className="space-y-0.5">
                        {concept.resources.map((resource, rIndex) => (
                          <li
                            key={rIndex}
                            className="text-xs text-text-secondary flex gap-1"
                          >
                            <span className="text-text-tertiary">•</span>
                            <span className="select-text">{resource}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border-primary bg-bg-tertiary">
        <p className="text-xs text-text-secondary text-center">
          AI suggestions to enhance your creative process
        </p>
      </div>

      {/* Selection Menu */}
      {selectionMenu && (
        <div
          className="absolute z-50 bg-bg-primary border border-border-primary rounded-lg shadow-xl p-2 flex gap-2 animate-in fade-in slide-in-from-bottom-2"
          style={{
            left: `${selectionMenu.x}px`,
            top: `${selectionMenu.y}px`,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <button
            onClick={handleConvertToIdea}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
            title="Convert to Idea"
          >
            <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Idea
          </button>
          {onCreateTask && (
            <button
              onClick={handleConvertToTask}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-green-50 dark:hover:bg-green-950/30 rounded transition-colors"
              title="Convert to Task"
            >
              <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              Task
            </button>
          )}
          <button
            onClick={handleConvertToMindMap}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded transition-colors"
            title="Convert to Mind Map"
          >
            <Network className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Mind Map
          </button>
        </div>
      )}
    </div>
  );
}
