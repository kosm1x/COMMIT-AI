import { Bell } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface SuggestionsBadgeProps {
  count: number;
  onClick: () => void;
}

export default function SuggestionsBadge({
  count,
  onClick,
}: SuggestionsBadgeProps) {
  const { t } = useLanguage();
  const label = t("suggestions.title") || "Jarvis Suggestions";
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] rounded-xl transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      aria-label={`${label}${count > 0 ? ` (${count})` : ""}`}
    >
      <div className="relative p-1.5 rounded-xl">
        <Bell className="w-5 h-5" strokeWidth={2} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white animate-pulse">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">Jarvis</span>
    </button>
  );
}
