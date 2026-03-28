import { useState, useEffect } from "react";
import { Loader2, Inbox } from "lucide-react";
import { BottomSheet } from "../ui";
import SuggestionCard from "./SuggestionCard";
import ActivityFeed from "./ActivityFeed";
import { useLanguage } from "../../contexts/LanguageContext";
import type { AgentSuggestion } from "../../services/suggestionsService";

interface ActivityItem {
  table: string;
  id: string;
  title: string;
  modified_at: string;
}

interface SuggestionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: AgentSuggestion[];
  activity: ActivityItem[];
  loading: boolean;
  processingIds: Set<string>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

type Tab = "pending" | "activity";

export default function SuggestionsPanel({
  isOpen,
  onClose,
  suggestions,
  activity,
  loading,
  processingIds,
  onAccept,
  onReject,
}: SuggestionsPanelProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  // Reset to pending tab when panel opens so new suggestions are visible
  useEffect(() => {
    if (isOpen) setActiveTab("pending");
  }, [isOpen]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("suggestions.title") || "Jarvis Suggestions"}
      height="full"
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4">
          <button
            onClick={() => setActiveTab("pending")}
            aria-label={t("suggestions.pending") || "Pending"}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
              activeTab === "pending"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t("suggestions.pending") || "Pending"}
            {suggestions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-bold">
                {suggestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            aria-label={t("suggestions.activity") || "Activity"}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
              activeTab === "activity"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t("suggestions.activity") || "Activity"}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : activeTab === "pending" ? (
            suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    onAccept={onAccept}
                    onReject={onReject}
                    disabled={processingIds.has(s.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("suggestions.noPending") || "No pending suggestions"}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {t("suggestions.noPendingHint") ||
                    "Jarvis will suggest actions based on your activity"}
                </p>
              </div>
            )
          ) : (
            <ActivityFeed items={activity} />
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
