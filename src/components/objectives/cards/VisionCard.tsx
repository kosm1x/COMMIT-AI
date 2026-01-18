import { useState, useEffect } from 'react';
import { Edit2, Trash2, Calendar, Save, X, RefreshCw } from 'lucide-react';
import { formatShortDate } from '../../../utils/trackingStats';
import { Vision } from '../types';
import { getStatusIcon, formatLastEdited } from '../utils';
import { useLanguage } from '../../../contexts/LanguageContext';

interface VisionCardProps {
  vision: Vision;
  isSelected: boolean;
  isInFamily: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<Vision>) => Promise<void>;
  onDelete: () => void;
  onTitleClick: (e: React.MouseEvent) => void;
  onConvertToGoal?: (targetVisionId: string | null) => void;
  // Drag and drop
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragged?: boolean;
  isDraggedOver?: boolean;
}

export function VisionCard({
  vision,
  isSelected,
  isInFamily,
  isEditing,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onTitleClick,
  onConvertToGoal,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDragged = false,
  isDraggedOver = false,
}: VisionCardProps) {
  const { t } = useLanguage();
  const [editTitle, setEditTitle] = useState(vision.title);
  const [editDescription, setEditDescription] = useState(vision.description);
  const [editStatus, setEditStatus] = useState(vision.status);
  const [editTargetDate, setEditTargetDate] = useState(vision.target_date || '');
  const [showConvertMenu, setShowConvertMenu] = useState(false);

  // Sync edit state when editing starts or vision changes
  useEffect(() => {
    if (isEditing) {
      setEditTitle(vision.title);
      setEditDescription(vision.description);
      setEditStatus(vision.status);
      setEditTargetDate(vision.target_date || '');
    }
  }, [isEditing, vision]);

  const handleSave = async () => {
    await onSave({
      title: editTitle,
      description: editDescription,
      status: editStatus,
      target_date: editTargetDate || null,
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart?.(e);
  };

  const cardClasses = `
    p-4 rounded-xl border transition-all duration-200 group cursor-move
    ${isSelected
      ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-400 dark:bg-amber-900/30 dark:border-amber-600 dark:ring-amber-500'
      : isInFamily
      ? 'bg-amber-50/50 border-amber-200 shadow-sm dark:bg-amber-900/10 dark:border-amber-700/50'
      : 'glass-card hover:bg-white/80 dark:hover:bg-white/10 hover:border-amber-100 dark:hover:border-amber-900/50 hover:shadow-sm opacity-60'
    }
    ${isDragged ? 'opacity-50' : ''}
    ${isDraggedOver ? 'border-t-4 border-t-amber-500' : ''}
  `.trim();

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragEnd={onDragLeave}
      onDrop={onDrop}
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
            placeholder="Vision title"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm resize-none"
            rows={2}
            placeholder="Description"
          />
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as Vision['status'])}
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
              className="flex-1 btn-primary py-1.5 px-2 text-xs bg-amber-600 hover:bg-amber-700"
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
              {getStatusIcon(vision.status)}
              <h3
                className="font-semibold text-text-primary text-sm leading-snug hover:text-accent-primary transition-colors cursor-pointer"
                onClick={onTitleClick}
              >
                {vision.title}
              </h3>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConvertMenu(!showConvertMenu);
                }}
                className="text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-colors"
                title={t('objectives.convert')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                className="text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-colors"
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
                </div>
              )}
            </div>
          </div>
          {vision.description && (
            <p className="text-xs text-text-secondary mb-3 line-clamp-2 leading-relaxed">
              {vision.description}
            </p>
          )}
          <div className="flex items-center justify-between text-[10px] text-text-tertiary">
            {vision.target_date && (
              <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border-secondary">
                <Calendar className="w-3 h-3" />
                {formatShortDate(new Date(vision.target_date))}
              </div>
            )}
            <span className="ml-auto">{formatLastEdited(vision.last_edited_at)}</span>
          </div>
        </>
      )}
    </div>
  );
}


