import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutGrid, Network } from 'lucide-react';
import KanbanView from '../components/map/KanbanView';
import MindMapView from '../components/map/MindMapView';

type ViewMode = 'kanban' | 'mindmap';

interface NavigationState {
  viewMode?: ViewMode;
  scrollTo?: 'vision' | 'goal' | 'objective' | 'task';
  selectItem?: { id: string; type: 'vision' | 'goal' | 'objective' | 'task' };
}

export default function Map() {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  
  // Extract navigation state for KanbanView
  const navState = location.state as NavigationState | null;
  const scrollTo = navState?.scrollTo;
  const selectItem = navState?.selectItem;

  useEffect(() => {
    // Set view mode from location state or pathname
    if (location.state?.viewMode) {
      setViewMode(location.state.viewMode);
    } else if (location.pathname === '/mindmap') {
      setViewMode('mindmap');
    } else if (location.pathname === '/boards') {
      setViewMode('kanban');
    }
  }, [location]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-heading font-bold text-text-primary">Strategic Map</h1>
          <p className="text-sm lg:text-base text-text-tertiary hidden sm:block">Visualize your goals and connections</p>
        </div>

        <div className="glass-card p-1 flex items-center gap-1 rounded-xl border border-white/40 dark:border-white/10 bg-white dark:bg-black/40 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-white/10 text-accent-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Boards</span>
          </button>
          <button
            onClick={() => setViewMode('mindmap')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'mindmap'
                ? 'bg-white dark:bg-white/10 text-accent-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Mind Map</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 glass-strong border border-white/40 dark:border-white/10 overflow-hidden relative rounded-xl lg:rounded-2xl">
        {viewMode === 'kanban' ? (
          <KanbanView initialScrollTo={scrollTo} initialSelectItem={selectItem} />
        ) : (
          <MindMapView />
        )}
      </div>
    </div>
  );
}
