import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Vision, Goal, Objective, Task } from '../types';
import { VisionCard } from '../cards';

interface VisionColumnProps {
  visions: Vision[];
  selectedVisionId: string | null;
  isInSelectedFamily: (type: 'vision' | 'goal' | 'objective' | 'task', id: string) => boolean;
  editingVisionId: string | null;
  setEditingVisionId: (id: string | null) => void;
  onSelectVision: (vision: Vision | null) => void;
  onCreateVision: () => void;
  onUpdateVision: (id: string, updates: Partial<Vision>) => Promise<boolean>;
  onDeleteVision: (id: string, orphanDescendants?: boolean) => Promise<boolean>;
  onUpdateVisionOrder: (visionId: string, newOrder: number) => Promise<void>;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  getVisionDescendantCounts: (id: string) => Promise<{ goals: number; objectives: number; tasks: number }>;
  // For family emphasis calculation
  goals: Goal[];
  objectives: Objective[];
  tasks: Task[];
}

export function VisionColumn({
  visions,
  selectedVisionId,
  isInSelectedFamily,
  editingVisionId,
  setEditingVisionId,
  onSelectVision,
  onCreateVision,
  onUpdateVision,
  onDeleteVision,
  onUpdateVisionOrder,
  onTitleClick,
  getVisionDescendantCounts,
}: VisionColumnProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverId, setDraggedOverId] = useState<string | null>(null);

  // Sort visions by order
  const sortedVisions = [...visions].sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleDragStart = (e: React.DragEvent, visionId: string) => {
    setDraggedItem(visionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, visionId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== visionId) {
      setDraggedOverId(visionId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetVisionId: string) => {
    e.preventDefault();
    setDraggedOverId(null);

    if (!draggedItem || draggedItem === targetVisionId) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = sortedVisions.findIndex(v => v.id === draggedItem);
    const targetIndex = sortedVisions.findIndex(v => v.id === targetVisionId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Reorder the array
    const newVisions = [...sortedVisions];
    const [removed] = newVisions.splice(draggedIndex, 1);
    newVisions.splice(targetIndex, 0, removed);

    // Update orders
    for (let i = 0; i < newVisions.length; i++) {
      if (newVisions[i].order !== i) {
        await onUpdateVisionOrder(newVisions[i].id, i);
      }
    }

    setDraggedItem(null);
  };

  const handleDelete = async (id: string) => {
    // Check for descendants
    const counts = await getVisionDescendantCounts(id);
    const hasDescendants = counts.goals > 0 || counts.objectives > 0 || counts.tasks > 0;

    if (!hasDescendants) {
      // No descendants, simple confirmation
      if (confirm('Delete this vision?')) {
        await onDeleteVision(id);
      }
      return;
    }

    // Has descendants - show detailed confirmation
    const message = `This vision has:\n` +
      `• ${counts.goals} goal${counts.goals !== 1 ? 's' : ''}\n` +
      `• ${counts.objectives} objective${counts.objectives !== 1 ? 's' : ''}\n` +
      `• ${counts.tasks} task${counts.tasks !== 1 ? 's' : ''}\n\n` +
      `Choose an option:\n` +
      `OK = Delete everything (vision and all descendants)\n` +
      `Cancel = Orphan descendants (keep goals/objectives/tasks but remove parent link)`;

    const deleteAll = confirm(message);
    await onDeleteVision(id, !deleteAll); // If deleteAll is false, orphan descendants
  };

  return (
    <div className="flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] flex flex-col glass-card border border-white/40 max-w-full w-full shrink">
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">Vision</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-amber-400">Best Use:</div>
              <p className="leading-relaxed">Long-term aspirations and life direction. Think 5-10 years ahead. Examples: "Become a thought leader in my field" or "Build a sustainable lifestyle".</p>
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent-subtle text-accent-primary">
            {sortedVisions.length}
          </span>
        </div>
        <button
          onClick={onCreateVision}
          className="btn-primary w-full shadow-lg shadow-amber-500/20 bg-amber-600 hover:bg-amber-700 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>Add Vision</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {sortedVisions.map((vision) => (
          <VisionCard
            key={vision.id}
            vision={vision}
            isSelected={selectedVisionId === vision.id}
            isInFamily={isInSelectedFamily('vision', vision.id)}
            isEditing={editingVisionId === vision.id}
            onSelect={() => onSelectVision(vision)}
            onStartEdit={() => setEditingVisionId(vision.id)}
            onCancelEdit={() => setEditingVisionId(null)}
            onSave={async (updates) => {
              await onUpdateVision(vision.id, updates);
              setEditingVisionId(null);
            }}
            onDelete={() => handleDelete(vision.id)}
            onTitleClick={(e) => onTitleClick('vision', vision.title, vision.description, e)}
            onDragStart={(e) => handleDragStart(e, vision.id)}
            onDragEnter={(e) => handleDragEnter(e, vision.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, vision.id)}
            isDragged={draggedItem === vision.id}
            isDraggedOver={draggedOverId === vision.id}
          />
        ))}
        {sortedVisions.length === 0 && (
          <div className="text-xs text-text-tertiary text-center py-8 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
            No visions yet. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}

