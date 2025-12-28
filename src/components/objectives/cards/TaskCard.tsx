import { useState, useEffect } from 'react';
import {
  Edit2,
  Trash2,
  Calendar,
  Save,
  X,
  Link2,
  Flag,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Task, Objective } from '../types';
import { formatLastEdited, getPriorityColor } from '../utils';

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
  onMarkRecurringCompletedToday?: () => void;
  isRecurringCompletedToday?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function TaskCard({
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
  onMarkRecurringCompletedToday,
  isRecurringCompletedToday = false,
  onDragStart,
}: TaskCardProps) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.due_date || '');
  const [editObjectiveId, setEditObjectiveId] = useState<string | null>(task.objective_id);
  const [editNotes, setEditNotes] = useState(task.notes || '');
  const [editIsRecurring, setEditIsRecurring] = useState(task.is_recurring);
  const [isExpanded, setIsExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(task.notes || '');

  useEffect(() => {
    if (isEditing) {
      setEditTitle(task.title);
      setEditPriority(task.priority);
      setEditDueDate(task.due_date || '');
      setEditObjectiveId(task.objective_id);
      setEditNotes(task.notes || '');
      setEditIsRecurring(task.is_recurring);
    }
  }, [isEditing, task]);

  useEffect(() => {
    setLocalNotes(task.notes || '');
  }, [task.notes]);

  const handleSave = async () => {
    await onSave({
      title: editTitle,
      priority: editPriority,
      due_date: editIsRecurring ? null : (editDueDate || null),
      objective_id: editObjectiveId,
      notes: editNotes,
      is_recurring: editIsRecurring,
    });
  };

  const handleSaveNotes = async () => {
    await onSave({ notes: localNotes });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'task', item: task }));
    onDragStart?.(e);
  };

  const isOrphan = task.objective_id === null;

  const cardClasses = `
    glass-card p-4 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-md transition-all duration-200 cursor-pointer
    ${isSelected
      ? 'bg-purple-50 border-2 border-purple-200 shadow-sm dark:bg-purple-900/20 dark:border-purple-700'
      : isInFamily
      ? 'bg-purple-50/50 border border-purple-200/50 shadow-sm dark:bg-purple-900/10 dark:border-purple-700/50'
      : 'border border-white/40 dark:border-white/10'
    }
  `.trim();

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
      className={cardClasses}
    >
      {isEditing ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-modern py-1.5 px-3 text-sm"
            placeholder="Task title"
          />
          <select
            value={editObjectiveId || ''}
            onChange={(e) => setEditObjectiveId(e.target.value || null)}
            className="input-modern py-1.5 px-3 text-sm"
          >
            <option value="">No Objective (Orphaned)</option>
            {objectives.map((obj) => (
              <option key={obj.id} value={obj.id}>
                {obj.title} {!obj.goal_id ? '(Orphan)' : ''}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Task['priority'])}
              className="flex-1 input-modern py-1.5 px-3 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="flex-1 input-modern py-1.5 px-3 text-sm"
              disabled={editIsRecurring}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`recurring-${task.id}`}
              checked={editIsRecurring}
              onChange={(e) => setEditIsRecurring(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor={`recurring-${task.id}`} className="text-sm font-medium text-text-secondary cursor-pointer">
              Recurring task (e.g., daily habits)
            </label>
          </div>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notes / Subtasks..."
            className="input-modern py-1.5 px-3 text-sm resize-none"
            rows={4}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 btn-primary py-1.5 px-3 text-sm bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="flex-1 btn-secondary py-1.5 px-3 text-sm"
            >
              <X className="w-4 h-4" />
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
            >
              {task.status === 'completed' ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <Circle className="w-6 h-6 text-text-tertiary hover:text-green-600 transition-colors" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3
                  className={`flex-1 font-semibold text-sm leading-snug ${
                    task.status === 'completed' ? 'text-text-tertiary line-through' : 'text-text-primary'
                  } hover:text-accent-primary transition-colors cursor-pointer`}
                  onClick={onTitleClick}
                >
                  {task.title}
                </h3>
              </div>

              {task.is_recurring && (
                <div className="mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRecurringCompletedToday?.();
                    }}
                    className={`w-full text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${
                      isRecurringCompletedToday
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
                    }`}
                  >
                    {isRecurringCompletedToday ? '✓ Completed Today' : 'Mark Completed Today'}
                  </button>
                </div>
              )}

              <div className="flex items-center flex-wrap gap-2 mb-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  <Flag className="w-3 h-3 mr-1" />
                  {task.priority}
                </span>
                {!task.is_recurring && task.due_date && (
                  <span className="text-xs text-text-secondary flex items-center gap-1 bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border-secondary">
                    <Calendar className="w-3 h-3" />
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
                {isOrphan && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                    <Link2 className="w-3 h-3" />
                    Orphaned
                  </span>
                )}
                <span className="text-[10px] text-text-tertiary ml-auto">{formatLastEdited(task.last_edited_at)}</span>
              </div>

              {task.is_recurring && (
                <div className="mt-2 pt-2 border-t border-border-secondary/50">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-200">
                    🔁 Recurring
                  </span>
                </div>
              )}

              {(task.notes || isExpanded) && (
                <div className="mt-3 pt-3 border-t border-border-secondary/50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-2 hover:text-text-primary transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Notes & Subtasks
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={localNotes}
                        onChange={(e) => setLocalNotes(e.target.value)}
                        placeholder="Add notes or subtasks here..."
                        className="w-full px-3 py-2 bg-white/50 dark:bg-white/5 border border-border-secondary rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-y"
                        rows={4}
                      />
                      {localNotes !== task.notes && (
                        <button
                          onClick={handleSaveNotes}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors shadow-md shadow-purple-500/20"
                        >
                          <Save className="w-3 h-3" />
                          Save Notes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                className="text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


