import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import VisionsKanban from './VisionsKanban';
import GoalsKanban from './GoalsKanban';
import ObjectivesKanban from './ObjectivesKanban';
import TasksKanban from './TasksKanban';

interface KanbanViewProps {
  initialScrollTo?: 'vision' | 'goal' | 'objective' | 'task';
  initialSelectItem?: { id: string; type: 'vision' | 'goal' | 'objective' | 'task' };
}

export default function KanbanView({ initialScrollTo, initialSelectItem }: KanbanViewProps) {
  const { t } = useLanguage();
  const [sections, setSections] = useState({
    vision: false,
    goals: false,
    objectives: false,
    tasks: true, // Tasks open by default
  });
  const [selectedVisionId, setSelectedVisionId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  // Refs for scrolling to sections
  const visionRef = useRef<HTMLDivElement>(null);
  const goalsRef = useRef<HTMLDivElement>(null);
  const objectivesRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);

  // Handle initial scroll to section
  useEffect(() => {
    if (initialScrollTo) {
      // Expand the target section
      setSections(prev => ({ ...prev, [initialScrollTo === 'goal' ? 'goals' : initialScrollTo + 's']: true }));
      
      // Scroll to the section after a short delay to allow rendering
      setTimeout(() => {
        const refMap = {
          vision: visionRef,
          goal: goalsRef,
          objective: objectivesRef,
          task: tasksRef,
        };
        const targetRef = refMap[initialScrollTo];
        targetRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [initialScrollTo]);

  // Handle initial item selection - scroll to the specific card
  useEffect(() => {
    if (initialSelectItem) {
      const { id, type } = initialSelectItem;
      
      // Expand the appropriate section and set selection
      switch (type) {
        case 'vision':
          setSections(prev => ({ ...prev, vision: true }));
          setSelectedVisionId(id);
          break;
        case 'goal':
          setSections(prev => ({ ...prev, goals: true }));
          setSelectedGoalId(id);
          break;
        case 'objective':
          setSections(prev => ({ ...prev, objectives: true }));
          setSelectedObjectiveId(id);
          break;
        case 'task':
          setSections(prev => ({ ...prev, tasks: true }));
          setSelectedTaskId(id);
          break;
      }
      
      // Set highlighted item after a delay to ensure data has loaded
      setTimeout(() => {
        setHighlightedItemId(id);
      }, 300);
      
      // Clear the highlight after animation completes
      setTimeout(() => {
        setHighlightedItemId(null);
      }, 5000);
    }
  }, [initialSelectItem]);

  const toggleSection = (section: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectVision = (visionId: string | null) => {
    setSelectedVisionId(visionId);
    setSelectedGoalId(null); // Clear goal selection when vision changes
    setSelectedObjectiveId(null); // Clear objective selection when vision changes
    setSelectedTaskId(null); // Clear task selection when vision changes
  };

  const handleSelectGoal = (goalId: string | null) => {
    setSelectedGoalId(goalId);
    setSelectedObjectiveId(null); // Clear objective selection when goal changes
    setSelectedTaskId(null); // Clear task selection when goal changes
  };

  const handleSelectObjective = (objectiveId: string | null) => {
    setSelectedObjectiveId(objectiveId);
    setSelectedTaskId(null); // Clear task selection when objective changes
  };

  const handleSelectTask = (taskId: string | null) => {
    setSelectedTaskId(taskId);
  };

  const clearFilter = () => {
    setSelectedVisionId(null);
    setSelectedGoalId(null);
    setSelectedObjectiveId(null);
    setSelectedTaskId(null);
  };

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 custom-scrollbar">
      {/* Filter Bar */}
      {(selectedVisionId || selectedGoalId || selectedObjectiveId || selectedTaskId) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">{t('map.filteredBy')}</span>
            {selectedVisionId && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">{t('objectives.vision')}</span>}
            {selectedGoalId && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">{t('objectives.goal')}</span>}
            {selectedObjectiveId && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">{t('objectives.objective')}</span>}
            {selectedTaskId && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">{t('objectives.task')}</span>}
          </div>
          <button
            onClick={clearFilter}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
            {t('map.clear')}
          </button>
        </div>
      )}

      {/* Visions Section */}
      <div ref={visionRef} className="space-y-4 scroll-mt-4">
        <button
          onClick={() => toggleSection('vision')}
          className="flex items-center gap-2 text-sm font-bold text-text-secondary uppercase tracking-wider hover:text-accent-primary transition-colors"
        >
          {sections.vision ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('map.visionBoard')}
        </button>
        {sections.vision && (
          <div className="animate-slide-up">
            <VisionsKanban
              selectedVisionId={selectedVisionId}
              selectedGoalId={selectedGoalId}
              selectedObjectiveId={selectedObjectiveId}
              selectedTaskId={selectedTaskId}
              onSelectVision={handleSelectVision}
              highlightedItemId={highlightedItemId}
            />
          </div>
        )}
      </div>

      {/* Goals Section */}
      <div ref={goalsRef} className="space-y-4 scroll-mt-4">
        <button
          onClick={() => toggleSection('goals')}
          className="flex items-center gap-2 text-sm font-bold text-text-secondary uppercase tracking-wider hover:text-accent-primary transition-colors"
        >
          {sections.goals ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('map.goalsBoard')}
        </button>
        {sections.goals && (
          <div className="animate-slide-up">
            <GoalsKanban
              selectedVisionId={selectedVisionId}
              selectedGoalId={selectedGoalId}
              selectedObjectiveId={selectedObjectiveId}
              selectedTaskId={selectedTaskId}
              onSelectVision={handleSelectVision}
              onSelectGoal={handleSelectGoal}
              highlightedItemId={highlightedItemId}
            />
          </div>
        )}
      </div>

      {/* Objectives Section */}
      <div ref={objectivesRef} className="space-y-4 scroll-mt-4">
        <button
          onClick={() => toggleSection('objectives')}
          className="flex items-center gap-2 text-sm font-bold text-text-secondary uppercase tracking-wider hover:text-accent-primary transition-colors"
        >
          {sections.objectives ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('map.objectivesBoard')}
        </button>
        {sections.objectives && (
          <div className="animate-slide-up">
            <ObjectivesKanban
              selectedVisionId={selectedVisionId}
              selectedGoalId={selectedGoalId}
              selectedObjectiveId={selectedObjectiveId}
              selectedTaskId={selectedTaskId}
              onSelectObjective={handleSelectObjective}
              highlightedItemId={highlightedItemId}
            />
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div ref={tasksRef} className="space-y-4 scroll-mt-4">
        <button
          onClick={() => toggleSection('tasks')}
          className="flex items-center gap-2 text-sm font-bold text-text-secondary uppercase tracking-wider hover:text-accent-primary transition-colors"
        >
          {sections.tasks ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('map.tasksBoard')}
        </button>
        {sections.tasks && (
          <div className="animate-slide-up">
            <TasksKanban
              selectedVisionId={selectedVisionId}
              selectedGoalId={selectedGoalId}
              selectedObjectiveId={selectedObjectiveId}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              highlightedItemId={highlightedItemId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
