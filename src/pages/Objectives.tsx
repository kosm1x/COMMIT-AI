import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { X, Network, Lightbulb, Eye, Target, Flag, ListTodo } from 'lucide-react';
import { useObjectivesState } from '../hooks/useObjectivesState';
import { VisionColumn, GoalColumn, ObjectiveColumn, TaskColumn } from '../components/objectives/columns';
import { VisionForm, GoalForm, ObjectiveForm, TaskForm } from '../components/objectives/modals';

type ItemType = 'vision' | 'goal' | 'objective' | 'task';

export default function Objectives() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Use the centralized objectives state hook
  const state = useObjectivesState(user?.id);

  // Form visibility state
  const [showVisionForm, setShowVisionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Editing state (which item is being edited)
  const [editingVisionId, setEditingVisionId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Action modal for "Create from" functionality
  const [actionModal, setActionModal] = useState<{
    type: ItemType | null;
    title: string;
    description: string;
  }>({ type: null, title: '', description: '' });

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'vision' | 'goals' | 'objectives' | 'tasks'>('vision');

  // Navigation state handling
  const processedNavStateRef = useRef<string | null>(null);
  const hasAutoSelectedVisionRef = useRef(false);

  // Clear processed nav state when pathname changes
  useEffect(() => {
    processedNavStateRef.current = null;
  }, [location.pathname]);

  // Auto-select first vision on initial load (if no navigation state)
  useEffect(() => {
    if (processedNavStateRef.current) return;

    const navState = location.state as { selectVision?: string; selectGoal?: string; selectObjective?: string; selectTask?: string } | null;
    const hasNavState = navState && (navState.selectVision || navState.selectGoal || navState.selectObjective || navState.selectTask);

    if (state.visions.length > 0 && !state.selectedVision && !hasAutoSelectedVisionRef.current && !hasNavState) {
      state.selectVision(state.visions[0]);
      hasAutoSelectedVisionRef.current = true;
    }
  }, [state.visions, state.selectedVision, location.state, state]);

  // Handle navigation state from Kanban boards
  useEffect(() => {
    const navState = location.state as { selectVision?: string; selectGoal?: string; selectObjective?: string; selectTask?: string; timestamp?: number } | null;
    if (!navState || !user) return;

    const stateKey = navState.timestamp
      ? `${navState.selectVision || navState.selectGoal || navState.selectObjective || navState.selectTask || ''}-${navState.timestamp}`
      : (navState.selectVision || navState.selectGoal || navState.selectObjective || navState.selectTask || null);
    if (!stateKey || processedNavStateRef.current === stateKey) return;
    processedNavStateRef.current = stateKey;

    const selectItem = async () => {
      if (navState.selectVision) {
        const { data } = await supabase
          .from('visions')
          .select('*')
          .eq('id', navState.selectVision)
          .eq('user_id', user.id)
          .single();
        if (data) {
          state.selectVision(data);
          setEditingVisionId(data.id);
        }
      } else if (navState.selectGoal) {
        const { data } = await supabase
          .from('goals')
          .select('*')
          .eq('id', navState.selectGoal)
          .eq('user_id', user.id)
          .single();
        if (data) {
          // If goal has a vision, select it first
          if (data.vision_id) {
            const { data: visionData } = await supabase
              .from('visions')
              .select('*')
              .eq('id', data.vision_id)
              .single();
            if (visionData) {
              state.selectVision(visionData);
            }
          }
          state.selectGoal(data);
          setEditingGoalId(data.id);
        }
      } else if (navState.selectObjective) {
        const { data } = await supabase
          .from('objectives')
          .select('*')
          .eq('id', navState.selectObjective)
          .eq('user_id', user.id)
          .single();
        if (data) {
          // Load parent hierarchy
          if (data.goal_id) {
            const { data: goalData } = await supabase
              .from('goals')
              .select('*')
              .eq('id', data.goal_id)
              .single();
            if (goalData) {
              if (goalData.vision_id) {
                const { data: visionData } = await supabase
                  .from('visions')
                  .select('*')
                  .eq('id', goalData.vision_id)
                  .single();
                if (visionData) {
                  state.selectVision(visionData);
                }
              }
              state.selectGoal(goalData);
            }
          }
          state.selectObjective(data);
          setEditingObjectiveId(data.id);
        }
      } else if (navState.selectTask) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', navState.selectTask)
          .eq('user_id', user.id)
          .single();
        if (data) {
          // Load parent hierarchy
          if (data.objective_id) {
            const { data: objectiveData } = await supabase
              .from('objectives')
              .select('*')
              .eq('id', data.objective_id)
              .single();
            if (objectiveData) {
              if (objectiveData.goal_id) {
                const { data: goalData } = await supabase
                  .from('goals')
                  .select('*')
                  .eq('id', objectiveData.goal_id)
                  .single();
                if (goalData) {
                  if (goalData.vision_id) {
                    const { data: visionData } = await supabase
                      .from('visions')
                      .select('*')
                      .eq('id', goalData.vision_id)
                      .single();
                    if (visionData) {
                      state.selectVision(visionData);
                    }
                  }
                  state.selectGoal(goalData);
                }
              }
              state.selectObjective(objectiveData);
            }
          }
          state.selectTask(data);
          setEditingTaskId(data.id);
        }
      }
      // Clear navigation state after handling
      navigate(location.pathname, { replace: true, state: {} });
      processedNavStateRef.current = null;
    };

    selectItem();
  }, [location.state, user, navigate, location.pathname, state]);

  // Title click handler for "Create from" modal
  const handleTitleClick = (type: ItemType, title: string, description: string, e: React.MouseEvent) => {
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

  // Create handlers that use the hook's functions
  const handleCreateVision = async (title: string, description: string, targetDate: string) => {
    const newVision = await state.createVision(title, description, targetDate);
    if (newVision) {
      setShowVisionForm(false);
      state.selectVision(newVision);
    }
  };

  const handleCreateGoal = async (title: string, description: string, targetDate: string, visionId: string | null) => {
    const newGoal = await state.createGoal(title, description, targetDate, visionId);
    if (newGoal) {
      setShowGoalForm(false);
      state.selectGoal(newGoal);
    }
  };

  const handleCreateObjective = async (title: string, description: string, priority: string, goalId: string | null, targetDate: string) => {
    const newObjective = await state.createObjective(title, description, priority, goalId, targetDate);
    if (newObjective) {
      setShowObjectiveForm(false);
      state.selectObjective(newObjective);
    }
  };

  const handleCreateTask = async (title: string, priority: string, dueDate: string, objectiveId: string | null, isRecurring: boolean) => {
    const newTask = await state.createTask(title, priority, dueDate, objectiveId, isRecurring);
    if (newTask) {
      setShowTaskForm(false);
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'vision' as const, label: 'Vision', icon: Eye, count: state.visions.length },
    { id: 'goals' as const, label: 'Goals', icon: Target, count: state.goals.length },
    { id: 'objectives' as const, label: 'Objectives', icon: Flag, count: state.objectives.length },
    { id: 'tasks' as const, label: 'Tasks', icon: ListTodo, count: state.tasks.length },
  ];

  if (state.loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 overflow-hidden pb-4 w-full">
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
      <div className="flex-1 flex gap-3 overflow-x-auto lg:overflow-x-hidden w-full min-w-0">
        {/* Vision Column */}
        <div className={`${activeTab === 'vision' ? 'flex' : 'hidden'} lg:flex flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] max-w-full shrink`}>
          <VisionColumn
            visions={state.visions}
            selectedVisionId={state.selectionPath.visionId}
            isInSelectedFamily={state.isInSelectedFamily}
            editingVisionId={editingVisionId}
            setEditingVisionId={setEditingVisionId}
            onSelectVision={state.selectVision}
            onCreateVision={() => setShowVisionForm(true)}
            onUpdateVision={state.updateVision}
            onDeleteVision={state.deleteVision}
            onUpdateVisionOrder={state.updateVisionOrder}
            onTitleClick={handleTitleClick}
            getVisionDescendantCounts={state.getVisionDescendantCounts}
            goals={state.goals}
            objectives={state.objectives}
            tasks={state.tasks}
          />
        </div>

        {/* Goal Column */}
        <div className={`${activeTab === 'goals' ? 'flex' : 'hidden'} lg:flex flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] max-w-full shrink`}>
          <GoalColumn
            goals={state.goals}
            visions={state.visions}
            selectedVisionId={state.selectionPath.visionId}
            selectedGoalId={state.selectionPath.goalId}
            isInSelectedFamily={state.isInSelectedFamily}
            editingGoalId={editingGoalId}
            setEditingGoalId={setEditingGoalId}
            onSelectGoal={state.selectGoal}
            onCreateGoal={() => setShowGoalForm(true)}
            onUpdateGoal={state.updateGoal}
            onDeleteGoal={state.deleteGoal}
            onTitleClick={handleTitleClick}
            getGoalDescendantCounts={state.getGoalDescendantCounts}
            selectedVision={state.selectedVision}
          />
        </div>

        {/* Objective Column */}
        <div className={`${activeTab === 'objectives' ? 'flex' : 'hidden'} lg:flex flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] max-w-full shrink`}>
          <ObjectiveColumn
            objectives={state.objectives}
            goals={state.goals}
            selectedGoalId={state.selectionPath.goalId}
            selectedObjectiveId={state.selectionPath.objectiveId}
            isInSelectedFamily={state.isInSelectedFamily}
            editingObjectiveId={editingObjectiveId}
            setEditingObjectiveId={setEditingObjectiveId}
            onSelectObjective={state.selectObjective}
            onCreateObjective={() => setShowObjectiveForm(true)}
            onUpdateObjective={state.updateObjective}
            onDeleteObjective={state.deleteObjective}
            onTitleClick={handleTitleClick}
            getObjectiveDescendantCounts={state.getObjectiveDescendantCounts}
            selectedGoal={state.selectedGoal}
            taskCounts={state.taskCounts}
          />
        </div>

        {/* Task Column */}
        <div className={`${activeTab === 'tasks' ? 'flex' : 'hidden'} lg:flex flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] max-w-full shrink`}>
          <TaskColumn
            tasks={state.tasks}
            objectives={state.objectives}
            selectedObjectiveId={state.selectionPath.objectiveId}
            selectedTaskId={state.selectionPath.taskId}
            isInSelectedFamily={state.isInSelectedFamily}
            editingTaskId={editingTaskId}
            setEditingTaskId={setEditingTaskId}
            onSelectTask={state.selectTask}
            onCreateTask={() => setShowTaskForm(true)}
            onUpdateTask={state.updateTask}
            onDeleteTask={state.deleteTask}
            onToggleTaskStatus={state.toggleTaskStatus}
            onMarkRecurringCompletedToday={state.markRecurringTaskCompletedToday}
            onTitleClick={handleTitleClick}
            selectedObjective={state.selectedObjective}
          />
        </div>
      </div>

      {/* Forms */}
      {showVisionForm && (
        <VisionForm onClose={() => setShowVisionForm(false)} onCreate={handleCreateVision} />
      )}
      {showGoalForm && (
        <GoalForm
          onClose={() => setShowGoalForm(false)}
          onCreate={handleCreateGoal}
          visions={state.visions}
          selectedVision={state.selectedVision}
        />
      )}
      {showObjectiveForm && (
        <ObjectiveForm
          onClose={() => setShowObjectiveForm(false)}
          onCreate={handleCreateObjective}
          goals={state.goals}
          selectedGoal={state.selectedGoal}
        />
      )}
      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          onCreate={handleCreateTask}
          objectives={state.objectives}
          selectedObjective={state.selectedObjective}
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
