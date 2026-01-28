import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Calendar, Target, Eye } from 'lucide-react';
import { createIsInSelectedFamily } from '../../utils/familyTree';
import { sortGoals } from '../../utils/autoSort';

interface Vision {
  id: string;
  title: string;
}

interface Goal {
  id: string;
  vision_id: string | null;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  target_date: string | null;
  order: number;
  visions?: Vision;
}

const getStatusColumns = (t: (key: string) => string) => [
  { id: 'not_started', label: t('map.notStarted'), color: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' },
  { id: 'in_progress', label: t('map.inProgress'), color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' },
  { id: 'on_hold', label: t('map.onHold'), color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100' },
  { id: 'completed', label: t('map.completed'), color: 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100' },
] as const;

interface GoalsKanbanProps {
  selectedVisionId: string | null;
  selectedGoalId: string | null;
  selectedObjectiveId: string | null;
  selectedTaskId: string | null;
  onSelectVision: (visionId: string | null) => void;
  onSelectGoal: (goalId: string | null) => void;
  highlightedItemId?: string | null;
}

export default function GoalsKanban({ selectedVisionId, selectedGoalId, selectedObjectiveId, selectedTaskId, onSelectVision, onSelectGoal, highlightedItemId }: GoalsKanbanProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const STATUS_COLUMNS = getStatusColumns(t);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<string | null>(null);
  const [draggedOverStatus, setDraggedOverStatus] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (user) {
      loadGoals();
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
  }, [highlightedItemId, goals]);

  const hasAppliedSort = useRef(false);

  const loadGoals = async () => {
    setLoading(true);
    const [goalsResult, objectivesResult, tasksResult] = await Promise.all([
      supabase
        .from('goals')
        .select('*, visions(id, title)')
        .eq('user_id', user!.id)
        .order('order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase.from('objectives').select('id, goal_id').eq('user_id', user!.id),
      supabase.from('tasks').select('id, objective_id').eq('user_id', user!.id),
    ]);

    if (goalsResult.data) {
      let loadedGoals = goalsResult.data;
      if (!hasAppliedSort.current) {
        hasAppliedSort.current = true;
        loadedGoals = sortGoals(loadedGoals as any) as any;
      }
      setGoals(loadedGoals);
    }
    if (objectivesResult.data) {
      setObjectives(objectivesResult.data);
    }
    if (tasksResult.data) {
      setTasks(tasksResult.data);
    }
    setLoading(false);
  };

  const handleDragStart = (goalId: string, status: string) => {
    setDraggedItem(goalId);
    setDraggedOverStatus(status);
  };

  const handleDragOver = (e: React.DragEvent, goalId: string, status: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem !== goalId) {
      setDraggedOverItem(goalId);
      setDraggedOverStatus(status);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverItem(null);
  };

  const handleDrop = async (targetGoalId: string | null, targetStatus: string) => {
    if (!draggedItem || !draggedOverStatus) return;

    const draggedGoal = goals.find(g => g.id === draggedItem);
    if (!draggedGoal) return;

    const sameStatus = draggedGoal.status === targetStatus;
    
    if (sameStatus && targetGoalId) {
      // Vertical reordering within the same column
      const statusGoals = goals.filter(g => g.status === targetStatus).sort((a, b) => a.order - b.order);
      const targetIndex = statusGoals.findIndex(g => g.id === targetGoalId);
      const draggedIndex = statusGoals.findIndex(g => g.id === draggedItem);
      
      if (targetIndex === -1 || draggedIndex === -1) return;
      
      // Calculate new order values
      const newGoals = [...statusGoals];
      newGoals.splice(draggedIndex, 1);
      newGoals.splice(targetIndex, 0, draggedGoal);
      
      // Update orders
      const updates = newGoals.map((goal, index) => ({
        id: goal.id,
        order: index
      }));
      
      // Batch update orders
      for (const update of updates) {
        await supabase
          .from('goals')
          .update({ order: update.order })
          .eq('id', update.id);
      }
    } else {
      // Status change (horizontal movement)
      const statusGoals = goals.filter(g => g.status === targetStatus).sort((a, b) => a.order - b.order);
      const newOrder = statusGoals.length > 0 ? Math.max(...statusGoals.map(g => g.order)) + 1 : 0;
      
      await supabase
        .from('goals')
        .update({ status: targetStatus, order: newOrder })
        .eq('id', draggedItem);
    }

    setDraggedItem(null);
    setDraggedOverItem(null);
    setDraggedOverStatus(null);
    loadGoals();
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

  const getGoalsByStatus = (status: string) => {
    let filteredGoals = goals.filter((goal) => goal.status === status);
    
    // If there's a selection, only show family members
    if (hasSelection) {
      filteredGoals = filteredGoals.filter(goal => isInSelectedFamily('goal', goal.id));
    }
    
    // Additionally, if a specific vision is selected, only show goals from that vision
    if (selectedVisionId) {
      filteredGoals = filteredGoals.filter(goal => goal.vision_id === selectedVisionId);
    }
    
    return filteredGoals;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
              {getGoalsByStatus(column.id).length} {t('map.goals')}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-b-lg min-h-[200px] space-y-3 border border-white/20 dark:border-white/10">
            {getGoalsByStatus(column.id)
              .sort((a, b) => a.order - b.order)
              .map((goal) => {
              const isSelected = selectedGoalId === goal.id;
              const isDragged = draggedItem === goal.id;
              const isDraggedOver = draggedOverItem === goal.id && draggedOverStatus === column.id;
              
              const isHighlighted = highlightedItemId === goal.id;
              
              return (
              <div
                key={goal.id}
                ref={(el) => { cardRefs.current[goal.id] = el; }}
                draggable
                onDragStart={() => handleDragStart(goal.id, column.id)}
                onDragOver={(e) => handleDragOver(e, goal.id, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDrop(goal.id, column.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGoal(isSelected ? null : goal.id);
                }}
                className={`bg-white dark:bg-white/10 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 cursor-move hover:shadow-md transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                } ${isDragged ? 'opacity-50' : ''
                } ${isDraggedOver ? 'border-t-4 border-t-blue-500' : ''} ${
                  isHighlighted ? 'ring-4 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900 animate-pulse shadow-lg shadow-blue-500/30' : ''
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <h4 
                    className="font-medium text-gray-900 dark:text-white flex-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/goals', { 
                        state: { 
                          selectGoal: goal.id,
                          timestamp: Date.now() // Ensure each navigation is unique
                        } 
                      });
                    }}
                  >
                    {goal.title}
                  </h4>
                </div>
                {goal.visions && (
                  <div 
                    className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300 mb-2 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVision(goal.visions!.id);
                    }}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{goal.visions.title}</span>
                  </div>
                )}
                {goal.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                    {goal.description}
                  </p>
                )}
                {goal.target_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(goal.target_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
            })}
            {getGoalsByStatus(column.id).length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                {t('map.noGoalsInStatus')}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
