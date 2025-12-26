import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Flag, Link2 } from 'lucide-react';
import { createIsInSelectedFamily } from '../../utils/familyTree';

interface Objective {
  id: string;
  goal_id: string | null;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  order: number;
}

interface Goal {
  id: string;
  title: string;
  vision_id: string | null;
}

interface ObjectivesKanbanProps {
  selectedVisionId: string | null;
  selectedGoalId: string | null;
  selectedObjectiveId: string | null;
  selectedTaskId: string | null;
  onSelectObjective: (objectiveId: string | null) => void;
  highlightedItemId?: string | null;
}

const STATUS_COLUMNS = [
  { id: 'not_started', label: 'Not Started', color: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100' },
] as const;

export default function ObjectivesKanban({ selectedVisionId, selectedGoalId, selectedObjectiveId, selectedTaskId, onSelectObjective, highlightedItemId }: ObjectivesKanbanProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<string | null>(null);
  const [draggedOverStatus, setDraggedOverStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Scroll to highlighted card when it changes
  useEffect(() => {
    if (highlightedItemId && cardRefs.current[highlightedItemId]) {
      setTimeout(() => {
        cardRefs.current[highlightedItemId]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }, 200);
    }
  }, [highlightedItemId, objectives]);

  const loadData = async () => {
    setLoading(true);
    const [objectivesResult, goalsResult, tasksResult] = await Promise.all([
      supabase
        .from('objectives')
        .select('*')
        .eq('user_id', user!.id)
        .order('order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase.from('goals').select('id, title, vision_id').eq('user_id', user!.id),
      supabase.from('tasks').select('id, objective_id').eq('user_id', user!.id),
    ]);

    if (objectivesResult.data) {
      setObjectives(objectivesResult.data);
    }
    if (goalsResult.data) {
      setGoals(goalsResult.data);
    }
    if (tasksResult.data) {
      setTasks(tasksResult.data);
    }
    setLoading(false);
  };

  // Check if there's any selection
  const hasSelection = selectedVisionId || selectedGoalId || selectedObjectiveId || selectedTaskId;
  
  // Create family filter function
  const isInSelectedFamily = createIsInSelectedFamily(
    {
      visionId: selectedVisionId,
      goalId: selectedGoalId,
      objectiveId: selectedObjectiveId,
      taskId: selectedTaskId,
    },
    goals,
    objectives,
    tasks
  );

  const isObjectiveRelated = (objective: Objective): boolean => {
    // If no selection, show all
    if (!hasSelection) return true;
    
    // Use family filtering logic
    return isInSelectedFamily('objective', objective.id);
  };

  const handleDragStart = (objectiveId: string, status: string) => {
    setDraggedItem(objectiveId);
    setDraggedOverStatus(status);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent, objectiveId: string, status: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem !== objectiveId) {
      setDraggedOverItem(objectiveId);
      setDraggedOverStatus(status);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverItem(null);
    setDraggedOverStatus(null);
    setIsDragging(false);
  };

  const handleDrop = async (targetObjectiveId: string | null, targetStatus: string) => {
    if (!draggedItem || !draggedOverStatus) return;

    const draggedObjective = objectives.find(o => o.id === draggedItem);
    if (!draggedObjective) return;

    const sameStatus = draggedObjective.status === targetStatus;
    
    if (sameStatus && targetObjectiveId) {
      // Vertical reordering within the same column
      const statusObjectives = objectives.filter(o => o.status === targetStatus).sort((a, b) => a.order - b.order);
      const targetIndex = statusObjectives.findIndex(o => o.id === targetObjectiveId);
      const draggedIndex = statusObjectives.findIndex(o => o.id === draggedItem);
      
      if (targetIndex === -1 || draggedIndex === -1) return;
      
      // Calculate new order values
      const newObjectives = [...statusObjectives];
      newObjectives.splice(draggedIndex, 1);
      newObjectives.splice(targetIndex, 0, draggedObjective);
      
      // Update orders
      const updates = newObjectives.map((objective, index) => ({
        id: objective.id,
        order: index
      }));
      
      // Batch update orders
      for (const update of updates) {
        await supabase
          .from('objectives')
          .update({ order: update.order })
          .eq('id', update.id);
      }
    } else {
      // Status change (horizontal movement)
      const statusObjectives = objectives.filter(o => o.status === targetStatus).sort((a, b) => a.order - b.order);
      const newOrder = statusObjectives.length > 0 ? Math.max(...statusObjectives.map(o => o.order)) + 1 : 0;
      
      await supabase
        .from('objectives')
        .update({ status: targetStatus, order: newOrder })
        .eq('id', draggedItem);
    }

    setDraggedItem(null);
    setDraggedOverItem(null);
    setDraggedOverStatus(null);
    setIsDragging(false);
    loadData();
  };

  const getObjectivesByStatus = (status: string) => {
    return objectives.filter((obj) => obj.status === status);
  };

  const getGoalTitle = (goalId: string | null) => {
    if (!goalId) return null;
    const goal = goals.find((g) => g.id === goalId);
    return goal?.title;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUS_COLUMNS.map((column) => (
        <div
          key={column.id}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!draggedOverItem) {
              handleDrop(null, column.id);
            }
          }}
          className="flex flex-col"
        >
          <div className={`${column.color} px-4 py-2 rounded-t-lg border-x border-t border-white/20 dark:border-white/10`}>
            <h3 className="font-semibold">{column.label}</h3>
            <p className="text-sm opacity-80">
              {getObjectivesByStatus(column.id).length} objectives
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-b-lg min-h-[200px] space-y-3 border border-white/20 dark:border-white/10">
            {getObjectivesByStatus(column.id)
              .sort((a, b) => a.order - b.order)
              .map((objective) => {
              const isSelected = selectedObjectiveId === objective.id;
              const isRelated = isObjectiveRelated(objective);
              const isDragged = draggedItem === objective.id;
              const isDraggedOver = draggedOverItem === objective.id && draggedOverStatus === column.id;
              
              const isHighlighted = highlightedItemId === objective.id;
              
              return (
              <div
                key={objective.id}
                ref={(el) => { cardRefs.current[objective.id] = el; }}
                draggable
                onDragStart={() => handleDragStart(objective.id, column.id)}
                onDragOver={(e) => handleDragOver(e, objective.id, column.id)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDrop(objective.id, column.id);
                }}
                onClick={(e) => {
                  // Only select if not dragging
                  if (!isDragging && !draggedItem) {
                    e.stopPropagation();
                    onSelectObjective(isSelected ? null : objective.id);
                  }
                }}
                className={`bg-white dark:bg-white/10 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 cursor-pointer hover:shadow-md transition-all ${
                  isRelated ? 'opacity-100' : 'opacity-10'
                } ${isSelected ? 'ring-2 ring-green-500 ring-offset-2' : ''} ${
                  isDragged ? 'opacity-50' : ''
                } ${isDraggedOver ? 'border-t-4 border-t-green-500' : ''} ${
                  isHighlighted ? 'ring-4 ring-green-400 ring-offset-2 dark:ring-offset-gray-900 animate-pulse shadow-lg shadow-green-500/30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 
                    className="font-medium text-gray-900 dark:text-white flex-1 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/objectives', { 
                        state: { 
                          selectObjective: objective.id,
                          timestamp: Date.now() // Ensure each navigation is unique
                        } 
                      });
                    }}
                  >
                    {objective.title}
                  </h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(
                      objective.priority
                    )}`}
                  >
                    <Flag className="w-3 h-3 mr-1" />
                    {objective.priority}
                  </span>
                </div>
                {objective.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                    {objective.description}
                  </p>
                )}
                {objective.goal_id ? (
                  <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    {getGoalTitle(objective.goal_id)}
                  </div>
                ) : (
                  <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Orphaned
                  </div>
                )}
              </div>
            );
            })}
            {getObjectivesByStatus(column.id).length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                No objectives in this status
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
