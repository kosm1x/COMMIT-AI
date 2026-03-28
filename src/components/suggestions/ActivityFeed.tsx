import { Flag, Target, ListChecks, Eye } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface ActivityItem {
  table: string;
  id: string;
  title: string;
  modified_at: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

const TABLE_CONFIG: Record<string, { icon: typeof Flag; label: string }> = {
  tasks: { icon: ListChecks, label: "Task" },
  goals: { icon: Flag, label: "Goal" },
  objectives: { icon: Target, label: "Objective" },
  visions: { icon: Eye, label: "Vision" },
};

export default function ActivityFeed({ items }: ActivityFeedProps) {
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("suggestions.noActivity") || "No recent Jarvis activity"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const config = TABLE_CONFIG[item.table] ?? TABLE_CONFIG.tasks;
        const Icon = config.icon;
        return (
          <div
            key={`${item.table}-${item.id}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                {item.title}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {config.label} &middot;{" "}
                {new Date(item.modified_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
