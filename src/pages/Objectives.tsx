import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Network, Lightbulb, Eye, Target, Flag, ListTodo, Loader2 } from 'lucide-react';
import { useObjectivesState } from '../hooks/useObjectivesState';
import { VisionColumn, GoalColumn, ObjectiveColumn, TaskColumn } from '../components/objectives/columns';
import { VisionForm, GoalForm, ObjectiveForm, TaskForm } from '../components/objectives/modals';
import { Vision, Goal, Objective, Task } from '../components/objectives/types';
import { Header, Modal } from '../components/ui';

type ItemType = 'vision' | 'goal' | 'objective' | 'task';

export default function Objectives() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const state = useObjectivesState(user?.id);
  const hasAnySelection = !!(state.selectionPath.visionId || state.selectionPath.goalId || state.selectionPath.objectiveId || state.selectionPath.taskId);

  const [showVisionForm, setShowVisionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const [editingVisionId, setEditingVisionId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<{
    type: ItemType | null;
    title: string;
    description: string;
  }>({ type: null, title: '', description: '' });

  const [activeTab, setActiveTab] = useState<'vision' | 'goals' | 'objectives' | 'tasks'>('vision');
  const processedNavStateRef = useRef<string | null>(null);

  useEffect(() => {
    processedNavStateRef.current = null;
  }, [location.pathname]);

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
        const { data } = await supabase.from('visions').select('*').eq('id', navState.selectVision).eq('user_id', user.id).single();
        if (data) { state.selectVision(data); setEditingVisionId(data.id); }
      } else if (navState.selectGoal) {
        const { data } = await supabase.from('goals').select('*').eq('id', navState.selectGoal).eq('user_id', user.id).single();
        if (data) {
          if (data.vision_id) {
            const { data: visionData } = await supabase.from('visions').select('*').eq('id', data.vision_id).single();
            if (visionData) state.selectVision(visionData);
          }
          state.selectGoal(data);
          setEditingGoalId(data.id);
        }
      } else if (navState.selectObjective) {
        const { data } = await supabase.from('objectives').select('*').eq('id', navState.selectObjective).eq('user_id', user.id).single();
        if (data) {
          if (data.goal_id) {
            const { data: goalData } = await supabase.from('goals').select('*').eq('id', data.goal_id).single();
            if (goalData) {
              if (goalData.vision_id) {
                const { data: visionData } = await supabase.from('visions').select('*').eq('id', goalData.vision_id).single();
                if (visionData) state.selectVision(visionData);
              }
              state.selectGoal(goalData);
            }
          }
          state.selectObjective(data);
          setEditingObjectiveId(data.id);
        }
      } else if (navState.selectTask) {
        const { data } = await supabase.from('tasks').select('*').eq('id', navState.selectTask).eq('user_id', user.id).single();
        if (data) {
          if (data.objective_id) {
            const { data: objectiveData } = await supabase.from('objectives').select('*').eq('id', data.objective_id).single();
            if (objectiveData) {
              if (objectiveData.goal_id) {
                const { data: goalData } = await supabase.from('goals').select('*').eq('id', objectiveData.goal_id).single();
                if (goalData) {
                  if (goalData.vision_id) {
                    const { data: visionData } = await supabase.from('visions').select('*').eq('id', goalData.vision_id).single();
                    if (visionData) state.selectVision(visionData);
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
      // Clear navigation state WITHOUT triggering React Router scroll behavior
      // Using window.history.replaceState instead of navigate() to prevent scroll reset
      window.history.replaceState({}, '', location.pathname);
      // NOTE: Do NOT reset processedNavStateRef.current here - keep it set to prevent re-triggering
      // The ref will be reset when the pathname changes (line 44-45)
    };

    selectItem();
  }, [location.state, user, location.pathname, state]);

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

  const handleCreateVision = async (title: string, description: string, targetDate: string) => {
    const newVision = await state.createVision(title, description, targetDate);
    if (newVision) { setShowVisionForm(false); state.selectVision(newVision); }
  };

  const handleCreateGoal = async (title: string, description: string, targetDate: string, visionId: string | null) => {
    const newGoal = await state.createGoal(title, description, targetDate, visionId);
    if (newGoal) { setShowGoalForm(false); state.selectGoal(newGoal); }
  };

  const handleCreateObjective = async (title: string, description: string, priority: string, goalId: string | null, targetDate: string) => {
    const newObjective = await state.createObjective(title, description, priority, goalId, targetDate);
    if (newObjective) { setShowObjectiveForm(false); state.selectObjective(newObjective); }
  };

  const handleCreateTask = async (title: string, description: string, priority: string, dueDate: string, objectiveId: string | null, isRecurring: boolean) => {
    const newTask = await state.createTask(title, description, priority, dueDate, objectiveId, isRecurring);
    if (newTask) setShowTaskForm(false);
  };

  const handleConvertVisionToGoal = async (vision: Vision) => { await state.convertVisionToGoal(vision, null); };
  const handleConvertGoalToVision = async (goal: Goal) => { await state.convertGoalToVision(goal); };
  const handleConvertGoalToObjective = async (goal: Goal) => { await state.convertGoalToObjective(goal, null); };
  const handleConvertObjectiveToGoal = async (objective: Objective) => { await state.convertObjectiveToGoal(objective, null); };
  const handleConvertObjectiveToTask = async (objective: Objective) => { await state.convertObjectiveToTask(objective, null); };
  const handleConvertTaskToObjective = async (task: Task) => { await state.convertTaskToObjective(task, null); };

  const tabs = [
    { id: 'vision' as const, label: t('objectives.vision'), icon: Eye, count: state.visions.length },
    { id: 'goals' as const, label: t('nav.goals'), icon: Target, count: state.goals.length },
    { id: 'objectives' as const, label: t('objectives.objective'), icon: Flag, count: state.objectives.length },
    { id: 'tasks' as const, label: t('objectives.tasks'), icon: ListTodo, count: state.tasks.length },
  ];

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header title={t('nav.goals')} />
      
      <div className="flex-1 flex flex-col gap-4 p-4 max-w-7xl mx-auto w-full pb-24">
        <div className="lg:hidden flex gap-1 p-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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

        <div className="flex-1 flex gap-4 overflow-x-auto lg:overflow-x-hidden w-full min-w-0">
          <div className={`${activeTab === 'vision' ? 'flex' : 'hidden'} lg:flex flex-1 lg:min-w-[240px] max-w-full shrink`}>
            <VisionColumn
              visions={state.visions}
              selectedVisionId={state.selectionPath.visionId}
              hasAnySelection={hasAnySelection}
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
              onConvertToGoal={handleConvertVisionToGoal}
              goals={state.goals}
              objectives={state.objectives}
              tasks={state.tasks}
            />
          </div>

          <div className={`${activeTab === 'goals' ? 'flex' : 'hidden'} lg:flex flex-1 lg:min-w-[240px] max-w-full shrink`}>
            <GoalColumn
              goals={state.goals}
              objectives={state.objectives}
              visions={state.visions}
              selectedVisionId={state.selectionPath.visionId}
              selectedGoalId={state.selectionPath.goalId}
              hasAnySelection={hasAnySelection}
              isInSelectedFamily={state.isInSelectedFamily}
              editingGoalId={editingGoalId}
              setEditingGoalId={setEditingGoalId}
              onSelectGoal={state.selectGoal}
              onCreateGoal={() => setShowGoalForm(true)}
              onUpdateGoal={state.updateGoal}
              onDeleteGoal={state.deleteGoal}
              onToggleGoalStatus={state.toggleGoalStatus}
              onTitleClick={handleTitleClick}
              getGoalDescendantCounts={state.getGoalDescendantCounts}
              onConvertToVision={handleConvertGoalToVision}
              onConvertToObjective={handleConvertGoalToObjective}
              onCreateObjectiveForGoal={async (goalId, title, description, priority) => {
                await state.createObjective(title, description, priority, goalId, '');
                await state.reloadObjectives();
              }}
              selectedVision={state.selectedVision}
            />
          </div>

          <div className={`${activeTab === 'objectives' ? 'flex' : 'hidden'} lg:flex flex-1 lg:min-w-[240px] max-w-full shrink`}>
            <ObjectiveColumn
              objectives={state.objectives}
              goals={state.goals}
              selectedGoalId={state.selectionPath.goalId}
              selectedObjectiveId={state.selectionPath.objectiveId}
              hasAnySelection={hasAnySelection}
              isInSelectedFamily={state.isInSelectedFamily}
              editingObjectiveId={editingObjectiveId}
              setEditingObjectiveId={setEditingObjectiveId}
              onSelectObjective={state.selectObjective}
              onCreateObjective={() => setShowObjectiveForm(true)}
              onUpdateObjective={state.updateObjective}
              onDeleteObjective={state.deleteObjective}
              onToggleObjectiveStatus={state.toggleObjectiveStatus}
              onTitleClick={handleTitleClick}
              getObjectiveDescendantCounts={state.getObjectiveDescendantCounts}
              onConvertToGoal={handleConvertObjectiveToGoal}
              onConvertToTask={handleConvertObjectiveToTask}
              onCreateTaskForObjective={async (objectiveId, title, description, priority) => {
                await state.createTask(title, description, priority, '', objectiveId, false);
                await state.reloadTasks();
              }}
              selectedGoal={state.selectedGoal}
              taskCounts={state.taskCounts}
            />
          </div>

          <div className={`${activeTab === 'tasks' ? 'flex' : 'hidden'} lg:flex flex-1 lg:min-w-[240px] max-w-full shrink`}>
            <TaskColumn
              tasks={state.tasks}
              objectives={state.objectives}
              selectedObjectiveId={state.selectionPath.objectiveId}
              selectedTaskId={state.selectionPath.taskId}
              hasAnySelection={hasAnySelection}
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
              onConvertToObjective={handleConvertTaskToObjective}
              selectedObjective={state.selectedObjective}
            />
          </div>
        </div>
      </div>

      {showVisionForm && <VisionForm onClose={() => setShowVisionForm(false)} onCreate={handleCreateVision} />}
      {showGoalForm && <GoalForm onClose={() => setShowGoalForm(false)} onCreate={handleCreateGoal} visions={state.visions} selectedVision={state.selectedVision} />}
      {showObjectiveForm && <ObjectiveForm onClose={() => setShowObjectiveForm(false)} onCreate={handleCreateObjective} goals={state.goals} selectedGoal={state.selectedGoal} />}
      {showTaskForm && <TaskForm onClose={() => setShowTaskForm(false)} onCreate={handleCreateTask} objectives={state.objectives} selectedObjective={state.selectedObjective} />}

      <Modal isOpen={!!actionModal.type} onClose={() => setActionModal({ type: null, title: '', description: '' })} title={t('objectives.createFrom').replace('{{title}}', actionModal.title)}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('objectives.chooseHowToExplore').replace('{{type}}', actionModal.type || '')}
        </p>
        <div className="space-y-3">
          <button
            onClick={handleCreateMindMap}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{t('objectives.createMindMap')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('objectives.createMindMapDescription')}</div>
            </div>
          </button>
          <button
            onClick={handleCreateIdea}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{t('objectives.createIdea')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('objectives.createIdeaDescription')}</div>
            </div>
          </button>
        </div>
      </Modal>
    </div>
  );
}
