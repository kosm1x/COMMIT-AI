import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import {
  Eye,
  Target,
  Flag,
  CheckCircle2,
  Circle,
  Clock,
  Pause,
} from "lucide-react";
import { logger } from '../../utils/logger';

interface Item {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  type: "vision" | "goal" | "objective" | "task";
  is_recurring?: boolean;
}

const STATUS_COLUMNS = [
  {
    id: "not_started",
    labelKey: "notStarted",
    icon: Circle,
    color: "text-gray-500 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900",
    borderColor: "border-gray-200 dark:border-gray-700",
  },
  {
    id: "in_progress",
    labelKey: "inProgress",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "on_hold",
    labelKey: "onHold",
    icon: Pause,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  {
    id: "completed",
    labelKey: "completedStatus",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
] as const;

const TYPE_CONFIG = {
  vision: {
    icon: Eye,
    color:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    labelKey: "vision",
  },
  goal: {
    icon: Target,
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    labelKey: "goal",
  },
  objective: {
    icon: Flag,
    color:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    labelKey: "objective",
  },
  task: {
    icon: CheckCircle2,
    color:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    labelKey: "task",
  },
};

export default function KanbanOverview() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAllItems();
    }
  }, [user]);

  // Navigate to kanban board with scroll to specific section
  const handleTypeClick = (type: "vision" | "goal" | "objective" | "task") => {
    navigate("/boards", { state: { scrollTo: type } });
  };

  // Navigate to kanban board with specific item selected
  const handleItemClick = (item: Item) => {
    navigate("/boards", {
      state: { selectItem: { id: item.id, type: item.type } },
    });
  };

  const loadAllItems = async () => {
    setLoading(true);
    try {
      const [visionsResult, goalsResult, objectivesResult, tasksResult] =
        await Promise.all([
          supabase
            .from("visions")
            .select("id, title, status")
            .eq("user_id", user!.id),
          supabase
            .from("goals")
            .select("id, title, status")
            .eq("user_id", user!.id),
          supabase
            .from("objectives")
            .select("id, title, status")
            .eq("user_id", user!.id),
          supabase
            .from("tasks")
            .select("id, title, status, is_recurring")
            .eq("user_id", user!.id),
        ]);

      const items: Item[] = [
        ...(visionsResult.data || []).map((v) => ({
          ...v,
          status: (v.status || "not_started") as Item["status"],
          type: "vision" as const,
        })),
        ...(goalsResult.data || []).map((g) => ({
          ...g,
          status: (g.status || "not_started") as Item["status"],
          type: "goal" as const,
        })),
        ...(objectivesResult.data || []).map((o) => ({
          ...o,
          status: (o.status || "not_started") as Item["status"],
          type: "objective" as const,
        })),
        ...(tasksResult.data || []).map((t) => ({
          ...t,
          status: (t.status || "not_started") as Item["status"],
          type: "task" as const,
        })),
      ];

      setAllItems(items);
    } catch (error) {
      logger.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  const getItemsByStatus = (status: string) => {
    return allItems.filter((item) => item.status === status);
  };

  const getTypeCounts = () => {
    return {
      vision: allItems.filter((item) => item.type === "vision").length,
      goal: allItems.filter((item) => item.type === "goal").length,
      objective: allItems.filter((item) => item.type === "objective").length,
      task: allItems.filter((item) => item.type === "task").length,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const typeCounts = getTypeCounts();

  return (
    <div className="space-y-4">
      {/* Type Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon;
          const count = typeCounts[type as keyof typeof typeCounts];
          return (
            <button
              key={type}
              onClick={() =>
                handleTypeClick(
                  type as "vision" | "goal" | "objective" | "task",
                )
              }
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.color} border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 cursor-pointer hover:scale-[1.02] hover:shadow-md active:scale-[0.98] transition-all`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-bold">{count}</span>
              <span className="text-xs font-medium ml-auto">
                {t(`tracking.${config.labelKey}`)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status Columns - Vertical Stack for Better Readability */}
      <div className="space-y-3">
        {STATUS_COLUMNS.map((column) => {
          const StatusIcon = column.icon;
          const items = getItemsByStatus(column.id);

          return (
            <div key={column.id} className="space-y-2">
              {/* Column Header */}
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${column.bgColor} ${column.borderColor}`}
              >
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${column.color}`} />
                  <span className="text-sm font-bold text-text-primary">
                    {t(`tracking.${column.labelKey}`)}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${column.bgColor} ${column.color} border ${column.borderColor}`}
                >
                  {items.length}
                </span>
              </div>

              {/* Items List */}
              {items.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-tertiary bg-white/20 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  {t("tracking.noItems")}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                  {items.slice(0, 10).map((item) => {
                    const config = TYPE_CONFIG[item.type];
                    const ItemIcon = config.icon;

                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleItemClick(item)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:shadow-sm cursor-pointer active:scale-[0.98] transition-all text-left"
                      >
                        <div
                          className={`${config.color} p-1.5 rounded border border-white/40 dark:border-white/10 flex-shrink-0`}
                        >
                          <ItemIcon className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-medium text-text-primary flex-1 truncate">
                          {item.title}
                        </span>
                        {item.type === "task" && item.is_recurring && (
                          <span className="text-xs text-purple-600 dark:text-purple-400">
                            🔁
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {items.length > 10 && (
                    <button
                      onClick={() => navigate("/boards")}
                      className="w-full text-center py-2 text-xs text-text-tertiary font-medium hover:text-accent-primary transition-colors"
                    >
                      +{items.length - 10} {t("tracking.more")}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
