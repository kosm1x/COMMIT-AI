import { useState, useEffect } from 'react';
import { Edit2, Trash2, Calendar, Save, X, Link2, ChevronDown, ChevronRight, CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { Objective, Goal, Task } from '../types';
import { formatLastEdited, getPriorityColor } from '../utils';
import { formatShortDate } from '../../../utils/trackingStats';
import { useLanguage } from '../../../contexts/LanguageContext';

interface ObjectiveCardProps {
  objective: Objective;
  goals: Goal[]; // All goals (including orphans) for the dropdown
  isSelected: boolean;
  isInFamily: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<Objective>) => Promise<void>;
  onDelete: () => void;
  onTitleClick: (e: React.MouseEvent) => void;
  onToggleStatus: () => void;
  onConvertToGoal?: (targetVisionId: string | null) => void;
  onConvertToTask?: (targetObjectiveId: string | null) => void;
  onDragStart?: (e: React.DragEvent) => void;
  // Task count display
  taskCount?: { total: number; completed: number };
  // Expandable tasks
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  tasks?: Task[];
}

export function ObjectiveCard({
  objective,
  goals,
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
  onConvertToGoal,
  onConvertToTask,
  onDragStart,
  taskCount,
  isExpanded = false,
  onToggleExpand,
  tasks = [],
}: ObjectiveCardProps) {
  const { t } = useLanguage();
  const [editTitle, setEditTitle] = useState(objective.title);
  const [editDescription, setEditDescription] = useState(objective.description);
  const [editStatus, setEditStatus] = useState(objective.status);
  const [editPriority, setEditPriority] = useState(objective.priority);
  const [editTargetDate, setEditTargetDate] = useState(objective.target_date || '');
  const [editGoalId, setEditGoalId] = useState<string | null>(objective.goal_id);
  const [showConvertMenu, setShowConvertMenu] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(objective.title);
      setEditDescription(objective.description);
      setEditStatus(objective.status);
      setEditPriority(objective.priority);
      setEditTargetDate(objective.target_date || '');
      setEditGoalId(objective.goal_id);
    }
  }, [isEditing, objective]);

  const handleSave = async () => {
    await onSave({
      title: editTitle,
      description: editDescription,
      status: editStatus,
      priority: editPriority,
      target_date: editTargetDate || null,
      goal_id: editGoalId,
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'objective', item: objective }));
    onDragStart?.(e);
  };

  const isOrphan = objective.goal_id === null;

  const cardClasses = `
    p-4 rounded-xl border transition-all duration-200 group cursor-move
    ${isSelected
      ? 'bg-green-50 border-green-200 shadow-sm dark:bg-green-900/20 dark:border-green-700'
      : isInFamily
      ? 'bg-green-50/50 border-green-200/50 shadow-sm dark:bg-green-900/10 dark:border-green-700/50'
      : 'glass-card hover:bg-white/80 dark:hover:bg-white/10 hover:border-green-100 dark:hover:border-green-900/50 hover:shadow-sm'
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
            placeholder="Objective title"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm resize-none"
            rows={2}
            placeholder="Description"
          />
          <select
            value={editGoalId || ''}
            onChange={(e) => setEditGoalId(e.target.value || null)}
            className="input-modern py-1.5 px-2 text-sm"
          >
            <option value="">No Goal (Orphaned)</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title} {!goal.vision_id ? '(Orphan)' : ''}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as Objective['status'])}
              className="flex-1 input-modern py-1.5 px-2 text-sm"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Objective['priority'])}
              className="flex-1 input-modern py-1.5 px-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <input
            type="date"
            value={editTargetDate}
            onChange={(e) => setEditTargetDate(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm"
            placeholder="Target Date"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="flex-1 btn-primary py-1.5 px-2 text-xs bg-green-600 hover:bg-green-700"
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
            >
              {objective.status === 'completed' ? (
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
                      objective.status === 'completed' ? 'text-text-tertiary line-through' : 'text-text-primary'
                    } hover:text-accent-primary transition-colors cursor-pointer`}
                    onClick={onTitleClick}
                  >
                    {objective.title}
                  </h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConvertMenu(!showConvertMenu);
                    }}
                    className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors"
                    title={t('objectives.convert')}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEdit();
                    }}
                    className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
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
                          onConvertToGoal?.(null);
                          setShowConvertMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-text-primary"
                      >
                        {t('objectives.convertToGoal')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConvertToTask?.(null);
                          setShowConvertMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-text-primary"
                      >
                        {t('objectives.convertToTask')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {objective.description && (
                <p className="text-xs text-text-secondary mb-3 line-clamp-2 leading-relaxed">
                  {objective.description}
                </p>
              )}
              <div className="flex items-center justify-between text-[10px] text-text-tertiary mb-2">
                {objective.target_date && (
                  <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border-secondary">
                    <Calendar className="w-3 h-3" />
                    {formatShortDate(new Date(objective.target_date))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${getPriorityColor(
                    objective.priority
                  )}`}
                >
                  {objective.priority}
                </span>
                <span className="text-[10px] text-text-tertiary">{formatLastEdited(objective.last_edited_at)}</span>
              </div>

              {/* Task count progress */}
              {taskCount && taskCount.total > 0 && (
                <div className="mt-3 pt-3 border-t border-border-secondary/50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand?.();
                    }}
                    className="w-full flex items-center justify-between text-xs hover:bg-white/50 dark:bg-white/5 -mx-1 px-2 py-1 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span className="text-text-secondary font-medium">Tasks</span>
                    </div>
                    <span className="text-text-tertiary">
                      {taskCount.completed} / {taskCount.total}
                    </span>
                  </button>
                  <div className="mt-2 w-full bg-border-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        taskCount.completed === taskCount.total
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${(taskCount.completed / taskCount.total) * 100}%`,
                      }}
                    />
                  </div>

                  {isExpanded && tasks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-2 text-xs bg-white/50 dark:bg-white/5 p-2 rounded-lg border border-white/50"
                        >
                          <div className="mt-0.5">
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-text-tertiary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${task.status === 'completed' ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}>
                              {task.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
}

