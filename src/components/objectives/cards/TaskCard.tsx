import { useState, useEffect, memo } from "react";
import {
  Edit2,
  Trash2,
  Calendar,
  Save,
  X,
  Link2,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Plus,
} from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { Task, Objective } from "../types";
import { formatLastEdited, getPriorityColor } from "../utils";
import { formatShortDate } from "../../../utils/trackingStats";

interface TaskCardProps {
  task: Task;
  objectives: Objective[]; // All objectives (including orphans) for the dropdown
  isSelected: boolean;
  isInFamily: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<Task>) => Promise<void>;
  onDelete: () => void;
  onTitleClick: (e: React.MouseEvent) => void;
  onToggleStatus: () => void;
  onConvertToObjective?: (targetGoalId: string | null) => void;
  onMarkRecurringCompletedToday?: () => void;
  isRecurringCompletedToday?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export const TaskCard = memo(function TaskCard({
  task,
  objectives,
  isSelected,
  isInFamily,
  isEditing,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onTitleClick,
  onToggleStatus,
  onConvertToObjective,
  onMarkRecurringCompletedToday,
  isRecurringCompletedToday = false,
  onDragStart,
}: TaskCardProps) {
  const { t } = useLanguage();
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(
    task.description || "",
  );
  const [editStatus, setEditStatus] = useState(task.status || "not_started");
  const [editPriority, setEditPriority] = useState(task.priority || "medium");
  const [editDueDate, setEditDueDate] = useState(task.due_date || "");
  const [editObjectiveId, setEditObjectiveId] = useState<string | null>(
    task.objective_id,
  );
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [editIsRecurring, setEditIsRecurring] = useState(task.is_recurring);
  const [isLinksExpanded, setIsLinksExpanded] = useState(false);
  const [localDocumentLinks, setLocalDocumentLinks] = useState<
    Array<{ url: string; label: string }>
  >(task.document_links || []);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  useEffect(() => {
    if (isEditing) {
      setEditTitle(task.title);
      setEditDescription(task.description || "");
      setEditStatus(task.status || "not_started");
      setEditPriority(task.priority || "medium");
      setEditDueDate(task.due_date || "");
      setEditObjectiveId(task.objective_id);
      setEditIsRecurring(task.is_recurring);
    }
  }, [isEditing, task]);

  useEffect(() => {
    setLocalDocumentLinks(task.document_links || []);
  }, [task.document_links]);

  const handleSave = async () => {
    await onSave({
      title: editTitle,
      description: editDescription,
      status: editStatus,
      priority: editPriority,
      due_date: editIsRecurring ? null : editDueDate || null,
      objective_id: editObjectiveId,
      is_recurring: editIsRecurring,
    });
  };

  const handleSaveLinks = async () => {
    await onSave({ document_links: localDocumentLinks });
  };

  const handleAddLink = () => {
    if (newLinkUrl.trim()) {
      const newLink = {
        url: newLinkUrl.trim(),
        label: newLinkLabel.trim() || newLinkUrl.trim(),
      };
      setLocalDocumentLinks([...localDocumentLinks, newLink]);
      setNewLinkUrl("");
      setNewLinkLabel("");
    }
  };

  const handleRemoveLink = (index: number) => {
    setLocalDocumentLinks(localDocumentLinks.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "task", item: task }),
    );
    onDragStart?.(e);
  };

  const isOrphan = task.objective_id === null;

  const cardClasses = `
    p-4 rounded-xl border transition-all duration-200 group cursor-move
    ${
      isSelected
        ? "bg-purple-50 border-purple-200 shadow-sm dark:bg-purple-900/20 dark:border-purple-700"
        : isInFamily
          ? "bg-purple-50/50 border-purple-200/50 shadow-sm dark:bg-purple-900/10 dark:border-purple-700/50"
          : "glass-card hover:bg-white/80 dark:hover:bg-white/10 hover:border-purple-100 dark:hover:border-purple-900/50 hover:shadow-sm"
    }
  `.trim();

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cardClasses}
      onClick={onSelect}
    >
      {isEditing ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm"
            placeholder="Task title"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm resize-none"
            rows={2}
            placeholder="Description"
          />
          <select
            value={editObjectiveId || ""}
            onChange={(e) => setEditObjectiveId(e.target.value || null)}
            className="input-modern py-1.5 px-2 text-sm"
          >
            <option value="">No Objective (Orphaned)</option>
            {objectives.map((obj) => (
              <option key={obj.id} value={obj.id}>
                {obj.title} {!obj.goal_id ? "(Orphan)" : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="flex-1 input-modern py-1.5 px-2 text-sm"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              className="flex-1 input-modern py-1.5 px-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          {!editIsRecurring && (
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="input-modern py-1.5 px-2 text-sm"
              placeholder="Due Date"
            />
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`recurring-${task.id}`}
              checked={editIsRecurring}
              onChange={(e) => setEditIsRecurring(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label
              htmlFor={`recurring-${task.id}`}
              className="text-sm font-medium text-text-secondary cursor-pointer"
            >
              Recurring task
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="flex-1 btn-primary py-1.5 px-2 text-xs bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelEdit();
              }}
              className="flex-1 btn-secondary py-1.5 px-2 text-xs"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus();
              }}
              className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
              aria-label="Toggle status"
            >
              {task.status === "completed" ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <Circle className="w-6 h-6 text-text-tertiary hover:text-green-600 transition-colors" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <h3
                    className={`font-semibold text-sm leading-snug ${
                      task.status === "completed"
                        ? "text-text-tertiary line-through"
                        : "text-text-primary"
                    } hover:text-accent-primary transition-colors cursor-pointer`}
                    onClick={onTitleClick}
                  >
                    {task.title}
                  </h3>
                  {task.is_recurring && (
                    <span className="inline-flex items-center text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      🔁
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConvertMenu(!showConvertMenu);
                    }}
                    className="text-purple-600 hover:bg-purple-50 p-1.5 rounded-lg transition-colors"
                    title={t("objectives.convert")}
                    aria-label="Convert type"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEdit();
                    }}
                    className="text-purple-600 hover:bg-purple-50 p-1.5 rounded-lg transition-colors"
                    aria-label={t("common.edit")}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {showConvertMenu && (
                    <div
                      className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-border-primary rounded-lg shadow-lg z-10 py-1 min-w-[180px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConvertToObjective?.(null);
                          setShowConvertMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-text-primary"
                      >
                        {t("objectives.convertToObjective")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <p className="text-xs text-text-secondary mb-3 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}

              {/* Recurring task button */}
              {task.is_recurring && (
                <div className="mb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRecurringCompletedToday?.();
                    }}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                      isRecurringCompletedToday
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300"
                    }`}
                  >
                    {isRecurringCompletedToday
                      ? "✓ Completed Today"
                      : "Mark Completed Today"}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-text-tertiary mb-2">
                {!task.is_recurring && task.due_date && (
                  <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border-secondary">
                    <Calendar className="w-3 h-3" />
                    {formatShortDate(new Date(task.due_date))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${getPriorityColor(
                    task.priority || "medium",
                  )}`}
                >
                  {task.priority || "medium"}
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {formatLastEdited(task.last_edited_at)}
                </span>
              </div>

              {/* Document Links (always accessible) */}
              <div className="mt-3 pt-3 border-t border-border-secondary/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLinksExpanded(!isLinksExpanded);
                  }}
                  className="w-full flex items-center justify-between text-xs hover:bg-white/50 dark:hover:bg-white/5 -mx-1 px-2 py-1 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isLinksExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span className="text-text-secondary font-medium">
                      {t("objectives.documentLinks")}
                    </span>
                  </div>
                  <span className="text-text-tertiary">
                    {localDocumentLinks.length}
                  </span>
                </button>

                {isLinksExpanded && (
                  <div
                    className="mt-2 space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Add Link Form */}
                    <div className="space-y-1.5">
                      <input
                        type="url"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder={t("objectives.linkUrlPlaceholder")}
                        className="w-full px-2 py-1.5 bg-white/50 dark:bg-white/5 border border-border-secondary rounded text-xs focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newLinkLabel}
                          onChange={(e) => setNewLinkLabel(e.target.value)}
                          placeholder={t("objectives.linkLabelPlaceholder")}
                          className="flex-1 min-w-0 px-2 py-1.5 bg-white/50 dark:bg-white/5 border border-border-secondary rounded text-xs focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                        />
                        <button
                          onClick={handleAddLink}
                          disabled={!newLinkUrl.trim()}
                          className="flex items-center gap-1 px-2 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Add link"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Links List */}
                    {localDocumentLinks.length > 0 && (
                      <div className="space-y-1.5">
                        {localDocumentLinks.map((link, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 px-2 py-1.5 bg-white/50 dark:bg-white/5 rounded border border-border-secondary group/link hover:border-purple-300 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-purple-600 flex-shrink-0" />
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 min-w-0 text-xs text-purple-600 hover:text-purple-700 hover:underline truncate"
                              onClick={(e) => e.stopPropagation()}
                              title={link.url}
                            >
                              {link.label}
                            </a>
                            <button
                              onClick={() => handleRemoveLink(index)}
                              className="flex-shrink-0 p-0.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover/link:opacity-100 transition-opacity"
                              aria-label="Remove link"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Save Button */}
                    {JSON.stringify(localDocumentLinks) !==
                      JSON.stringify(task.document_links || []) && (
                      <button
                        onClick={handleSaveLinks}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        {t("objectives.saveChanges")}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isOrphan && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-orange-500 bg-orange-50 w-fit px-1.5 py-0.5 rounded border border-orange-100">
                  <Link2 className="w-3 h-3" />
                  Orphaned
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
