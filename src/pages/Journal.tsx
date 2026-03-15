import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useNotification } from "../contexts/NotificationContext";
import { supabase } from "../lib/supabase";
import { analyzeJournalEntry } from "../services/aiService";
import { formatShortDate } from "../utils/trackingStats";
import { Card, Button, IconButton, BottomSheet } from "../components/ui";
import { Header } from "../components/ui";
import { DailyPlanner } from "../components/journal";
import {
  Calendar,
  Plus,
  Sparkles,
  Trash2,
  Smile,
  Frown,
  Meh,
  ChevronRight,
  BookOpen,
  CalendarCheck,
} from "lucide-react";

type ViewMode = "journal" | "planner";

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
  const { t, language } = useLanguage();
  const { notify } = useNotification();
  const [viewMode, setViewMode] = useState<ViewMode>("journal");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [content, setContent] = useState("");
  const [showEntryList, setShowEntryList] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const getLocalDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) loadEntries();
  }, [user]);

  useEffect(() => {
    if (selectedEntry) {
      setContent(selectedEntry.content);
      setSelectedDate(selectedEntry.entry_date);
      loadAnalysis(selectedEntry.id);
    }
  }, [selectedEntry]);

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (content && content !== selectedEntry?.content) {
      autoSaveTimerRef.current = setTimeout(() => handleSave(), 3000);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [content, selectedEntry?.content]);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select(
        "id, content, entry_date, primary_emotion, created_at, updated_at",
      )
      .eq("user_id", user!.id)
      .order("entry_date", { ascending: false })
      .limit(30);

    if (error) {
      notify({
        type: "error",
        message: t("errors.loadFailed"),
        detail: error.message,
      });
      return;
    }
    if (data) {
      const entries = data.map((e) => ({
        ...e,
        primary_emotion: e.primary_emotion ?? undefined,
      })) as JournalEntry[];
      setEntries(entries);
      if (entries.length > 0 && !selectedEntry) setSelectedEntry(entries[0]);
    }
  };

  const loadAnalysis = async (entryId: string) => {
    const { data } = await supabase
      .from("ai_analysis")
      .select("id, emotions, patterns, coping_strategies")
      .eq("entry_id", entryId)
      .maybeSingle();
    setAnalysis(data as AIAnalysis | null);
  };

  const handleSave = async () => {
    if (!content.trim() || !user) return;
    setSaving(true);
    try {
      if (selectedEntry) {
        const contentChanged = content !== selectedEntry.content;
        const { error } = await supabase
          .from("journal_entries")
          .update({ content, entry_date: selectedDate })
          .eq("id", selectedEntry.id);
        if (error) {
          notify({
            type: "error",
            message: t("errors.saveFailed"),
            detail: error.message,
          });
        } else {
          setSelectedEntry({
            ...selectedEntry,
            content,
            entry_date: selectedDate,
          });
          if (contentChanged && analysis) setAnalysis(null);
        }
      } else {
        const { data, error } = await supabase
          .from("journal_entries")
          .insert({ user_id: user.id, content, entry_date: selectedDate })
          .select()
          .single();
        if (error) {
          notify({
            type: "error",
            message: t("errors.saveFailed"),
            detail: error.message,
          });
        } else if (data) {
          setSelectedEntry({
            ...data,
            primary_emotion: data.primary_emotion ?? undefined,
          } as JournalEntry);
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
    if (content !== selectedEntry.content) await handleSave();

    setAnalyzing(true);
    try {
      const result = await analyzeJournalEntry(content, language);
      const analysisData: AIAnalysis = {
        id: "temp",
        emotions: result.emotions,
        patterns: result.patterns,
        coping_strategies: result.coping_strategies,
      };

      const { error } = await supabase.from("ai_analysis").upsert(
        {
          entry_id: selectedEntry.id,
          user_id: user!.id,
          emotions: analysisData.emotions,
          patterns: analysisData.patterns,
          coping_strategies: analysisData.coping_strategies,
        },
        { onConflict: "entry_id" },
      );

      if (!error) {
        setAnalysis(analysisData);
        await supabase
          .from("journal_entries")
          .update({ primary_emotion: result.primary_emotion })
          .eq("id", selectedEntry.id);
        setSelectedEntry({
          ...selectedEntry,
          primary_emotion: result.primary_emotion,
        });
        loadEntries();
        setShowAnalysis(true);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNewEntry = () => {
    setSelectedEntry(null);
    setContent("");
    setAnalysis(null);
    setSelectedDate(getLocalDateString());
  };

  const handleDelete = async () => {
    if (!selectedEntry || !confirm(t("journal.confirmDelete"))) return;
    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", selectedEntry.id);
    if (error) {
      notify({
        type: "error",
        message: t("errors.deleteFailed"),
        detail: error.message,
      });
      return;
    }
    setSelectedEntry(null);
    setContent("");
    setAnalysis(null);
    loadEntries();
  };

  const getEmotionIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("happy") || lower.includes("hopeful"))
      return <Smile className="w-4 h-4 text-green-500" />;
    if (lower.includes("sad") || lower.includes("anxious"))
      return <Frown className="w-4 h-4 text-amber-500" />;
    return <Meh className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header
        title={t("nav.journal")}
        subtitle={
          viewMode === "journal"
            ? selectedEntry
              ? formatShortDate(
                  new Date(selectedEntry.entry_date + "T00:00:00"),
                )
              : t("journal.newEntry")
            : t("journal.plannerSubtitle")
        }
        rightAction={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <button
                onClick={() => setViewMode("journal")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "journal"
                    ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {t("journal.journalView")}
                </span>
              </button>
              <button
                onClick={() => setViewMode("planner")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "planner"
                    ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {t("journal.plannerView")}
                </span>
              </button>
            </div>

            {/* Journal-specific actions */}
            {viewMode === "journal" && (
              <div className="flex items-center gap-1">
                <IconButton onClick={() => setShowEntryList(true)}>
                  <Calendar className="w-5 h-5" />
                </IconButton>
                <IconButton onClick={handleNewEntry}>
                  <Plus className="w-5 h-5" />
                </IconButton>
              </div>
            )}
          </div>
        }
      />

      {/* Daily Planner View */}
      {viewMode === "planner" && user && (
        <div className="flex-1 p-4 max-w-7xl mx-auto w-full pb-24">
          <DailyPlanner userId={user.id} />
        </div>
      )}

      {/* Journal View */}
      {viewMode === "journal" && (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
          <div className="hidden lg:block w-72 shrink-0">
            <Card padding="none" className="h-full overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                  {t("journal.recentEntries")}
                </h3>
                <Button size="sm" onClick={handleNewEntry}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-16rem)] p-2 space-y-1">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedEntry?.id === entry.id
                        ? "bg-indigo-600 text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-medium ${selectedEntry?.id === entry.id ? "text-indigo-200" : "text-gray-500"}`}
                      >
                        {formatShortDate(
                          new Date(entry.entry_date + "T00:00:00"),
                        )}
                      </span>
                      {entry.primary_emotion && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            selectedEntry?.id === entry.id
                              ? "bg-white/20"
                              : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {entry.primary_emotion}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm line-clamp-2 ${selectedEntry?.id === entry.id ? "text-white/80" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      {entry.content}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <Card
              padding="none"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none text-gray-900 dark:text-gray-100 font-semibold focus:ring-0 p-0 cursor-pointer"
                  />
                  <span
                    className={`text-xs px-2 py-1 rounded-lg ${saving ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"} dark:bg-opacity-20`}
                  >
                    {saving ? t("journal.saving") : t("journal.autoSaved")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {content.trim() && (
                    <Button
                      size="sm"
                      onClick={handleAnalyze}
                      loading={analyzing}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {t("journal.analyzeEntry")}
                      </span>
                    </Button>
                  )}
                  {analysis && (
                    <IconButton onClick={() => setShowAnalysis(true)}>
                      <ChevronRight className="w-4 h-4" />
                    </IconButton>
                  )}
                  {selectedEntry && (
                    <IconButton variant="danger" onClick={handleDelete}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  )}
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("journal.placeholder")}
                className="flex-1 p-4 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none text-base leading-relaxed"
              />
            </Card>
          </div>

          {analysis && (
            <div className="hidden lg:block w-80 shrink-0">
              <AnalysisPanel
                analysis={analysis}
                getEmotionIcon={getEmotionIcon}
                t={t}
              />
            </div>
          )}
        </div>
      )}

      {/* Journal Bottom Sheets */}
      {viewMode === "journal" && (
        <>
          <BottomSheet
            isOpen={showEntryList}
            onClose={() => setShowEntryList(false)}
            title={t("journal.recentEntries")}
            height="half"
          >
            <div className="space-y-2">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setShowEntryList(false);
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedEntry?.id === entry.id
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium ${selectedEntry?.id === entry.id ? "text-indigo-200" : "text-gray-500"}`}
                    >
                      {formatShortDate(
                        new Date(entry.entry_date + "T00:00:00"),
                      )}
                    </span>
                    {entry.primary_emotion && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          selectedEntry?.id === entry.id
                            ? "bg-white/20"
                            : "bg-indigo-100 text-indigo-600"
                        }`}
                      >
                        {entry.primary_emotion}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm line-clamp-2 ${selectedEntry?.id === entry.id ? "text-white/80" : "text-gray-600 dark:text-gray-400"}`}
                  >
                    {entry.content}
                  </p>
                </button>
              ))}
            </div>
          </BottomSheet>

          <BottomSheet
            isOpen={showAnalysis}
            onClose={() => setShowAnalysis(false)}
            title={t("journal.aiInsights")}
            height="auto"
          >
            {analysis && (
              <AnalysisPanel
                analysis={analysis}
                getEmotionIcon={getEmotionIcon}
                t={t}
              />
            )}
          </BottomSheet>
        </>
      )}
    </div>
  );
}

function AnalysisPanel({
  analysis,
  getEmotionIcon,
  t,
}: {
  analysis: AIAnalysis;
  getEmotionIcon: (name: string) => JSX.Element;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      <Card padding="md">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
          {t("journal.emotions")}
        </h4>
        <div className="space-y-2">
          {analysis.emotions.map((emotion, i) => (
            <div key={i} className="flex items-center gap-3">
              {getEmotionIcon(emotion.name)}
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {emotion.name}
              </span>
              <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${emotion.intensity * 100}%`,
                    backgroundColor: emotion.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="md">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
          {t("journal.patterns")}
        </h4>
        <ul className="space-y-2">
          {analysis.patterns.map((pattern, i) => (
            <li
              key={i}
              className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              {pattern}
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="md">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
          {t("journal.copingStrategies")}
        </h4>
        <ul className="space-y-2">
          {analysis.coping_strategies.map((strategy, i) => (
            <li
              key={i}
              className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
              {strategy}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
