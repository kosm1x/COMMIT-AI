import {
  Check,
  X,
  Clock,
  Zap,
  Brain,
  MessageSquare,
  Search,
  CalendarCheck,
} from "lucide-react";
import type { AgentSuggestion } from "../../services/suggestionsService";
import { useLanguage } from "../../contexts/LanguageContext";

interface SuggestionCardProps {
  suggestion: AgentSuggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

const SOURCE_CONFIG: Record<
  string,
  { icon: typeof Zap; color: string; label: string }
> = {
  event_reactor: {
    icon: Zap,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Event",
  },
  proactive_scan: {
    icon: Search,
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    label: "Scan",
  },
  journal_analysis: {
    icon: Brain,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    label: "Journal",
  },
  conversation: {
    icon: MessageSquare,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    label: "Chat",
  },
  weekly_review: {
    icon: CalendarCheck,
    color:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    label: "Review",
  },
};

function timeAgo(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("objectives.justNow") || "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
}: SuggestionCardProps) {
  const { t } = useLanguage();
  const source =
    SOURCE_CONFIG[suggestion.source ?? ""] ?? SOURCE_CONFIG.event_reactor;
  const SourceIcon = source.icon;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight flex-1">
          {suggestion.title}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${source.color}`}
          >
            <SourceIcon className="w-3 h-3" />
            {source.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {timeAgo(suggestion.created_at, t)}
          </span>
        </div>
      </div>

      {suggestion.reasoning && (
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {suggestion.reasoning}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onAccept(suggestion.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
          aria-label={t("suggestions.accept") || "Accept suggestion"}
        >
          <Check className="w-3.5 h-3.5" />
          {t("suggestions.accept") || "Accept"}
        </button>
        <button
          onClick={() => onReject(suggestion.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
          aria-label={t("suggestions.dismiss") || "Dismiss suggestion"}
        >
          <X className="w-3.5 h-3.5" />
          {t("suggestions.dismiss") || "Dismiss"}
        </button>
      </div>
    </div>
  );
}
