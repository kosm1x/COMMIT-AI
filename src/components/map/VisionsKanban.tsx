import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Calendar, Eye } from 'lucide-react';
import { createIsInSelectedFamily } from '../../utils/familyTree';

interface Vision {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  target_date: string | null;
  order: number;
}

const getStatusColumns = (t: (key: string) => string) => [
  { id: 'not_started', label: t('map.notStarted'), color: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' },
  { id: 'in_progress', label: t('map.inProgress'), color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100' },
  { id: 'on_hold', label: t('map.onHold'), color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100' },
  { id: 'completed', label: t('map.completed'), color: 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100' },
] as const;

interface VisionsKanbanProps {
  selectedVisionId: string | null;
  selectedGoalId: string | null;
  selectedObjectiveId: string | null;
  selectedTaskId: string | null;
  onSelectVision: (visionId: string | null) => void;
  highlightedItemId?: string | null;
}

export default function VisionsKanban({ selectedVisionId, selectedGoalId, selectedObjectiveId, selectedTaskId, onSelectVision, highlightedItemId }: VisionsKanbanProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const STATUS_COLUMNS = getStatusColumns(t);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<string | null>(null);
  const [draggedOverStatus, setDraggedOverStatus] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (user) {
      loadVisions();
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
  }, [highlightedItemId, visions]);

  const loadVisions = async () => {
    setLoading(true);
    const [visionsResult, goalsResult, objectivesResult, tasksResult] = await Promise.all([
      supabase
        .from('visions')
        .select('*')
        .eq('user_id', user!.id)
        .order('order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase.from('goals').select('id, vision_id').eq('user_id', user!.id),
      supabase.from('objectives').select('id, goal_id').eq('user_id', user!.id),
      supabase.from('tasks').select('id, objective_id').eq('user_id', user!.id),
    ]);

    if (visionsResult.data) {
      setVisions(visionsResult.data);
    }
    if (goalsResult.data) {
      setGoals(goalsResult.data);
    }
    if (objectivesResult.data) {
      setObjectives(objectivesResult.data);
    }
    if (tasksResult.data) {
      setTasks(tasksResult.data);
    }
    setLoading(false);
  };

  const handleDragStart = (visionId: string, status: string) => {
    setDraggedItem(visionId);
    setDraggedOverStatus(status);
  };

  const handleDragOver = (e: React.DragEvent, visionId: string, status: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem !== visionId) {
      setDraggedOverItem(visionId);
      setDraggedOverStatus(status);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverItem(null);
  };

  const handleDrop = async (targetVisionId: string | null, targetStatus: string) => {
    if (!draggedItem || !draggedOverStatus) return;

    const draggedVision = visions.find(v => v.id === draggedItem);
    if (!draggedVision) return;

    const sameStatus = draggedVision.status === targetStatus;
    
    if (sameStatus && targetVisionId) {
      // Vertical reordering within the same column
      const statusVisions = visions.filter(v => v.status === targetStatus).sort((a, b) => a.order - b.order);
      const targetIndex = statusVisions.findIndex(v => v.id === targetVisionId);
      const draggedIndex = statusVisions.findIndex(v => v.id === draggedItem);
      
      if (targetIndex === -1 || draggedIndex === -1) return;
      
      // Calculate new order values
      const newVisions = [...statusVisions];
      newVisions.splice(draggedIndex, 1);
      newVisions.splice(targetIndex, 0, draggedVision);
      
      // Update orders
      const updates = newVisions.map((vision, index) => ({
        id: vision.id,
        order: index
      }));
      
      // Batch update orders
      for (const update of updates) {
        await supabase
          .from('visions')
          .update({ order: update.order })
          .eq('id', update.id);
      }
    } else {
      // Status change (horizontal movement)
      const statusVisions = visions.filter(v => v.status === targetStatus).sort((a, b) => a.order - b.order);
      const newOrder = statusVisions.length > 0 ? Math.max(...statusVisions.map(v => v.order)) + 1 : 0;
      
      await supabase
        .from('visions')
        .update({ status: targetStatus, order: newOrder })
        .eq('id', draggedItem);
    }

    setDraggedItem(null);
    setDraggedOverItem(null);
    setDraggedOverStatus(null);
    loadVisions();
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

  const getVisionsByStatus = (status: string) => {
    let filteredVisions = visions.filter((vision) => vision.status === status);
    
    // If there's a selection, only show family members
    if (hasSelection) {
      filteredVisions = filteredVisions.filter(vision => isInSelectedFamily('vision', vision.id));
    }
    
    return filteredVisions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
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
              {getVisionsByStatus(column.id).length} {t('map.visions')}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-b-lg min-h-[200px] space-y-3 border border-white/20 dark:border-white/10">
            {getVisionsByStatus(column.id)
              .sort((a, b) => a.order - b.order)
              .map((vision) => {
              const isSelected = selectedVisionId === vision.id;
              const isRelated = hasSelection ? isInSelectedFamily('vision', vision.id) : true;
              const isDragged = draggedItem === vision.id;
              const isDraggedOver = draggedOverItem === vision.id && draggedOverStatus === column.id;
              
              const isHighlighted = highlightedItemId === vision.id;
              
              return (
              <div
                key={vision.id}
                ref={(el) => { cardRefs.current[vision.id] = el; }}
                draggable
                onDragStart={() => handleDragStart(vision.id, column.id)}
                onDragOver={(e) => handleDragOver(e, vision.id, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDrop(vision.id, column.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectVision(isSelected ? null : vision.id);
                }}
                className={`bg-white dark:bg-white/10 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 cursor-move hover:shadow-md transition-all ${
                  isRelated ? 'opacity-100' : 'opacity-10'
                } ${isSelected ? 'ring-2 ring-amber-500 ring-offset-2' : ''} ${
                  isDragged ? 'opacity-50' : ''
                } ${isDraggedOver ? 'border-t-4 border-t-amber-500' : ''} ${
                  isHighlighted ? 'ring-4 ring-amber-400 ring-offset-2 dark:ring-offset-gray-900 animate-pulse shadow-lg shadow-amber-500/30' : ''
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <h4 
                    className="font-medium text-gray-900 dark:text-white flex-1 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/vision', { state: { selectVision: vision.id } });
                    }}
                  >
                    {vision.title}
                  </h4>
                </div>
                {vision.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                    {vision.description}
                  </p>
                )}
                {vision.target_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(vision.target_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
            })}
            {getVisionsByStatus(column.id).length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                {t('map.noVisionsInStatus')}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
