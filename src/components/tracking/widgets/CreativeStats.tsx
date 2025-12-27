import { Lightbulb, Network, Clock } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCreativeData } from '../../../hooks/useCreativeData';

interface CreativeStatsProps {
  selectedDate: Date;
  viewMode: 'daily' | 'weekly' | 'monthly';
}

export default function CreativeStats({ selectedDate, viewMode }: CreativeStatsProps) {
  const { t } = useLanguage();
  const { stats, loading } = useCreativeData(selectedDate, viewMode);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card p-5 border border-white/40 dark:border-white/10 h-32 animate-pulse bg-white/20 dark:bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="glass-card p-5 border border-white/40 dark:border-white/10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Lightbulb className="w-24 h-24 text-yellow-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
            <Lightbulb className="w-5 h-5" />
            <span className="font-bold text-sm">{t('tracking.ideasGenerated')}</span>
          </div>
          <div className="text-3xl font-heading font-bold text-text-primary">{stats.totalIdeas}</div>
          <div className="text-xs text-text-tertiary mt-1">
            {stats.ideasThisPeriod} {viewMode === 'daily' ? t('tracking.thisDay') : viewMode === 'weekly' ? t('tracking.thisWeek') : t('tracking.thisMonth')}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 border border-white/40 dark:border-white/10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Network className="w-24 h-24 text-orange-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
            <Network className="w-5 h-5" />
            <span className="font-bold text-sm">{t('tracking.mindMaps')}</span>
          </div>
          <div className="text-3xl font-heading font-bold text-text-primary">{stats.totalMindMaps}</div>
          <div className="text-xs text-text-tertiary mt-1">
            {stats.mindMapsThisPeriod} {viewMode === 'daily' ? t('tracking.thisDay') : viewMode === 'weekly' ? t('tracking.thisWeek') : t('tracking.thisMonth')}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 border border-white/40 dark:border-white/10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Clock className="w-24 h-24 text-blue-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-bold text-sm">{t('tracking.timeSpent')}</span>
          </div>
          <div className="text-3xl font-heading font-bold text-text-primary">{formatTime(stats.totalTimeSpent)}</div>
          <div className="text-xs text-text-tertiary mt-1">
            {formatTime(stats.timeSpentThisPeriod)} {viewMode === 'daily' ? t('tracking.thisDay') : viewMode === 'weekly' ? t('tracking.thisWeek') : t('tracking.thisMonth')}
          </div>
        </div>
      </div>
    </div>
  );
}

