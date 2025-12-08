import { useState, useEffect, useCallback, memo } from 'react';
import { GripVertical, RotateCcw } from 'lucide-react';
import StatsOverview from './widgets/StatsOverview';
import RecurringTasksGrid from './widgets/RecurringTasksGrid';
import UpcomingDeadlines from './widgets/UpcomingDeadlines';
import CreativeStats from './widgets/CreativeStats';
import ActivityChart from './widgets/ActivityChart';
import WordCloud from './widgets/WordCloud';
import EmotionChart from './widgets/EmotionChart';
import KanbanOverview from './KanbanOverview';
import DailyView from './DailyView';
import WeeklyView from './WeeklyView';
import MonthlyView from './MonthlyView';

interface DashboardLayoutProps {
  activeTab: 'daily' | 'weekly' | 'monthly';
  selectedDate: Date;
}

type WidgetId = 
  | 'stats_overview' 
  | 'recurring_tasks'
  | 'deadlines' 
  | 'main_view' 
  | 'creative_stats' 
  | 'activity_chart'
  | 'word_density'
  | 'emotion_chart'
  | 'kanban_overview';

interface LayoutConfig {
  top: WidgetId[];
  left: WidgetId[];
  right: WidgetId[];
}

const DEFAULT_LAYOUT: LayoutConfig = {
  top: ['recurring_tasks', 'stats_overview'],
  left: ['main_view', 'activity_chart', 'emotion_chart'],
  right: ['deadlines', 'creative_stats', 'kanban_overview', 'word_density'],
};

const DRAG_DATA_TYPE = 'application/x-widget-drag';

// Memoized widget renderer - prevents re-renders when layout changes
interface WidgetRendererProps {
  id: WidgetId;
  activeTab: 'daily' | 'weekly' | 'monthly';
  selectedDate: Date;
}

const WidgetRenderer = memo(function WidgetRenderer({ id, activeTab, selectedDate }: WidgetRendererProps) {
  switch (id) {
    case 'stats_overview':
      return <StatsOverview />;
    case 'recurring_tasks':
      return <RecurringTasksGrid />;
    case 'deadlines':
      return <UpcomingDeadlines />;
    case 'creative_stats':
      return <CreativeStats selectedDate={selectedDate} viewMode={activeTab} />;
    case 'activity_chart':
      return <ActivityChart selectedDate={selectedDate} viewMode={activeTab} />;
    case 'word_density':
      return <WordCloud selectedDate={selectedDate} viewMode={activeTab} />;
    case 'emotion_chart':
      return <EmotionChart selectedDate={selectedDate} viewMode={activeTab} />;
    case 'main_view':
      return (
        <div className="glass-card border border-white/40 dark:border-white/10 overflow-hidden min-h-[400px] p-6">
          {activeTab === 'daily' && <DailyView selectedDate={selectedDate} />}
          {activeTab === 'weekly' && <WeeklyView selectedDate={selectedDate} />}
          {activeTab === 'monthly' && <MonthlyView selectedDate={selectedDate} />}
        </div>
      );
    case 'kanban_overview':
      return (
        <div className="glass-card p-6 border border-white/40 dark:border-white/10">
          <h3 className="font-heading font-bold text-lg text-text-primary mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-accent-primary" />
            Status Distribution
          </h3>
          <KanbanOverview />
        </div>
      );
    default:
      return null;
  }
});

// Memoized draggable wrapper - stable component identity
interface DraggableWidgetProps {
  id: WidgetId;
  zone: keyof LayoutConfig;
  isDropTarget: boolean;
  activeTab: 'daily' | 'weekly' | 'monthly';
  selectedDate: Date;
  onDragStart: (e: React.DragEvent, id: WidgetId, zone: keyof LayoutConfig) => void;
  onDragOver: (e: React.DragEvent, id: WidgetId, zone: keyof LayoutConfig) => void;
  onDrop: (e: React.DragEvent, id: WidgetId, zone: keyof LayoutConfig) => void;
  onDragEnd: () => void;
  onDragLeave: () => void;
}

const DraggableWidget = memo(function DraggableWidget({
  id,
  zone,
  isDropTarget,
  activeTab,
  selectedDate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDragLeave,
}: DraggableWidgetProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, id, zone)}
      onDragOver={(e) => onDragOver(e, id, zone)}
      onDrop={(e) => onDrop(e, id, zone)}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      className={`group relative transition-all duration-200 ${
        isDropTarget ? 'ring-2 ring-accent-primary ring-offset-2 dark:ring-offset-black rounded-xl' : ''
      }`}
    >
      <div 
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1.5 bg-white/80 dark:bg-black/80 rounded-lg shadow-sm hover:bg-white dark:hover:bg-black"
      >
        <GripVertical className="w-4 h-4 text-text-secondary" />
      </div>
      <WidgetRenderer id={id} activeTab={activeTab} selectedDate={selectedDate} />
    </div>
  );
});

export default function DashboardLayout({ activeTab, selectedDate }: DashboardLayoutProps) {
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [dragOverTarget, setDragOverTarget] = useState<{ id: WidgetId | null; zone: keyof LayoutConfig } | null>(null);

  useEffect(() => {
    const savedLayout = localStorage.getItem('tracking_dashboard_layout_v4');
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        const allWidgets = new Set([...parsed.top, ...parsed.left, ...parsed.right]);
        if (allWidgets.size >= 8) { 
          setLayout(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved layout', e);
      }
    }
  }, []);

  const saveLayout = useCallback((newLayout: LayoutConfig) => {
    setLayout(newLayout);
    localStorage.setItem('tracking_dashboard_layout_v4', JSON.stringify(newLayout));
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, id: WidgetId, sourceZone: keyof LayoutConfig) => {
    e.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify({ id, sourceZone }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleWidgetDragOver = useCallback((e: React.DragEvent, targetId: WidgetId, targetZone: keyof LayoutConfig) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget({ id: targetId, zone: targetZone });
  }, []);

  const handleWidgetDrop = useCallback((e: React.DragEvent, targetId: WidgetId, targetZone: keyof LayoutConfig) => {
    e.preventDefault();
    e.stopPropagation();
    
    const data = e.dataTransfer.getData(DRAG_DATA_TYPE);
    if (!data) return;

    const { id: draggedId, sourceZone } = JSON.parse(data) as { id: WidgetId; sourceZone: keyof LayoutConfig };
    
    if (draggedId === targetId) {
      setDragOverTarget(null);
      return;
    }

    setLayout(currentLayout => {
      if (sourceZone === targetZone) {
        // Reordering within the same zone
        const currentList = [...currentLayout[targetZone]];
        const draggedIndex = currentList.indexOf(draggedId);
        const targetIndex = currentList.indexOf(targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) {
          return currentLayout;
        }

        // Remove dragged item and reinsert at target position
        currentList.splice(draggedIndex, 1);
        currentList.splice(targetIndex, 0, draggedId);

        const newLayout = {
          ...currentLayout,
          [targetZone]: currentList,
        };
        localStorage.setItem('tracking_dashboard_layout_v4', JSON.stringify(newLayout));
        return newLayout;
      } else {
        // Moving to different zone
        const newSourceList = currentLayout[sourceZone].filter(id => id !== draggedId);
        const newTargetList = [...currentLayout[targetZone]];

        // Find the target index and insert before it
        const targetIndex = newTargetList.indexOf(targetId);
        if (targetIndex !== -1) {
          newTargetList.splice(targetIndex, 0, draggedId);
        } else {
          newTargetList.push(draggedId);
        }

        const newLayout = {
          ...currentLayout,
          [sourceZone]: newSourceList,
          [targetZone]: newTargetList,
        };
        localStorage.setItem('tracking_dashboard_layout_v4', JSON.stringify(newLayout));
        return newLayout;
      }
    });

    setDragOverTarget(null);
  }, []);

  const handleZoneDrop = useCallback((e: React.DragEvent, zone: keyof LayoutConfig) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData(DRAG_DATA_TYPE);
    if (!data) return;

    const { id: draggedId, sourceZone } = JSON.parse(data) as { id: WidgetId; sourceZone: keyof LayoutConfig };

    setLayout(currentLayout => {
      const newSourceList = currentLayout[sourceZone].filter(id => id !== draggedId);
      const newTargetList = sourceZone === zone ? [...newSourceList] : [...currentLayout[zone]];
      
      if (!newTargetList.includes(draggedId)) {
        newTargetList.push(draggedId);
      }

      const newLayout = {
        ...currentLayout,
        [sourceZone]: newSourceList,
        [zone]: newTargetList,
      };
      localStorage.setItem('tracking_dashboard_layout_v4', JSON.stringify(newLayout));
      return newLayout;
    });
    
    setDragOverTarget(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  const resetLayout = useCallback(() => {
    saveLayout(DEFAULT_LAYOUT);
  }, [saveLayout]);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-tertiary hidden sm:block">Drag widgets to customize layout</span>
        <button
          onClick={resetLayout}
          className="flex items-center gap-2 text-xs text-text-tertiary hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Layout
        </button>
      </div>

      {/* Top Zone */}
      <div
        className={`space-y-4 lg:space-y-6 min-h-[50px] rounded-xl border-2 transition-colors p-1 lg:p-2 ${
          dragOverTarget?.zone === 'top' && !dragOverTarget?.id 
            ? 'border-accent-primary bg-accent-primary/5' 
            : 'border-transparent'
        }`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleZoneDrop(e, 'top')}
      >
        {layout.top.map((id) => (
          <DraggableWidget
            key={id}
            id={id}
            zone="top"
            isDropTarget={dragOverTarget?.id === id && dragOverTarget?.zone === 'top'}
            activeTab={activeTab}
            selectedDate={selectedDate}
            onDragStart={handleDragStart}
            onDragOver={handleWidgetDragOver}
            onDrop={handleWidgetDrop}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
          />
        ))}
        {layout.top.length === 0 && (
          <div className="h-20 lg:h-24 flex items-center justify-center border-2 border-dashed border-border-secondary rounded-xl p-4 text-text-tertiary text-sm">
            Drop widgets here
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left Column (Main) */}
        <div
          className={`lg:col-span-2 space-y-4 lg:space-y-6 min-h-[200px] rounded-xl border-2 transition-colors p-1 lg:p-2 ${
            dragOverTarget?.zone === 'left' && !dragOverTarget?.id 
              ? 'border-accent-primary bg-accent-primary/5' 
              : 'border-transparent'
          }`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleZoneDrop(e, 'left')}
        >
          {layout.left.map((id) => (
            <DraggableWidget
              key={id}
              id={id}
              zone="left"
              isDropTarget={dragOverTarget?.id === id && dragOverTarget?.zone === 'left'}
              activeTab={activeTab}
              selectedDate={selectedDate}
              onDragStart={handleDragStart}
              onDragOver={handleWidgetDragOver}
              onDrop={handleWidgetDrop}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
            />
          ))}
          {layout.left.length === 0 && (
            <div className="h-full min-h-[200px] flex items-center justify-center border-2 border-dashed border-border-secondary rounded-xl p-8 text-text-tertiary text-sm">
              Drop widgets here
            </div>
          )}
        </div>

        {/* Right Column (Sidebar) */}
        <div
          className={`space-y-4 lg:space-y-6 min-h-[200px] rounded-xl border-2 transition-colors p-1 lg:p-2 ${
            dragOverTarget?.zone === 'right' && !dragOverTarget?.id 
              ? 'border-accent-primary bg-accent-primary/5' 
              : 'border-transparent'
          }`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleZoneDrop(e, 'right')}
        >
          {layout.right.map((id) => (
            <DraggableWidget
              key={id}
              id={id}
              zone="right"
              isDropTarget={dragOverTarget?.id === id && dragOverTarget?.zone === 'right'}
              activeTab={activeTab}
              selectedDate={selectedDate}
              onDragStart={handleDragStart}
              onDragOver={handleWidgetDragOver}
              onDrop={handleWidgetDrop}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
            />
          ))}
          {layout.right.length === 0 && (
            <div className="h-full min-h-[200px] flex items-center justify-center border-2 border-dashed border-border-secondary rounded-xl p-8 text-text-tertiary text-sm">
              Drop widgets here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PieChartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
