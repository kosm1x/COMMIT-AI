import { useState, useEffect } from 'react';
import { Edit2, Trash2, Calendar, Save, X, Link2, ChevronDown, ChevronRight, Flag } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Goal, Vision, Objective } from '../types';
import { getStatusIcon, formatLastEdited } from '../utils';

interface GoalCardProps {
  goal: Goal;
  visions: Vision[];
  objectives: Objective[]; // All objectives (for dropdown in card edit)
  isSelected: boolean;
  isInFamily: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<Goal>) => Promise<void>;
  onDelete: () => void;
  onTitleClick: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  // Objective count display
  objectiveCount?: { total: number; completed: number };
  // Expandable objectives
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  goalObjectives?: Objective[];
}

export function GoalCard({
  goal,
  visions,
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
  onDragStart,
  objectiveCount,
  isExpanded = false,
  onToggleExpand,
  goalObjectives = [],
}: GoalCardProps) {
  const { t } = useLanguage();
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description);
  const [editStatus, setEditStatus] = useState(goal.status);
  const [editTargetDate, setEditTargetDate] = useState(goal.target_date || '');
  const [editVisionId, setEditVisionId] = useState<string | null>(goal.vision_id);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(goal.title);
      setEditDescription(goal.description);
      setEditStatus(goal.status);
      setEditTargetDate(goal.target_date || '');
      setEditVisionId(goal.vision_id);
    }
  }, [isEditing, goal]);

  const handleSave = async () => {
    await onSave({
      title: editTitle,
      description: editDescription,
      status: editStatus,
      target_date: editTargetDate || null,
      vision_id: editVisionId,
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'goal', item: goal }));
    onDragStart?.(e);
  };

  const isOrphan = goal.vision_id === null;

  const cardClasses = `
    p-4 rounded-xl border transition-all duration-200 group cursor-move
    ${isSelected
      ? 'bg-blue-50 border-blue-200 shadow-sm dark:bg-blue-900/20 dark:border-blue-700'
      : isInFamily
      ? 'bg-blue-50/50 border-blue-200/50 shadow-sm dark:bg-blue-900/10 dark:border-blue-700/50'
      : 'glass-card hover:bg-white/80 dark:hover:bg-white/10 hover:border-blue-100 dark:hover:border-blue-900/50 hover:shadow-sm'
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
            placeholder="Goal title"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm resize-none"
            rows={2}
            placeholder="Description"
          />
          <select
            value={editVisionId || ''}
            onChange={(e) => setEditVisionId(e.target.value || null)}
            className="input-modern py-1.5 px-2 text-sm"
          >
            <option value="">No Vision (Orphaned)</option>
            {visions.map((vision) => (
              <option key={vision.id} value={vision.id}>
                {vision.title}
              </option>
            ))}
          </select>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as Goal['status'])}
            className="input-modern py-1.5 px-2 text-sm"
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
          <input
            type="date"
            value={editTargetDate}
            onChange={(e) => setEditTargetDate(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 btn-primary py-1.5 px-2 text-xs bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="flex-1 btn-secondary py-1.5 px-2 text-xs"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1">
              {getStatusIcon(goal.status)}
              <h3
                className="font-semibold text-text-primary text-sm leading-snug hover:text-accent-primary transition-colors cursor-pointer"
                onClick={onTitleClick}
              >
                {goal.title}
              </h3>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
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
            </div>
          </div>
          {goal.description && (
            <p className="text-xs text-text-secondary mb-3 line-clamp-2 leading-relaxed">
              {goal.description}
            </p>
          )}
          <div className="flex items-center justify-between text-[10px] text-text-tertiary">
            {goal.target_date && (
              <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border-secondary">
                <Calendar className="w-3 h-3" />
                {new Date(goal.target_date).toLocaleDateString()}
              </div>
            )}
            <span className="ml-auto">{formatLastEdited(goal.last_edited_at)}</span>
          </div>
          {isOrphan && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-orange-500 bg-orange-50 w-fit px-1.5 py-0.5 rounded border border-orange-100">
              <Link2 className="w-3 h-3" />
              Orphaned
            </div>
          )}

          {/* Objective count progress */}
          {objectiveCount && objectiveCount.total > 0 && (
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
                  <span className="text-text-secondary font-medium">{t('objectives.objective')}</span>
                </div>
                <span className="text-text-tertiary">
                  {objectiveCount.completed} / {objectiveCount.total}
                </span>
              </button>
              <div className="mt-2 w-full bg-border-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    objectiveCount.completed === objectiveCount.total
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${(objectiveCount.completed / objectiveCount.total) * 100}%`,
                  }}
                />
              </div>

              {isExpanded && goalObjectives.length > 0 && (
                <div className="mt-3 space-y-2">
                  {goalObjectives.map((objective) => (
                    <div
                      key={objective.id}
                      className="flex items-start gap-2 text-xs bg-white/50 dark:bg-white/5 p-2 rounded-lg border border-white/50"
                    >
                      <div className="mt-0.5">
                        {objective.status === 'completed' ? (
                          <Flag className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Flag className="w-3.5 h-3.5 text-text-tertiary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${objective.status === 'completed' ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}>
                          {objective.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

