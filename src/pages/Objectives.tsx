import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Pause,
  Trash2,
  Calendar,
  Flag,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Link2,
  Network,
  Lightbulb,
  Target,
  Eye,
  ListTodo,
} from 'lucide-react';
import { VisionForm, GoalForm, ObjectiveForm, TaskForm } from '../components/objectives';

interface Vision {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  target_date: string | null;
  order: number;
  last_edited_at: string;
}

interface Goal {
  id: string;
  vision_id: string | null;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  target_date: string | null;
  last_edited_at: string;
}

interface Objective {
  id: string;
  goal_id: string | null;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  target_date: string | null;
  last_edited_at: string;
}

interface Task {
  id: string;
  objective_id: string | null;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  completed_at: string | null;
  notes: string;
  last_edited_at: string;
  is_recurring: boolean;
}

interface TaskCount {
  objective_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
}

interface VisionColumnProps {
  visions: Vision[];
  selectedVision: Vision | null;
  selectedGoal: Goal | null;
  selectedObjective: Objective | null;
  selectedTask: Task | null;
  goals: Goal[];
  objectives: Objective[];
  tasks: Task[];
  onSelectVision: (vision: Vision) => void;
  onCreateVision: () => void;
  onUpdateVision: (id: string, updates: Partial<Vision>) => Promise<void>;
  onDeleteVision: (id: string) => Promise<void>;
  editingVision: string | null;
  setEditingVision: (id: string | null) => void;
  formatLastEdited: (dateString: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  onUpdateOrder: (visionId: string, newOrder: number) => Promise<void>;
}

interface GoalsColumnProps {
  goals: Goal[];
  visions: Vision[];
  selectedVision: Vision | null;
  selectedGoal: Goal | null;
  selectedObjective: Objective | null;
  selectedTask: Task | null;
  onSelectGoal: (goal: Goal) => void;
  onCreateGoal: () => void;
  onUpdateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  editingGoal: string | null;
  setEditingGoal: (id: string | null) => void;
  formatLastEdited: (dateString: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  showOrphaned: boolean;
  setShowOrphaned: (show: boolean) => void;
  loadOrphanedGoals: () => Promise<Goal[]>;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  onConvertObjectiveToGoal: (objective: Objective, targetVisionId: string | null) => Promise<void>;
  onConvertTaskToGoal: (task: Task, targetVisionId: string | null) => Promise<void>;
}

interface ObjectivesColumnProps {
  objectives: Objective[];
  goals: Goal[];
  selectedVision: Vision | null;
  selectedGoal: Goal | null;
  selectedObjective: Objective | null;
  selectedTask: Task | null;
  onSelectObjective: (objective: Objective) => void;
  onCreateObjective: () => void;
  onUpdateObjective: (id: string, updates: Partial<Objective>) => Promise<void>;
  onDeleteObjective: (id: string) => Promise<void>;
  editingObjective: string | null;
  setEditingObjective: (id: string | null) => void;
  formatLastEdited: (dateString: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  getPriorityColor: (priority: string) => string;
  showOrphaned: boolean;
  setShowOrphaned: (show: boolean) => void;
  loadOrphanedObjectives: () => Promise<Objective[]>;
  taskCounts: Record<string, { total: number; completed: number }>;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  onConvertGoalToObjective: (goal: Goal, targetGoalId: string | null) => Promise<void>;
  onConvertTaskToObjective: (task: Task, targetGoalId: string | null) => Promise<void>;
}

interface TasksColumnProps {
  tasks: Task[];
  objectives: Objective[];
  orphanedObjectives: Objective[];
  selectedVision: Vision | null;
  selectedGoal: Goal | null;
  selectedObjective: Objective | null;
  selectedTask: Task | null;
  onSelectTask: (task: Task) => void;
  onCreateTask: () => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onToggleStatus: (task: Task) => Promise<void>;
  onMarkRecurringCompletedToday: (taskId: string) => Promise<void>;
  editingTask: string | null;
  setEditingTask: (id: string | null) => void;
  formatLastEdited: (dateString: string) => string;
  getPriorityColor: (priority: string) => string;
  showOrphaned: boolean;
  setShowOrphaned: (show: boolean) => void;
  loadOrphanedTasks: () => Promise<Task[]>;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  onConvertGoalToTask: (goal: Goal, targetObjectiveId: string | null) => Promise<void>;
  onConvertObjectiveToTask: (objective: Objective, targetObjectiveId: string | null) => Promise<void>;
}

interface GoalCardProps {
  goal: Goal;
  visions: Vision[];
  selectedGoal: Goal | null;
  editingGoal: string | null;
  editTitle: string;
  editDescription: string;
  editStatus: string;
  editTargetDate: string;
  editVisionId: string | null;
  setEditTitle: (value: string) => void;
  setEditDescription: (value: string) => void;
  setEditStatus: (value: string) => void;
  setEditTargetDate: (value: string) => void;
  setEditVisionId: (value: string | null) => void;
  onSelectGoal: (goal: Goal) => void;
  startEdit: (goal: Goal) => void;
  saveEdit: (id: string) => Promise<void>;
  setEditingGoal: (id: string | null) => void;
  onDeleteGoal: (id: string) => Promise<void>;
  formatLastEdited: (dateString: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
}

interface ObjectiveCardProps {
  objective: Objective;
  selectedObjective: Objective | null;
  editingObjective: string | null;
  editTitle: string;
  editDescription: string;
  editStatus: string;
  editPriority: string;
  editTargetDate: string;
  editGoalId: string | null;
  setEditTitle: (value: string) => void;
  setEditDescription: (value: string) => void;
  setEditStatus: (value: string) => void;
  setEditPriority: (value: string) => void;
  setEditTargetDate: (value: string) => void;
  setEditGoalId: (value: string | null) => void;
  goals: Goal[];
  onSelectObjective: (objective: Objective) => void;
  startEdit: (objective: Objective) => void;
  saveEdit: (id: string) => Promise<void>;
  setEditingObjective: (id: string | null) => void;
  onDeleteObjective: (id: string) => Promise<void>;
  formatLastEdited: (dateString: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  getPriorityColor: (priority: string) => string;
  taskCounts: Record<string, { total: number; completed: number }>;
  isExpanded: boolean;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  tasks: Task[];
  onToggleExpand: (objectiveId: string) => Promise<void>;
}

interface TaskCardProps {
  task: Task;
  objectives: Objective[];
  expandedTask: string | null;
  setExpandedTask: (id: string | null) => void;
  editingTask: string | null;
  editTitle: string;
  editPriority: string;
  editDueDate: string;
  editObjectiveId: string | null;
  editNotes: string;
  editIsRecurring: boolean;
  setEditTitle: (value: string) => void;
  setEditPriority: (value: string) => void;
  setEditDueDate: (value: string) => void;
  setEditObjectiveId: (value: string | null) => void;
  setEditNotes: (value: string) => void;
  setEditIsRecurring: (value: boolean) => void;
  onToggleStatus: (task: Task) => Promise<void>;
  onMarkRecurringCompletedToday: (taskId: string) => Promise<void>;
  isRecurringCompletedToday: boolean;
  startEdit: (task: Task) => void;
  saveEdit: (id: string) => Promise<void>;
  saveNotes: (id: string, notes: string) => void;
  setEditingTask: (id: string | null) => void;
  onDeleteTask: (id: string) => Promise<void>;
  formatLastEdited: (dateString: string) => string;
  getPriorityColor: (priority: string) => string;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  selectedTask: Task | null;
  onSelectTask: (task: Task) => void;
}

export default function Objectives() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [visions, setVisions] = useState<Vision[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showVisionForm, setShowVisionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingVision, setEditingVision] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editingObjective, setEditingObjective] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [showOrphanedGoals, setShowOrphanedGoals] = useState(true);
  const [showOrphanedObjectives, setShowOrphanedObjectives] = useState(true);
  const [showOrphanedTasks, setShowOrphanedTasks] = useState(true);
  const [orphanedObjectives, setOrphanedObjectives] = useState<Objective[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; completed: number }>>({});
  const [actionModal, setActionModal] = useState<{
    type: 'vision' | 'goal' | 'objective' | 'task' | null;
    title: string;
    description: string;
  }>({ type: null, title: '', description: '' });
  const processedNavStateRef = useRef<string | null>(null);
  const hasAutoSelectedVisionRef = useRef(false);

  // Clear processed nav state when pathname changes to allow re-selection
  useEffect(() => {
    processedNavStateRef.current = null;
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      loadVisions();
      loadOrphanedGoals();
      loadOrphanedObjectives().then(setOrphanedObjectives);
    }
  }, [user]);

  // Auto-select first vision on initial load (only if no navigation state is being processed)
  useEffect(() => {
    // Don't auto-select if navigation state is being processed
    if (processedNavStateRef.current) return;
    
    const state = location.state as { selectVision?: string; selectGoal?: string; selectObjective?: string; selectTask?: string } | null;
    const hasNavState = state && (state.selectVision || state.selectGoal || state.selectObjective || state.selectTask);
    
    if (visions.length > 0 && !selectedVision && !hasAutoSelectedVisionRef.current && !hasNavState) {
      handleSelectVision(visions[0]);
      hasAutoSelectedVisionRef.current = true;
    }
  }, [visions, selectedVision, location.state]);

  useEffect(() => {
    if (selectedVision) {
      loadGoals(selectedVision.id);
    } else {
      setGoals([]);
    }
  }, [selectedVision]);

  useEffect(() => {
    if (objectives.length > 0) {
      loadTaskCounts();
    }
  }, [objectives]);

  useEffect(() => {
    if (selectedGoal) {
      loadObjectives(selectedGoal.id);
    } else {
      loadAllObjectives();
    }
  }, [selectedGoal]);

  useEffect(() => {
    if (selectedObjective) {
      loadTasks(selectedObjective.id);
    } else {
      setTasks([]);
    }
  }, [selectedObjective]);

  // Handle navigation state from Kanban boards
  useEffect(() => {
    const state = location.state as { selectVision?: string; selectGoal?: string; selectObjective?: string; selectTask?: string; timestamp?: number } | null;
    if (!state || !user) return;

    // Create a unique key for this state to avoid reprocessing
    // Include timestamp if present to ensure each navigation is processed
    const stateKey = state.timestamp 
      ? `${state.selectVision || state.selectGoal || state.selectObjective || state.selectTask || ''}-${state.timestamp}`
      : (state.selectVision || state.selectGoal || state.selectObjective || state.selectTask || null);
    if (!stateKey || processedNavStateRef.current === stateKey) return;
    processedNavStateRef.current = stateKey;

    const selectItem = async () => {
      if (state.selectVision) {
        const { data } = await supabase
          .from('visions')
          .select('*')
          .eq('id', state.selectVision)
          .eq('user_id', user.id)
          .single();
        if (data) {
          handleSelectVision(data);
          setEditingVision(data.id);
        }
      } else if (state.selectGoal) {
        const { data } = await supabase
          .from('goals')
          .select('*')
          .eq('id', state.selectGoal)
          .eq('user_id', user.id)
          .single();
        if (data) {
          // Load parent vision if exists
          if (data.vision_id) {
            const { data: visionData } = await supabase
              .from('visions')
              .select('*')
              .eq('id', data.vision_id)
              .single();
            if (visionData) {
              setSelectedVision(visionData);
              await loadGoals(visionData.id);
            }
          } else {
            await loadOrphanedGoals();
          }
          handleSelectGoal(data);
          setEditingGoal(data.id);
        }
      } else if (state.selectObjective) {
        const { data } = await supabase
          .from('objectives')
          .select('*')
          .eq('id', state.selectObjective)
          .eq('user_id', user.id)
          .single();
        if (data) {
          // Load parent goal if exists
          if (data.goal_id) {
            const { data: goalData } = await supabase
              .from('goals')
              .select('*')
              .eq('id', data.goal_id)
              .single();
            if (goalData) {
              // Load parent vision if exists
              if (goalData.vision_id) {
                const { data: visionData } = await supabase
                  .from('visions')
                  .select('*')
                  .eq('id', goalData.vision_id)
                  .single();
                if (visionData) {
                  setSelectedVision(visionData);
                  await loadGoals(visionData.id);
                }
              } else {
                await loadOrphanedGoals();
              }
              handleSelectGoal(goalData);
              await loadObjectives(goalData.id);
            }
          } else {
            // For orphaned objectives, load all objectives so they're visible
            await loadAllObjectives();
            await loadOrphanedObjectives().then(setOrphanedObjectives);
          }
          setSelectedObjective(data);
          setEditingObjective(data.id);
        }
      } else if (state.selectTask) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', state.selectTask)
          .eq('user_id', user.id)
          .single();
        if (data) {
          // Load parent objective if exists
          if (data.objective_id) {
            const { data: objectiveData } = await supabase
              .from('objectives')
              .select('*')
              .eq('id', data.objective_id)
              .single();
            if (objectiveData) {
              // Load parent goal if exists
              if (objectiveData.goal_id) {
                const { data: goalData } = await supabase
                  .from('goals')
                  .select('*')
                  .eq('id', objectiveData.goal_id)
                  .single();
                if (goalData) {
                  // Load parent vision if exists
                  if (goalData.vision_id) {
                    const { data: visionData } = await supabase
                      .from('visions')
                      .select('*')
                      .eq('id', goalData.vision_id)
                      .single();
                    if (visionData) {
                      setSelectedVision(visionData);
                      await loadGoals(visionData.id);
                    }
                  } else {
                    await loadOrphanedGoals();
                  }
                  handleSelectGoal(goalData);
                  await loadObjectives(goalData.id);
                }
              } else {
                await loadOrphanedObjectives().then(setOrphanedObjectives);
              }
              setSelectedObjective(objectiveData);
              await loadTasks(objectiveData.id);
            }
          } else {
            await loadOrphanedTasks();
          }
          setEditingTask(data.id);
        }
      }
      // Clear navigation state after handling
      navigate(location.pathname, { replace: true, state: {} });
      processedNavStateRef.current = null;
    };

    selectItem();
  }, [location.state, user, navigate, location.pathname]);

  const loadVisions = async () => {
    const { data } = await supabase
      .from('visions')
      .select('*')
      .eq('user_id', user!.id)
      .order('order', { ascending: true })
      .order('created_at', { ascending: true });

    if (data) {
      setVisions(data);
    }
  };

  const updateVisionOrder = async (visionId: string, newOrder: number) => {
    await supabase
      .from('visions')
      .update({ order: newOrder })
      .eq('id', visionId);
    loadVisions();
  };

  const loadGoals = async (visionId?: string) => {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', user!.id);

    if (visionId) {
      query = query.eq('vision_id', visionId);
    }

    const { data } = await query.order('created_at', { ascending: true });

    if (data) {
      setGoals(data);
    }
  };

  const loadOrphanedGoals = async () => {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .is('vision_id', null)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true });

    return data || [];
  };

  const loadObjectives = async (goalId: string) => {
    const { data } = await supabase
      .from('objectives')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true });

    if (data) {
      setObjectives(data);
    }
  };

  const loadAllObjectives = async () => {
    const { data } = await supabase
      .from('objectives')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true });

    if (data) {
      setObjectives(data);
    }
  };

  const loadOrphanedObjectives = async () => {
    const { data } = await supabase
      .from('objectives')
      .select('*')
      .is('goal_id', null)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true });

    return data || [];
  };

  const loadTasks = async (objectiveId: string) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('objective_id', objectiveId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true });

    if (data) {
      setTasks(data);
    }
  };

  const loadOrphanedTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .is('objective_id', null)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true });

    return data || [];
  };

  const loadTaskCounts = async () => {
    const objectiveIds = objectives.map(obj => obj.id);

    if (objectiveIds.length === 0) return;

    const { data } = await supabase
      .from('tasks')
      .select('objective_id, status')
      .in('objective_id', objectiveIds)
      .eq('user_id', user!.id);

    if (data) {
      const counts: Record<string, { total: number; completed: number }> = {};

      data.forEach((task: TaskCount) => {
        if (!counts[task.objective_id]) {
          counts[task.objective_id] = { total: 0, completed: 0 };
        }
        counts[task.objective_id].total++;
        if (task.status === 'completed') {
          counts[task.objective_id].completed++;
        }
      });

      setTaskCounts(counts);
    }
  };

  const createVision = async (title: string, description: string, targetDate: string) => {
    const { data } = await supabase
      .from('visions')
      .insert({
        user_id: user!.id,
        title,
        description,
        target_date: targetDate || null,
      })
      .select()
      .single();

    if (data) {
      loadVisions();
      setShowVisionForm(false);
      handleSelectVision(data);
    }
  };

  const updateVision = async (id: string, updates: Partial<Vision>) => {
    const { error } = await supabase.from('visions').update(updates).eq('id', id);

    if (!error) {
      loadVisions();
      setEditingVision(null);
    }
  };

  const deleteVision = async (id: string) => {
    if (!confirm('Delete this vision? Goals will become orphaned.')) return;
    await supabase.from('visions').delete().eq('id', id);
    if (selectedVision?.id === id) {
      setSelectedVision(null);
      setSelectedGoal(null);
      setSelectedObjective(null);
    }
    loadVisions();
  };

  const createGoal = async (title: string, description: string, targetDate: string, visionId: string | null) => {
    const { data } = await supabase
      .from('goals')
      .insert({
        user_id: user!.id,
        title,
        description,
        target_date: targetDate || null,
        vision_id: visionId,
      })
      .select()
      .single();

    if (data) {
      if (visionId) {
        loadGoals(visionId);
      } else {
        loadOrphanedGoals();
      }
      setShowGoalForm(false);
      handleSelectGoal(data);
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const { error } = await supabase.from('goals').update(updates).eq('id', id);

    if (!error) {
      if (selectedVision) {
        loadGoals(selectedVision.id);
      }
      loadOrphanedGoals();
      setEditingGoal(null);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal? Objectives will become orphaned.')) return;
    await supabase.from('goals').delete().eq('id', id);
    if (selectedGoal?.id === id) {
      setSelectedGoal(null);
      setSelectedObjective(null);
    }
    if (selectedVision) {
      loadGoals(selectedVision.id);
    }
    loadOrphanedGoals();
  };

  const createObjective = async (
    title: string,
    description: string,
    priority: string,
    goalId: string | null,
    targetDate: string
  ) => {
    const { data } = await supabase
      .from('objectives')
      .insert({
        goal_id: goalId,
        user_id: user!.id,
        title,
        description,
        priority: priority as 'high' | 'medium' | 'low',
        target_date: targetDate || null,
      })
      .select()
      .single();

    if (data) {
      if (goalId) {
        loadObjectives(goalId);
      } else {
        loadOrphanedObjectives().then(setOrphanedObjectives);
      }
      setShowObjectiveForm(false);
      setSelectedObjective(data);
    }
  };

  const updateObjective = async (id: string, updates: Partial<Objective>) => {
    console.log('Updating objective with:', updates);
    const { error, data } = await supabase.from('objectives').update(updates).eq('id', id).select();
    console.log('Update result - error:', error, 'data:', data);

    if (error) {
      console.error('Error updating objective:', error);
      return;
    }

      if (selectedGoal) {
        loadObjectives(selectedGoal.id);
      }
    loadOrphanedObjectives().then(setOrphanedObjectives);
      setEditingObjective(null);
  };

  const deleteObjective = async (id: string) => {
    if (!confirm('Delete this objective? Tasks will become orphaned.')) return;
    await supabase.from('objectives').delete().eq('id', id);
    if (selectedObjective?.id === id) {
      setSelectedObjective(null);
    }
    if (selectedGoal) {
      loadObjectives(selectedGoal.id);
    }
    loadOrphanedObjectives().then(setOrphanedObjectives);
  };

  const createTask = async (
    title: string,
    priority: string,
    dueDate: string,
    objectiveId: string | null,
    isRecurring: boolean
  ) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        objective_id: objectiveId,
        user_id: user!.id,
        title,
        priority: priority as 'high' | 'medium' | 'low',
        due_date: isRecurring ? null : (dueDate || null),
        is_recurring: isRecurring,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return;
    }

    if (data) {
      if (objectiveId) {
        loadTasks(objectiveId);
      } else {
        loadOrphanedTasks();
      }
      loadTaskCounts();
      setShowTaskForm(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    console.log('Updating task with:', updates);
    const { error, data } = await supabase.from('tasks').update(updates).eq('id', id).select();
    console.log('Update result - error:', error, 'data:', data);

    if (error) {
      console.error('Error updating task:', error);
      return;
    }

      if (selectedObjective) {
        loadTasks(selectedObjective.id);
      }
    loadOrphanedTasks();
      loadTaskCounts();
      setEditingTask(null);
  };

  const toggleTaskStatus = async (task: Task) => {
    // For recurring tasks, don't change status - use markCompletedToday instead
    if (task.is_recurring) {
      await markRecurringTaskCompletedToday(task.id);
      return;
    }
    
    const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
    await updateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const markRecurringTaskCompletedToday = async (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already completed today
    const { data: existing } = await supabase
      .from('task_completions')
      .select('id')
      .eq('task_id', taskId)
      .eq('completion_date', today)
      .eq('user_id', user!.id)
      .single();

    if (existing) {
      // Already completed today, remove the completion
      await supabase
        .from('task_completions')
        .delete()
        .eq('id', existing.id);
    } else {
      // Mark as completed today
      await supabase
        .from('task_completions')
        .insert({
          task_id: taskId,
          user_id: user!.id,
          completion_date: today,
        });
    }

    // Reload tasks to reflect the change
    if (selectedObjective) {
      loadTasks(selectedObjective.id);
    } else {
      loadOrphanedTasks();
    }
  };


  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    await supabase.from('tasks').delete().eq('id', id);
    if (selectedObjective) {
      loadTasks(selectedObjective.id);
    } else {
      loadOrphanedTasks();
    }
    loadTaskCounts();
  };

  // Conversion functions for drag-and-drop
  const convertGoalToObjective = async (goal: Goal, targetGoalId: string | null) => {
    // First, orphan all objectives that belong to this goal
    await supabase
      .from('objectives')
      .update({ goal_id: null })
      .eq('goal_id', goal.id);

    const { data } = await supabase
      .from('objectives')
      .insert({
        goal_id: targetGoalId,
        user_id: user!.id,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        priority: 'medium',
        target_date: goal.target_date,
      })
      .select()
      .single();

    if (data) {
      // Delete the original goal
      await supabase.from('goals').delete().eq('id', goal.id);
      // Reload data
      if (selectedVision) {
        loadGoals(selectedVision.id);
      }
      loadOrphanedGoals();
      if (targetGoalId) {
        loadObjectives(targetGoalId);
      }
      loadOrphanedObjectives().then(setOrphanedObjectives);
    }
  };

  const convertGoalToTask = async (goal: Goal, targetObjectiveId: string | null) => {
    // First, orphan all objectives that belong to this goal
    await supabase
      .from('objectives')
      .update({ goal_id: null })
      .eq('goal_id', goal.id);

    const { data } = await supabase
      .from('tasks')
      .insert({
        objective_id: targetObjectiveId,
        user_id: user!.id,
        title: goal.title,
        notes: goal.description || '',
        status: goal.status,
        priority: 'medium',
        due_date: goal.target_date,
        is_recurring: false,
      })
      .select()
      .single();

    if (data) {
      // Delete the original goal
      await supabase.from('goals').delete().eq('id', goal.id);
      // Reload data
      if (selectedVision) {
        loadGoals(selectedVision.id);
      }
      loadOrphanedGoals();
      if (targetObjectiveId) {
        loadTasks(targetObjectiveId);
      }
      loadOrphanedTasks();
      loadTaskCounts();
      loadOrphanedObjectives().then(setOrphanedObjectives);
    }
  };

  const convertObjectiveToGoal = async (objective: Objective, targetVisionId: string | null) => {
    // First, orphan all tasks that belong to this objective
    await supabase
      .from('tasks')
      .update({ objective_id: null })
      .eq('objective_id', objective.id);

    const { data } = await supabase
      .from('goals')
      .insert({
        vision_id: targetVisionId,
        user_id: user!.id,
        title: objective.title,
        description: objective.description,
        status: objective.status,
        target_date: null,
      })
      .select()
      .single();

    if (data) {
      // Delete the original objective
      await supabase.from('objectives').delete().eq('id', objective.id);
      // Reload data
      if (selectedGoal) {
        loadObjectives(selectedGoal.id);
      }
      loadOrphanedObjectives().then(setOrphanedObjectives);
      if (targetVisionId) {
        loadGoals(targetVisionId);
      }
      loadOrphanedGoals();
      loadOrphanedTasks();
      loadTaskCounts();
    }
  };

  const convertObjectiveToTask = async (objective: Objective, targetObjectiveId: string | null) => {
    // First, orphan all tasks that belong to this objective
    await supabase
      .from('tasks')
      .update({ objective_id: null })
      .eq('objective_id', objective.id);

    const { data } = await supabase
      .from('tasks')
      .insert({
        objective_id: targetObjectiveId,
        user_id: user!.id,
        title: objective.title,
        notes: objective.description || '',
        status: objective.status,
        priority: objective.priority,
        is_recurring: false,
      })
      .select()
      .single();

    if (data) {
      // Delete the original objective
      await supabase.from('objectives').delete().eq('id', objective.id);
      // Reload data
      if (selectedGoal) {
        loadObjectives(selectedGoal.id);
      }
      loadOrphanedObjectives().then(setOrphanedObjectives);
      if (targetObjectiveId) {
        loadTasks(targetObjectiveId);
      }
      loadOrphanedTasks();
      loadTaskCounts();
    }
  };

  const convertTaskToGoal = async (task: Task, targetVisionId: string | null) => {
    const { data } = await supabase
      .from('goals')
      .insert({
        vision_id: targetVisionId,
        user_id: user!.id,
        title: task.title,
        description: task.description || task.notes || '',
        status: task.status,
        target_date: task.due_date,
      })
      .select()
      .single();

    if (data) {
      // Delete the original task
      await supabase.from('tasks').delete().eq('id', task.id);
      // Reload data
      if (selectedObjective) {
        loadTasks(selectedObjective.id);
      }
      loadOrphanedTasks();
      loadTaskCounts();
      if (targetVisionId) {
        loadGoals(targetVisionId);
      }
      loadOrphanedGoals();
    }
  };

  const convertTaskToObjective = async (task: Task, targetGoalId: string | null) => {
    const { data } = await supabase
      .from('objectives')
      .insert({
        goal_id: targetGoalId,
        user_id: user!.id,
        title: task.title,
        description: task.description || task.notes || '',
        status: task.status,
        priority: task.priority,
        target_date: task.due_date,
      })
      .select()
      .single();

    if (data) {
      // Delete the original task
      await supabase.from('tasks').delete().eq('id', task.id);
      // Reload data
      if (selectedObjective) {
        loadTasks(selectedObjective.id);
      }
      loadOrphanedTasks();
      loadTaskCounts();
      if (targetGoalId) {
        loadObjectives(targetGoalId);
      }
      loadOrphanedObjectives().then(setOrphanedObjectives);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'on_hold':
        return <Pause className="w-5 h-5 text-yellow-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
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

  const formatLastEdited = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleTitleClick = (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionModal({ type, title, description });
  };

  const handleCreateMindMap = () => {
    const problemStatement = `${actionModal.title}\n\n${actionModal.description || 'No description provided.'}`;
    navigate('/boards', { state: { viewMode: 'mindmap', problemStatement } });
    setActionModal({ type: null, title: '', description: '' });
  };

  const handleCreateIdea = () => {
    const initialInput = `${actionModal.title}${actionModal.description ? `\n\n${actionModal.description}` : ''}`;
    navigate('/ideate', { state: { initialInput } });
    setActionModal({ type: null, title: '', description: '' });
  };

  // Selection handlers that clear child selections
  // Helper functions to determine which items should be visible based on selection
  // Returns true if item should be visible, false otherwise
  
  // Visions: Always show all, but emphasize the selected one
  const isVisionVisible = (_vision: Vision): boolean => {
    // Always show all visions
    return true;
  };

  const isGoalVisible = (goal: Goal): boolean => {
    // If nothing is selected, show all
    if (!selectedVision && !selectedGoal && !selectedObjective && !selectedTask) return true;
    
    // If this goal is selected, show it
    if (selectedGoal?.id === goal.id) return true;
    
    // If a vision is selected, show all its goals
    if (selectedVision && goal.vision_id === selectedVision.id) return true;
    
    // If an objective is selected and this is its parent goal, show it
    if (selectedObjective) {
      const obj = objectives.find(o => o.id === selectedObjective.id);
      if (obj?.goal_id === goal.id) return true;
    }
    
    // If a task is selected, find its objective -> goal chain
    if (selectedTask) {
      const task = tasks.find(t => t.id === selectedTask.id);
      if (task?.objective_id) {
        const obj = objectives.find(o => o.id === task.objective_id);
        if (obj?.goal_id === goal.id) return true;
      }
    }
    
    return false;
  };

  const isObjectiveVisible = (objective: Objective): boolean => {
    // If nothing is selected, show all
    if (!selectedVision && !selectedGoal && !selectedObjective && !selectedTask) return true;
    
    // If this objective is selected, show it
    if (selectedObjective?.id === objective.id) return true;
    
    // If a goal is selected, show all its objectives
    if (selectedGoal && objective.goal_id === selectedGoal.id) return true;
    
    // If a vision is selected, show objectives under its goals
    if (selectedVision) {
      const visionGoalIds = new Set(goals.filter(g => g.vision_id === selectedVision.id).map(g => g.id));
      if (objective.goal_id && visionGoalIds.has(objective.goal_id)) return true;
    }
    
    // If a task is selected and this is its parent objective, show it
    if (selectedTask) {
      const task = tasks.find(t => t.id === selectedTask.id);
      if (task?.objective_id === objective.id) return true;
    }
    
    return false;
  };

  const isTaskVisible = (task: Task): boolean => {
    // If nothing is selected, show all
    if (!selectedVision && !selectedGoal && !selectedObjective && !selectedTask) return true;
    
    // If this task is selected, show it
    if (selectedTask?.id === task.id) return true;
    
    // If an objective is selected, show all its tasks
    if (selectedObjective && task.objective_id === selectedObjective.id) return true;
    
    // If a goal is selected, show tasks under its objectives
    if (selectedGoal) {
      const goalObjectiveIds = new Set(objectives.filter(o => o.goal_id === selectedGoal.id).map(o => o.id));
      if (task.objective_id && goalObjectiveIds.has(task.objective_id)) return true;
    }
    
    // If a vision is selected, show tasks under its goals' objectives
    if (selectedVision) {
      const visionGoalIds = new Set(goals.filter(g => g.vision_id === selectedVision.id).map(g => g.id));
      const visionObjectiveIds = new Set(
        objectives.filter(o => o.goal_id && visionGoalIds.has(o.goal_id)).map(o => o.id)
      );
      if (task.objective_id && visionObjectiveIds.has(task.objective_id)) return true;
    }
    
    return false;
  };

  const handleSelectVision = (vision: Vision) => {
    setSelectedVision(vision);
    setSelectedGoal(null);
    setSelectedObjective(null);
    setSelectedTask(null);
  };

  const handleSelectGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setSelectedObjective(null);
    setSelectedTask(null);
  };

  const handleSelectObjective = (objective: Objective) => {
    setSelectedObjective(objective);
    setSelectedTask(null);
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
  };

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'vision' | 'goals' | 'objectives' | 'tasks'>('vision');

  const tabs = [
    { id: 'vision' as const, label: 'Vision', icon: Eye, count: visions.length },
    { id: 'goals' as const, label: 'Goals', icon: Target, count: goals.length },
    { id: 'objectives' as const, label: 'Objectives', icon: Flag, count: objectives.length },
    { id: 'tasks' as const, label: 'Tasks', icon: ListTodo, count: tasks.length },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 overflow-hidden pb-4">
      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex gap-1 p-1 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-xl border border-white/40 overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-accent-primary text-white shadow-md'
                : 'text-text-secondary hover:bg-white/50 dark:hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Desktop: All columns side by side, Mobile: Show active tab only */}
      <div className="flex-1 flex gap-4 overflow-x-auto lg:overflow-visible">
      <div className={`${activeTab === 'vision' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-[280px] lg:min-w-0`}>
      <VisionColumn
        visions={visions.filter(isVisionVisible)}
        selectedVision={selectedVision}
        selectedGoal={selectedGoal}
        selectedObjective={selectedObjective}
        selectedTask={selectedTask}
        goals={goals}
        objectives={objectives}
        tasks={tasks}
        onSelectVision={handleSelectVision}
        onCreateVision={() => setShowVisionForm(true)}
        onUpdateVision={updateVision}
        onDeleteVision={deleteVision}
        editingVision={editingVision}
        setEditingVision={setEditingVision}
        formatLastEdited={formatLastEdited}
        getStatusIcon={getStatusIcon}
        onTitleClick={handleTitleClick}
        onUpdateOrder={updateVisionOrder}
      />
      </div>

      <div className={`${activeTab === 'goals' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-[280px] lg:min-w-0`}>
      <GoalsColumn
        goals={goals.filter(isGoalVisible)}
        visions={visions}
        selectedVision={selectedVision}
        selectedGoal={selectedGoal}
        selectedObjective={selectedObjective}
        selectedTask={selectedTask}
        onSelectGoal={handleSelectGoal}
        onCreateGoal={() => setShowGoalForm(true)}
        onUpdateGoal={updateGoal}
        onDeleteGoal={deleteGoal}
        editingGoal={editingGoal}
        setEditingGoal={setEditingGoal}
        formatLastEdited={formatLastEdited}
        getStatusIcon={getStatusIcon}
        showOrphaned={showOrphanedGoals}
        setShowOrphaned={setShowOrphanedGoals}
        loadOrphanedGoals={loadOrphanedGoals}
        onTitleClick={handleTitleClick}
        onConvertObjectiveToGoal={convertObjectiveToGoal}
        onConvertTaskToGoal={convertTaskToGoal}
      />
      </div>

      <div className={`${activeTab === 'objectives' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-[280px] lg:min-w-0`}>
      <ObjectivesColumn
        objectives={objectives.filter(isObjectiveVisible)}
        goals={goals}
        selectedVision={selectedVision}
        selectedGoal={selectedGoal}
        selectedObjective={selectedObjective}
        selectedTask={selectedTask}
        onSelectObjective={handleSelectObjective}
        onCreateObjective={() => setShowObjectiveForm(true)}
        onUpdateObjective={updateObjective}
        onDeleteObjective={deleteObjective}
        editingObjective={editingObjective}
        setEditingObjective={setEditingObjective}
        formatLastEdited={formatLastEdited}
        getStatusIcon={getStatusIcon}
        getPriorityColor={getPriorityColor}
        showOrphaned={showOrphanedObjectives}
        setShowOrphaned={setShowOrphanedObjectives}
        loadOrphanedObjectives={loadOrphanedObjectives}
        taskCounts={taskCounts}
        onTitleClick={handleTitleClick}
        onConvertGoalToObjective={convertGoalToObjective}
        onConvertTaskToObjective={convertTaskToObjective}
      />
      </div>

      <div className={`${activeTab === 'tasks' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-[280px] lg:min-w-0`}>
      <TasksColumn
        tasks={tasks.filter(isTaskVisible)}
        objectives={objectives}
        orphanedObjectives={orphanedObjectives}
        selectedVision={selectedVision}
        selectedGoal={selectedGoal}
        selectedObjective={selectedObjective}
        selectedTask={selectedTask}
        onSelectTask={handleSelectTask}
        onCreateTask={() => setShowTaskForm(true)}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
        onToggleStatus={toggleTaskStatus}
        onMarkRecurringCompletedToday={markRecurringTaskCompletedToday}
        editingTask={editingTask}
        setEditingTask={setEditingTask}
        formatLastEdited={formatLastEdited}
        getPriorityColor={getPriorityColor}
        showOrphaned={showOrphanedTasks}
        setShowOrphaned={setShowOrphanedTasks}
        loadOrphanedTasks={loadOrphanedTasks}
        onTitleClick={handleTitleClick}
        onConvertGoalToTask={convertGoalToTask}
        onConvertObjectiveToTask={convertObjectiveToTask}
      />
      </div>
      </div>

      {showVisionForm && (
        <VisionForm onClose={() => setShowVisionForm(false)} onCreate={createVision} />
      )}
      {showGoalForm && (
        <GoalForm
          onClose={() => setShowGoalForm(false)}
          onCreate={createGoal}
          visions={visions}
          selectedVision={selectedVision}
        />
      )}
      {showObjectiveForm && (
        <ObjectiveForm
          onClose={() => setShowObjectiveForm(false)}
          onCreate={createObjective}
          goals={goals}
          selectedGoal={selectedGoal}
        />
      )}
      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          onCreate={createTask}
          objectives={[...objectives, ...orphanedObjectives]}
          selectedObjective={selectedObjective}
        />
      )}

      {/* Action Selection Modal */}
      {actionModal.type && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-strong rounded-3xl shadow-2xl p-6 border border-border-primary animate-scale-in max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-bold text-text-primary">Create from "{actionModal.title}"</h2>
              <button
                onClick={() => setActionModal({ type: null, title: '', description: '' })}
                className="text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              Choose how you'd like to explore this {actionModal.type}:
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCreateMindMap}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/40 bg-white/50 dark:bg-white/5 hover:bg-white/70 transition-all hover:shadow-md group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Network className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-text-primary">Create Mind Map</div>
                  <div className="text-xs text-text-secondary">Break down into components and relationships</div>
                </div>
              </button>
              <button
                onClick={handleCreateIdea}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/40 bg-white/50 dark:bg-white/5 hover:bg-white/70 transition-all hover:shadow-md group"
              >
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-text-primary">Create Idea</div>
                  <div className="text-xs text-text-secondary">Expand and develop with AI assistance</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VisionColumn({
  visions,
  selectedVision,
  selectedGoal,
  selectedObjective,
  selectedTask,
  goals,
  objectives,
  tasks,
  onSelectVision,
  onCreateVision,
  onUpdateVision,
  onDeleteVision,
  editingVision,
  setEditingVision,
  formatLastEdited,
  getStatusIcon,
  onTitleClick,
  onUpdateOrder,
}: VisionColumnProps) {
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverId, setDraggedOverId] = useState<string | null>(null);

  const startEdit = (vision: Vision) => {
    setEditingVision(vision.id);
    setEditTitle(vision.title);
    setEditDescription(vision.description);
    setEditStatus(vision.status);
    setEditTargetDate(vision.target_date || '');
  };

  // Initialize edit state when editingVision is set externally (e.g., from navigation)
  useEffect(() => {
    if (editingVision) {
      const vision = visions.find(v => v.id === editingVision);
      if (vision) {
        setEditTitle(vision.title);
        setEditDescription(vision.description);
        setEditStatus(vision.status);
        setEditTargetDate(vision.target_date || '');
      }
    }
  }, [editingVision, visions]);

  const saveEdit = async (id: string) => {
    await onUpdateVision(id, {
      title: editTitle,
      description: editDescription,
      status: editStatus as 'not_started' | 'in_progress' | 'completed' | 'on_hold',
      target_date: editTargetDate || null,
    });
  };

  const handleDragStart = (e: React.DragEvent, visionId: string) => {
    e.stopPropagation();
    setDraggedItem(visionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, visionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && draggedItem !== visionId) {
      setDraggedOverId(visionId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetVisionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverId(null);

    if (!draggedItem || draggedItem === targetVisionId) {
      setDraggedItem(null);
      return;
    }

    // Sort visions by order
    const sortedVisions = [...visions].sort((a, b) => (a.order || 0) - (b.order || 0));
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
        await onUpdateOrder(newVisions[i].id, i);
      }
    }

    setDraggedItem(null);
  };

  // Sort visions by order before rendering
  const sortedVisions = [...visions].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Helper to check if a vision is in the selected family (for emphasis)
  const isVisionInSelectedFamily = (vision: Vision): boolean => {
    // If this vision is selected, it's in the family
    if (selectedVision?.id === vision.id) return true;
    
    // If a goal is selected and this is its parent vision, it's in the family
    if (selectedGoal?.vision_id === vision.id) return true;
    
    // If an objective is selected, find its goal's vision
    if (selectedObjective) {
      const obj = objectives.find(o => o.id === selectedObjective.id);
      if (obj?.goal_id) {
        const goal = goals.find(g => g.id === obj.goal_id);
        if (goal?.vision_id === vision.id) return true;
      }
    }
    
    // If a task is selected, find its objective -> goal -> vision chain
    if (selectedTask) {
      const task = tasks.find(t => t.id === selectedTask.id);
      if (task?.objective_id) {
        const obj = objectives.find(o => o.id === task.objective_id);
        if (obj?.goal_id) {
          const goal = goals.find(g => g.id === obj.goal_id);
          if (goal?.vision_id === vision.id) return true;
        }
      }
    }
    
    return false;
  };

  return (
    <div className="flex-1 min-w-[280px] flex flex-col glass-card border border-white/40 overflow-x-visible">
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">Vision</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-amber-400">Best Use:</div>
              <p className="leading-relaxed">Long-term aspirations and life direction. Think 5-10 years ahead. Examples: "Become a thought leader in my field" or "Build a sustainable lifestyle". Visions guide all your goals and provide overarching purpose.</p>
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent-subtle text-accent-primary">
            {sortedVisions.length}
          </span>
        </div>
        <button
          onClick={onCreateVision}
          className="btn-primary w-full shadow-lg shadow-amber-500/20 bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" />
          Add Vision
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {sortedVisions.map((vision: Vision) => {
          const isDragged = draggedItem === vision.id;
          const isDraggedOver = draggedOverId === vision.id;
          
          return (
          <div
            key={vision.id}
            draggable
            onDragStart={(e) => handleDragStart(e, vision.id)}
            onDragEnter={(e) => handleDragEnter(e, vision.id)}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, vision.id)}
            className={`p-4 rounded-xl border transition-all duration-200 group cursor-move ${
              selectedVision?.id === vision.id
          ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-400 dark:bg-amber-900/30 dark:border-amber-600 dark:ring-amber-500'
          : isVisionInSelectedFamily(vision)
          ? 'bg-amber-50/50 border-amber-200 shadow-sm dark:bg-amber-900/10 dark:border-amber-700/50'
          : 'glass-card hover:bg-white/80 dark:hover:bg-white/10 hover:border-amber-100 dark:hover:border-amber-900/50 hover:shadow-sm opacity-60'
            } ${isDragged ? 'opacity-50' : ''} ${isDraggedOver ? 'border-t-4 border-t-amber-500' : ''}`}
            onClick={() => onSelectVision(vision)}
          >
            {editingVision === vision.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input-modern py-1.5 px-2 text-sm"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input-modern py-1.5 px-2 text-sm resize-none"
                  rows={2}
                />
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
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
                    onClick={() => saveEdit(vision.id)}
                    className="flex-1 btn-primary py-1.5 px-2 text-xs bg-amber-600 hover:bg-amber-700"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingVision(null)}
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
                      onClick={(e) => onTitleClick('vision', vision.title, vision.description, e)}
                    >
                      {vision.title}
                    </h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(vision);
                      }}
                      className="text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteVision(vision.id);
                      }}
                      className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {vision.description && (
                  <p className="text-xs text-text-secondary mb-3 line-clamp-2 leading-relaxed">{vision.description}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                  {vision.target_date && (
                    <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border-secondary">
                      <Calendar className="w-3 h-3" />
                      {new Date(vision.target_date).toLocaleDateString()}
                    </div>
                  )}
                  <span className="ml-auto">{formatLastEdited(vision.last_edited_at)}</span>
                </div>
              </>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalsColumn({
  goals,
  visions,
  selectedVision,
  selectedGoal,
  selectedObjective,
  selectedTask,
  onSelectGoal,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  editingGoal,
  setEditingGoal,
  formatLastEdited,
  getStatusIcon,
  showOrphaned,
  setShowOrphaned,
  loadOrphanedGoals,
  onTitleClick,
  onConvertObjectiveToGoal,
  onConvertTaskToGoal,
}: GoalsColumnProps) {
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editVisionId, setEditVisionId] = useState<string | null>(null);
  const [orphanedGoals, setOrphanedGoals] = useState<Goal[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (showOrphaned) {
      loadOrphanedGoals().then(setOrphanedGoals);
    }
  }, [showOrphaned, goals]);

  const startEdit = (goal: Goal) => {
    setEditingGoal(goal.id);
    setEditTitle(goal.title);
    setEditDescription(goal.description);
    setEditStatus(goal.status);
    setEditTargetDate(goal.target_date || '');
    setEditVisionId(goal.vision_id);
  };

  // Initialize edit state when editingGoal is set externally (e.g., from navigation)
  useEffect(() => {
    if (editingGoal) {
      const goal = [...goals, ...orphanedGoals].find(g => g.id === editingGoal);
      if (goal) {
        setEditTitle(goal.title);
        setEditDescription(goal.description);
        setEditStatus(goal.status);
        setEditTargetDate(goal.target_date || '');
        setEditVisionId(goal.vision_id);
      }
    }
  }, [editingGoal, goals, orphanedGoals]);

  const saveEdit = async (id: string) => {
    await onUpdateGoal(id, {
      title: editTitle,
      description: editDescription,
      status: editStatus as 'not_started' | 'in_progress' | 'completed' | 'on_hold',
      target_date: editTargetDate || null,
      vision_id: editVisionId,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const dragData = e.dataTransfer.getData('application/json');
    if (!dragData) return;

    try {
      const { type, item } = JSON.parse(dragData);
      const targetVisionId = selectedVision?.id || null;

      if (type === 'objective') {
        await onConvertObjectiveToGoal(item as Objective, targetVisionId);
      } else if (type === 'task') {
        await onConvertTaskToGoal(item as Task, targetVisionId);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const allGoals = selectedVision ? goals : [];

  return (
    <div 
      className={`flex-1 min-w-[280px] flex flex-col glass-card border border-white/40 overflow-x-visible ${
        isDraggingOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">Goal / Project</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-blue-400">Best Use:</div>
              <p className="leading-relaxed">Major milestones or projects that move you toward your vision. Typically 1-3 years. Break down into objectives. Examples: "Launch a product line" or "Complete a master's degree". Goals are concrete, measurable outcomes.</p>
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            {allGoals.length + (showOrphaned ? orphanedGoals.length : 0)}
          </span>
        </div>
        <button
          onClick={onCreateGoal}
          className="btn-primary w-full shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Goal / Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {selectedVision && (
          <div>
            <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
              {selectedVision.title}
            </h3>
            <div className="space-y-2">
              {allGoals.length > 0 ? (
                allGoals.map((goal: Goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    visions={visions}
                    selectedGoal={selectedGoal}
                    editingGoal={editingGoal}
                    editTitle={editTitle}
                    editDescription={editDescription}
                    editStatus={editStatus}
                    editTargetDate={editTargetDate}
                    editVisionId={editVisionId}
                    setEditTitle={setEditTitle}
                    setEditDescription={setEditDescription}
                    setEditStatus={setEditStatus}
                    setEditTargetDate={setEditTargetDate}
                    setEditVisionId={setEditVisionId}
                    onSelectGoal={onSelectGoal}
                    startEdit={startEdit}
                    saveEdit={saveEdit}
                    setEditingGoal={setEditingGoal}
                    onDeleteGoal={onDeleteGoal}
                    formatLastEdited={formatLastEdited}
                    getStatusIcon={getStatusIcon}
                    onTitleClick={onTitleClick}
                  />
                ))
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  No goals yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Only show orphaned goals when nothing is selected, or when an orphaned goal is selected */}
        {(!selectedVision && !selectedGoal && !selectedObjective && !selectedTask) || 
         (selectedGoal && !selectedGoal.vision_id) ? (
          <div>
            <button
              onClick={() => setShowOrphaned(!showOrphaned)}
              className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1 hover:text-text-secondary transition-colors"
            >
              {showOrphaned ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Orphaned Goals ({orphanedGoals.length})
            </button>
            {showOrphaned && (
              <div className="space-y-2">
                {orphanedGoals.length > 0 ? (
                  orphanedGoals
                    .filter(goal => !selectedGoal || selectedGoal.id === goal.id)
                    .map((goal: Goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    visions={visions}
                    selectedGoal={selectedGoal}
                    editingGoal={editingGoal}
                    editTitle={editTitle}
                    editDescription={editDescription}
                    editStatus={editStatus}
                    editTargetDate={editTargetDate}
                    editVisionId={editVisionId}
                    setEditTitle={setEditTitle}
                    setEditDescription={setEditDescription}
                    setEditStatus={setEditStatus}
                    setEditTargetDate={setEditTargetDate}
                    setEditVisionId={setEditVisionId}
                    onSelectGoal={onSelectGoal}
                    startEdit={startEdit}
                    saveEdit={saveEdit}
                    setEditingGoal={setEditingGoal}
                    onDeleteGoal={onDeleteGoal}
                    formatLastEdited={formatLastEdited}
                    getStatusIcon={getStatusIcon}
                    onTitleClick={onTitleClick}
                  />
                ))
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  No orphaned goals
                </div>
              )}
            </div>
          )}
        </div>
        ) : null}
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  visions,
  selectedGoal,
  editingGoal,
  editTitle,
  editDescription,
  editStatus,
  editTargetDate,
  editVisionId,
  setEditTitle,
  setEditDescription,
  setEditStatus,
  setEditTargetDate,
  setEditVisionId,
  onSelectGoal,
  startEdit,
  saveEdit,
  setEditingGoal,
  onDeleteGoal,
  formatLastEdited,
  getStatusIcon,
  onTitleClick,
}: GoalCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'goal', item: goal }));
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`p-4 rounded-xl border transition-all duration-200 group cursor-move ${
        selectedGoal?.id === goal.id
          ? 'bg-blue-50 border-blue-200 shadow-sm dark:bg-blue-900/20 dark:border-blue-700'
          : 'glass-card hover:bg-white/80 dark:hover:bg-white/10 hover:border-blue-100 dark:hover:border-blue-900/50 hover:shadow-sm'
      }`}
      onClick={() => onSelectGoal(goal)}
    >
      {editingGoal === goal.id ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm resize-none"
            rows={2}
          />
          <select
            value={editVisionId || ''}
            onChange={(e) => setEditVisionId(e.target.value || null)}
            className="input-modern py-1.5 px-2 text-sm"
          >
            <option value="">No Vision (Orphaned)</option>
            {visions.map((vision: Vision) => (
              <option key={vision.id} value={vision.id}>
                {vision.title}
              </option>
            ))}
          </select>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
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
              onClick={() => saveEdit(goal.id)}
              className="flex-1 btn-primary py-1.5 px-2 text-xs bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={() => setEditingGoal(null)}
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
                onClick={(e) => onTitleClick('goal', goal.title, goal.description, e)}
              >
                {goal.title}
              </h3>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(goal);
                }}
                className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGoal(goal.id);
                }}
                className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {goal.description && (
            <p className="text-xs text-text-secondary mb-3 line-clamp-2 leading-relaxed">{goal.description}</p>
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
          {!goal.vision_id && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-orange-500 bg-orange-50 w-fit px-1.5 py-0.5 rounded border border-orange-100">
              <Link2 className="w-3 h-3" />
              Orphaned
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ObjectivesColumn({
  objectives,
  goals,
  selectedVision,
  selectedGoal,
  selectedObjective,
  selectedTask,
  onSelectObjective,
  onCreateObjective,
  onUpdateObjective,
  onDeleteObjective,
  editingObjective,
  setEditingObjective,
  formatLastEdited,
  getStatusIcon,
  getPriorityColor,
  showOrphaned,
  setShowOrphaned,
  loadOrphanedObjectives,
  taskCounts,
  onTitleClick,
  onConvertGoalToObjective,
  onConvertTaskToObjective,
}: ObjectivesColumnProps) {
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [orphanedObjectives, setOrphanedObjectives] = useState<Objective[]>([]);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [objectiveTasks, setObjectiveTasks] = useState<Record<string, Task[]>>({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (showOrphaned) {
      loadOrphanedObjectives().then(setOrphanedObjectives);
    }
  }, [showOrphaned, objectives]);

  const startEdit = (objective: Objective) => {
    setEditingObjective(objective.id);
    setEditTitle(objective.title);
    setEditDescription(objective.description);
    setEditStatus(objective.status);
    setEditPriority(objective.priority);
    setEditTargetDate(objective.target_date || '');
    setEditGoalId(objective.goal_id);
  };

  // Initialize edit state when editingObjective is set externally (e.g., from navigation)
  useEffect(() => {
    if (editingObjective) {
      const objective = [...objectives, ...orphanedObjectives].find(o => o.id === editingObjective);
      if (objective) {
        setEditTitle(objective.title);
        setEditDescription(objective.description);
        setEditStatus(objective.status);
        setEditPriority(objective.priority);
        setEditTargetDate(objective.target_date || '');
        setEditGoalId(objective.goal_id);
      }
    }
  }, [editingObjective, objectives, orphanedObjectives]);

  const saveEdit = async (id: string) => {
    await onUpdateObjective(id, {
      title: editTitle,
      description: editDescription,
      status: editStatus as 'not_started' | 'in_progress' | 'completed' | 'on_hold',
      priority: editPriority as 'high' | 'medium' | 'low',
      target_date: editTargetDate || null,
      goal_id: editGoalId,
    });
  };

  const toggleObjectiveExpanded = async (objectiveId: string) => {
    const newExpanded = new Set(expandedObjectives);

    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
    } else {
      newExpanded.add(objectiveId);
      if (!objectiveTasks[objectiveId]) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .eq('objective_id', objectiveId)
          .order('created_at', { ascending: false });

        if (data) {
          setObjectiveTasks(prev => ({
            ...prev,
            [objectiveId]: data
          }));
        }
      }
    }

    setExpandedObjectives(newExpanded);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const dragData = e.dataTransfer.getData('application/json');
    if (!dragData) return;

    try {
      const { type, item } = JSON.parse(dragData);
      const targetGoalId = selectedGoal?.id || null;

      if (type === 'goal') {
        await onConvertGoalToObjective(item as Goal, targetGoalId);
      } else if (type === 'task') {
        await onConvertTaskToObjective(item as Task, targetGoalId);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  // Show objectives filtered by selectedGoal, or all objectives if no goal selected
  const allObjectives = selectedGoal ? objectives : objectives;

  return (
    <div 
      className={`flex-1 min-w-[280px] flex flex-col glass-card border border-white/40 overflow-x-visible ${
        isDraggingOver ? 'ring-2 ring-green-500 ring-offset-2' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">Objectives</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-green-400">Best Use:</div>
              <p className="leading-relaxed">Specific, actionable steps to achieve a goal. Usually 3-6 months. Break into tasks. Examples: "Research market demand" or "Complete first 3 courses". Objectives have clear success criteria and deadlines.</p>
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">
            {allObjectives.length + (showOrphaned && selectedGoal ? orphanedObjectives.length : 0)}
          </span>
        </div>
        <button
          onClick={onCreateObjective}
          className="btn-primary w-full shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Add Objective
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {selectedGoal ? (
          <div>
            <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
              {selectedGoal.title}
            </h3>
            <div className="space-y-2">
              {objectives.length > 0 ? (
                objectives.map((objective: Objective) => (
                  <ObjectiveCard
                    key={objective.id}
                    objective={objective}
                    selectedObjective={selectedObjective}
                    editingObjective={editingObjective}
                    editTitle={editTitle}
                    editDescription={editDescription}
                    editStatus={editStatus}
                    editPriority={editPriority}
                    editTargetDate={editTargetDate}
                    editGoalId={editGoalId}
                    setEditTitle={setEditTitle}
                    setEditDescription={setEditDescription}
                    setEditStatus={setEditStatus}
                    setEditPriority={setEditPriority}
                    setEditTargetDate={setEditTargetDate}
                    setEditGoalId={setEditGoalId}
                    goals={goals}
                    onSelectObjective={onSelectObjective}
                    startEdit={startEdit}
                    saveEdit={saveEdit}
                    setEditingObjective={setEditingObjective}
                    onDeleteObjective={onDeleteObjective}
                    formatLastEdited={formatLastEdited}
                    getStatusIcon={getStatusIcon}
                    getPriorityColor={getPriorityColor}
                    taskCounts={taskCounts}
                    isExpanded={expandedObjectives.has(objective.id)}
                    tasks={objectiveTasks[objective.id] || []}
                    onToggleExpand={toggleObjectiveExpanded}
                    onTitleClick={onTitleClick}
                  />
                ))
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  No objectives yet
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {allObjectives.length > 0 ? (
              allObjectives.map((objective: Objective) => (
                <ObjectiveCard
                  key={objective.id}
                  objective={objective}
                  selectedObjective={selectedObjective}
                  editingObjective={editingObjective}
                  editTitle={editTitle}
                  editDescription={editDescription}
                  editStatus={editStatus}
                  editPriority={editPriority}
                  editTargetDate={editTargetDate}
                  editGoalId={editGoalId}
                  setEditTitle={setEditTitle}
                  setEditDescription={setEditDescription}
                  setEditStatus={setEditStatus}
                  setEditPriority={setEditPriority}
                  setEditTargetDate={setEditTargetDate}
                  setEditGoalId={setEditGoalId}
                  goals={goals}
                  onSelectObjective={onSelectObjective}
                  startEdit={startEdit}
                  saveEdit={saveEdit}
                  setEditingObjective={setEditingObjective}
                  onDeleteObjective={onDeleteObjective}
                  formatLastEdited={formatLastEdited}
                  getStatusIcon={getStatusIcon}
                  getPriorityColor={getPriorityColor}
                  taskCounts={taskCounts}
                  isExpanded={expandedObjectives.has(objective.id)}
                  tasks={objectiveTasks[objective.id] || []}
                  onToggleExpand={toggleObjectiveExpanded}
                  onTitleClick={onTitleClick}
                />
              ))
            ) : (
              <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                No objectives yet
              </div>
            )}
          </div>
        )}

        {/* Only show orphaned objectives when nothing is selected, or when an orphaned objective is selected */}
        {(!selectedVision && !selectedGoal && !selectedObjective && !selectedTask) || 
         (selectedObjective && !selectedObjective.goal_id) ? (
          <div>
            <button
              onClick={() => setShowOrphaned(!showOrphaned)}
              className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1 hover:text-text-secondary transition-colors"
            >
              {showOrphaned ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Orphaned Objectives ({orphanedObjectives.length})
            </button>
            {showOrphaned && (
            <div className="space-y-2">
              {orphanedObjectives.length > 0 ? (
                orphanedObjectives
                  .filter(objective => !selectedObjective || selectedObjective.id === objective.id)
                  .map((objective: Objective) => (
                  <ObjectiveCard
                    key={objective.id}
                    objective={objective}
                    selectedObjective={selectedObjective}
                    editingObjective={editingObjective}
                    editTitle={editTitle}
                    editDescription={editDescription}
                    editStatus={editStatus}
                    editPriority={editPriority}
                    editTargetDate={editTargetDate}
                    editGoalId={editGoalId}
                    setEditTitle={setEditTitle}
                    setEditDescription={setEditDescription}
                    setEditStatus={setEditStatus}
                    setEditPriority={setEditPriority}
                    setEditTargetDate={setEditTargetDate}
                    setEditGoalId={setEditGoalId}
                    goals={goals}
                    onSelectObjective={onSelectObjective}
                    startEdit={startEdit}
                    saveEdit={saveEdit}
                    setEditingObjective={setEditingObjective}
                    onDeleteObjective={onDeleteObjective}
                    formatLastEdited={formatLastEdited}
                    getStatusIcon={getStatusIcon}
                    getPriorityColor={getPriorityColor}
                    taskCounts={taskCounts}
                    isExpanded={expandedObjectives.has(objective.id)}
                    tasks={objectiveTasks[objective.id] || []}
                    onToggleExpand={toggleObjectiveExpanded}
                    onTitleClick={onTitleClick}
                  />
                ))
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  No orphaned objectives
                </div>
              )}
            </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ObjectiveCard({
  objective,
  selectedObjective,
  editingObjective,
  editTitle,
  editDescription,
  editStatus,
  editPriority,
  editTargetDate,
  editGoalId,
  setEditTitle,
  setEditDescription,
  setEditStatus,
  setEditPriority,
  setEditTargetDate,
  setEditGoalId,
  goals,
  onSelectObjective,
  startEdit,
  saveEdit,
  setEditingObjective,
  onDeleteObjective,
  formatLastEdited,
  getStatusIcon,
  getPriorityColor,
  taskCounts,
  isExpanded,
  onTitleClick,
  tasks,
  onToggleExpand,
}: ObjectiveCardProps) {
  const taskCount = taskCounts[objective.id] || { total: 0, completed: 0 };
  
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'objective', item: objective }));
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`p-4 rounded-xl border transition-all duration-200 group cursor-move ${
        selectedObjective?.id === objective.id
          ? 'bg-green-50 border-green-200 shadow-sm dark:bg-green-900/20 dark:border-green-700'
          : 'glass-card hover:bg-white/80 dark:hover:bg-white/10 hover:border-green-100 dark:hover:border-green-900/50 hover:shadow-sm'
      }`}
      onClick={() => onSelectObjective(objective)}
    >
      {editingObjective === objective.id ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="input-modern py-1.5 px-2 text-sm resize-none"
            rows={2}
          />
          <select
            value={editGoalId || ''}
            onChange={(e) => setEditGoalId(e.target.value || null)}
            className="input-modern py-1.5 px-2 text-sm"
          >
            <option value="">No Goal (Orphaned)</option>
            {goals.map((goal: Goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
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
                saveEdit(objective.id);
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
                setEditingObjective(null);
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
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1">
              {getStatusIcon(objective.status)}
              <h3
                className="font-medium text-text-primary leading-snug hover:text-accent-primary transition-colors cursor-pointer"
                onClick={(e) => onTitleClick('objective', objective.title, objective.description, e)}
              >
                {objective.title}
              </h3>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(objective);
                }}
                className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteObjective(objective.id);
                }}
                className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {objective.description && (
            <p className="text-xs text-text-secondary mb-3 line-clamp-2 leading-relaxed">{objective.description}</p>
          )}
          <div className="flex items-center justify-between text-[10px] text-text-tertiary mb-2">
            {objective.target_date && (
              <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border-secondary">
                <Calendar className="w-3 h-3" />
                {new Date(objective.target_date).toLocaleDateString()}
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
          {taskCount.total > 0 && (
            <div className="mt-3 pt-3 border-t border-border-secondary/50">
              <button
                onClick={() => onToggleExpand(objective.id)}
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
                  {tasks.map((task: Task) => (
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
          {!objective.goal_id && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-orange-500 bg-orange-50 w-fit px-1.5 py-0.5 rounded border border-orange-100">
              <Link2 className="w-3 h-3" />
              Orphaned
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TasksColumn({
  tasks,
  objectives,
  orphanedObjectives,
  selectedVision,
  selectedGoal,
  selectedObjective,
  selectedTask,
  onSelectTask,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleStatus,
  onMarkRecurringCompletedToday,
  editingTask,
  setEditingTask,
  formatLastEdited,
  getPriorityColor,
  showOrphaned,
  setShowOrphaned,
  loadOrphanedTasks,
  onTitleClick,
  onConvertGoalToTask,
  onConvertObjectiveToTask,
}: TasksColumnProps) {
  const { user } = useAuth();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editObjectiveId, setEditObjectiveId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [orphanedTasks, setOrphanedTasks] = useState<Task[]>([]);
  const [recurringCompletedToday, setRecurringCompletedToday] = useState<Record<string, boolean>>({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (showOrphaned) {
      loadOrphanedTasks().then((data: Task[]) => setOrphanedTasks(data || []));
    }
  }, [showOrphaned, tasks]);

  const startEdit = (task: Task) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.due_date || '');
    setEditObjectiveId(task.objective_id);
    setEditNotes(task.notes || '');
    setEditIsRecurring(task.is_recurring || false);
  };

  // Initialize edit state when editingTask is set externally (e.g., from navigation)
  useEffect(() => {
    if (editingTask) {
      const task = [...tasks, ...orphanedTasks].find(t => t.id === editingTask);
      if (task) {
        setEditTitle(task.title);
        setEditPriority(task.priority);
        setEditDueDate(task.due_date || '');
        setEditObjectiveId(task.objective_id);
        setEditNotes(task.notes || '');
        setEditIsRecurring(task.is_recurring || false);
      }
    }
  }, [editingTask, tasks, orphanedTasks]);

  const saveEdit = async (id: string) => {
    await onUpdateTask(id, {
      title: editTitle,
      priority: editPriority as 'high' | 'medium' | 'low',
      due_date: editIsRecurring ? null : (editDueDate || null),
      objective_id: editObjectiveId,
      notes: editNotes,
      is_recurring: editIsRecurring,
    });
  };

  // Check if recurring tasks are completed today
  useEffect(() => {
    const checkRecurringCompletions = async () => {
      if (!user) return;
      
      const recurringTaskIds = [...tasks, ...orphanedTasks]
        .filter(t => t.is_recurring)
        .map(t => t.id);
      
      if (recurringTaskIds.length === 0) return;

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('task_completions')
        .select('task_id')
        .in('task_id', recurringTaskIds)
        .eq('completion_date', today)
        .eq('user_id', user.id);

      const completedMap: Record<string, boolean> = {};
      recurringTaskIds.forEach(id => {
        completedMap[id] = (data || []).some(c => c.task_id === id);
      });
      setRecurringCompletedToday(completedMap);
    };

    if (tasks.length > 0 || orphanedTasks.length > 0) {
      checkRecurringCompletions();
    }
  }, [tasks, orphanedTasks, user]);

  const saveNotes = (id: string, notes: string) => {
    onUpdateTask(id, { notes });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const dragData = e.dataTransfer.getData('application/json');
    if (!dragData) return;

    try {
      const { type, item } = JSON.parse(dragData);
      const targetObjectiveId = selectedObjective?.id || null;

      if (type === 'goal') {
        await onConvertGoalToTask(item as Goal, targetObjectiveId);
      } else if (type === 'objective') {
        await onConvertObjectiveToTask(item as Objective, targetObjectiveId);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const allTasks = selectedObjective ? tasks : [];
  const totalTasksCount = allTasks.length + (showOrphaned ? orphanedTasks.length : 0);

  return (
    <div 
      className={`flex-1 min-w-[280px] flex flex-col glass-card border border-white/40 overflow-x-visible ${
        isDraggingOver ? 'ring-2 ring-purple-500 ring-offset-2' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">Tasks</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-purple-400">Best Use:</div>
              <p className="leading-relaxed">Daily or weekly actions that complete an objective. Small, concrete steps you can check off. Examples: "Call 3 potential clients" or "Write chapter 1 draft". Tasks can be one-time or recurring. Focus on what you can do today.</p>
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
            {totalTasksCount}
          </span>
        </div>
        <button
          onClick={onCreateTask}
          className="btn-primary w-full shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-6">
          {selectedObjective && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider px-1">
                {selectedObjective.title}
              </h3>
              <div className="space-y-3">
                {tasks.map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    objectives={[...objectives, ...orphanedObjectives]}
                    expandedTask={expandedTask}
                    setExpandedTask={setExpandedTask}
                    editingTask={editingTask}
                    editTitle={editTitle}
                    editPriority={editPriority}
                    editDueDate={editDueDate}
                    editObjectiveId={editObjectiveId}
                    editNotes={editNotes}
                    editIsRecurring={editIsRecurring}
                    setEditTitle={setEditTitle}
                    setEditPriority={setEditPriority}
                    setEditDueDate={setEditDueDate}
                    setEditObjectiveId={setEditObjectiveId}
                    setEditNotes={setEditNotes}
                    setEditIsRecurring={setEditIsRecurring}
                    onToggleStatus={onToggleStatus}
                    onMarkRecurringCompletedToday={onMarkRecurringCompletedToday}
                    isRecurringCompletedToday={recurringCompletedToday[task.id] || false}
                    startEdit={startEdit}
                    saveEdit={saveEdit}
                    saveNotes={saveNotes}
                    setEditingTask={setEditingTask}
                    onDeleteTask={onDeleteTask}
                    formatLastEdited={formatLastEdited}
                    getPriorityColor={getPriorityColor}
                    onTitleClick={onTitleClick}
                    selectedTask={selectedTask}
                    onSelectTask={onSelectTask}
                  />
                ))}
                {tasks.length === 0 && (
                  <div className="text-center text-text-tertiary py-8 bg-white/30 dark:bg-white/5 rounded-xl border border-dashed border-border-secondary">
                    No tasks yet. Create one to get started!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Only show orphaned tasks when nothing is selected, or when an orphaned task is selected */}
          {(!selectedVision && !selectedGoal && !selectedObjective && !selectedTask) || 
           (selectedTask && !selectedTask.objective_id) ? (
            <div>
              <button
                onClick={() => setShowOrphaned(!showOrphaned)}
                className="flex items-center gap-2 text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3 px-1 hover:text-text-secondary transition-colors"
              >
                {showOrphaned ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Orphaned Tasks ({orphanedTasks.length})
              </button>
              {showOrphaned && (
                <div className="space-y-3">
                  {orphanedTasks.length > 0 ? (
                    orphanedTasks
                      .filter(task => !selectedTask || selectedTask.id === task.id)
                      .map((task: Task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      objectives={objectives}
                      expandedTask={expandedTask}
                      setExpandedTask={setExpandedTask}
                      editingTask={editingTask}
                      editTitle={editTitle}
                      editPriority={editPriority}
                      editDueDate={editDueDate}
                      editObjectiveId={editObjectiveId}
                      editNotes={editNotes}
                      editIsRecurring={editIsRecurring}
                      setEditTitle={setEditTitle}
                      setEditPriority={setEditPriority}
                      setEditDueDate={setEditDueDate}
                      setEditObjectiveId={setEditObjectiveId}
                      setEditNotes={setEditNotes}
                      setEditIsRecurring={setEditIsRecurring}
                      onToggleStatus={onToggleStatus}
                      onMarkRecurringCompletedToday={onMarkRecurringCompletedToday}
                      isRecurringCompletedToday={recurringCompletedToday[task.id] || false}
                      startEdit={startEdit}
                      saveEdit={saveEdit}
                      saveNotes={saveNotes}
                      setEditingTask={setEditingTask}
                      onDeleteTask={onDeleteTask}
                      formatLastEdited={formatLastEdited}
                      getPriorityColor={getPriorityColor}
                      onTitleClick={onTitleClick}
                      selectedTask={selectedTask}
                      onSelectTask={onSelectTask}
                    />
                  ))
                ) : (
                  <div className="text-center text-text-tertiary py-8 bg-white/30 dark:bg-white/5 rounded-xl border border-dashed border-border-secondary">
                    No orphaned tasks yet
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

          {!selectedObjective && !showOrphaned && (
            <div className="text-center text-text-tertiary mt-8">
              Select an objective to see tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  objectives,
  expandedTask,
  setExpandedTask,
  editingTask,
  editTitle,
  editPriority,
  editDueDate,
  editObjectiveId,
  editNotes,
  editIsRecurring,
  setEditTitle,
  setEditPriority,
  setEditDueDate,
  setEditObjectiveId,
  setEditNotes,
  setEditIsRecurring,
  onToggleStatus,
  onMarkRecurringCompletedToday,
  isRecurringCompletedToday,
  startEdit,
  saveEdit,
  saveNotes,
  setEditingTask,
  onDeleteTask,
  formatLastEdited,
  getPriorityColor,
  onTitleClick,
  selectedTask,
  onSelectTask,
}: TaskCardProps) {
  const [localNotes, setLocalNotes] = useState(task.notes);
  const isExpanded = expandedTask === task.id;

  useEffect(() => {
    setLocalNotes(task.notes);
  }, [task.notes]);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'task', item: task }));
  };

  const isSelected = selectedTask?.id === task.id;

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelectTask(task)}
      className={`glass-card p-4 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-md transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-purple-50 border-2 border-purple-200 shadow-sm dark:bg-purple-900/20 dark:border-purple-700'
          : 'border border-white/40 dark:border-white/10'
      }`}
    >
      {editingTask === task.id ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-modern py-1.5 px-3 text-sm"
          />
          <select
            value={editObjectiveId || ''}
            onChange={(e) => setEditObjectiveId(e.target.value || null)}
            className="input-modern py-1.5 px-3 text-sm"
          >
            <option value="">No Objective (Orphaned)</option>
            {objectives.map((obj: Objective) => (
              <option key={obj.id} value={obj.id}>
                {obj.title}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
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
              onClick={() => saveEdit(task.id)}
              className="flex-1 btn-primary py-1.5 px-3 text-sm bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setEditingTask(null)}
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
                onToggleStatus(task);
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
                  onClick={(e) => onTitleClick('task', task.title, task.notes || '', e)}
              >
                {task.title}
                </h3>
              </div>
              
              {task.is_recurring && (
                <div className="mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRecurringCompletedToday(task.id);
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
                {!task.objective_id && (
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
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
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
                    <div className="space-y-2 animate-slide-up">
                      <textarea
                        value={localNotes}
                        onChange={(e) => setLocalNotes(e.target.value)}
                        placeholder="Add notes or subtasks here..."
                        className="w-full px-3 py-2 bg-white/50 dark:bg-white/5 border border-border-secondary rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-y"
                        rows={4}
                      />
                      {localNotes !== task.notes && (
                        <button
                          onClick={() => saveNotes(task.id, localNotes)}
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
                  startEdit(task);
                }}
                className="text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task.id);
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

