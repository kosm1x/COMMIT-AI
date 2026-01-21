import { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LayoutGrid, Network, Loader2 } from 'lucide-react';
import KanbanView from '../components/map/KanbanView';
import { Header } from '../components/ui';

// Lazy load MindMapView - it imports mermaid/cytoscape (1MB+ combined)
const MindMapView = lazy(() => import('../components/map/MindMapView'));

type ViewMode = 'kanban' | 'mindmap';

interface NavigationState {
  viewMode?: ViewMode;
  scrollTo?: 'vision' | 'goal' | 'objective' | 'task';
  selectItem?: { id: string; type: 'vision' | 'goal' | 'objective' | 'task' };
}

export default function Map() {
  const { t } = useLanguage();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  
  const navState = location.state as NavigationState | null;
  const scrollTo = navState?.scrollTo;
  const selectItem = navState?.selectItem;

  useEffect(() => {
    if (location.state?.viewMode) {
      setViewMode(location.state.viewMode);
    } else if (location.pathname === '/mindmap') {
      setViewMode('mindmap');
    } else if (location.pathname === '/boards') {
      setViewMode('kanban');
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header 
        title={t('map.boards')}
        rightAction={
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{t('map.kanban')}</span>
            </button>
            <button
              onClick={() => setViewMode('mindmap')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'mindmap'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Network className="w-4 h-4" />
              <span className="hidden sm:inline">{t('map.mindMap')}</span>
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 pb-24">
        <div className="h-[calc(100vh-10rem)] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {viewMode === 'kanban' ? (
            <KanbanView initialScrollTo={scrollTo} initialSelectItem={selectItem} />
          ) : (
            <Suspense fallback={
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
                </div>
              </div>
            }>
              <MindMapView />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
