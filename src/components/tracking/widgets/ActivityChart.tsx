import { TrendingUp } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCreativeData } from '../../../hooks/useCreativeData';

interface ActivityChartProps {
  selectedDate: Date;
  viewMode: 'daily' | 'weekly' | 'monthly';
}

export default function ActivityChart({ selectedDate, viewMode }: ActivityChartProps) {
  const { t, language } = useLanguage();
  const { dailyActivity, stats, loading } = useCreativeData(selectedDate, viewMode);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getActivityColor = (count: number, max: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = (count / max) * 100;
    if (intensity < 25) return 'bg-yellow-200 dark:bg-yellow-900/40';
    if (intensity < 50) return 'bg-yellow-400 dark:bg-yellow-800/60';
    if (intensity < 75) return 'bg-orange-500 dark:bg-orange-700/80';
    return 'bg-orange-600 dark:bg-orange-600';
  };

  if (loading) {
    return <div className="glass-card p-6 border border-white/40 dark:border-white/10 h-64 animate-pulse bg-white/20 dark:bg-white/5" />;
  }

  return (
    <div className="glass-card p-6 border border-white/40 dark:border-white/10">
      <h3 className="text-lg font-heading font-bold text-text-primary mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-accent-primary" />
        {t('tracking.activityOverTime')}
      </h3>
      
      {viewMode === 'daily' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {dailyActivity[0]?.ideas || 0}
              </div>
              <div className="text-sm text-text-secondary">{t('tracking.ideas')}</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {dailyActivity[0]?.mindMaps || 0}
              </div>
              <div className="text-sm text-text-secondary">{t('tracking.mindMaps')}</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatTime(dailyActivity[0]?.timeSpent || 0)}
              </div>
              <div className="text-sm text-text-secondary">{t('tracking.timeActive')}</div>
            </div>
          </div>
        </div>
      ) : viewMode === 'weekly' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {dailyActivity.map((day, index) => {
              const maxDay = Math.max(day.ideas, day.mindMaps, 1);
              return (
                <div key={index} className="space-y-2">
                  <div className="text-center text-xs font-bold text-text-tertiary uppercase">
                    {day.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' })}
                  </div>
                  <div className="space-y-1">
                    <div className="relative h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <div
                        className={`absolute bottom-0 left-0 right-0 ${getActivityColor(day.ideas, maxDay)} transition-all`}
                        style={{ height: `${(day.ideas / maxDay) * 100}%` }}
                        title={`${day.ideas} ${t('tracking.ideas').toLowerCase()}`}
                      />
                      <div
                        className={`absolute bottom-0 left-0 right-0 ${getActivityColor(day.mindMaps, maxDay)} opacity-70 transition-all`}
                        style={{ height: `${(day.mindMaps / maxDay) * 100}%` }}
                        title={`${day.mindMaps} ${t('tracking.mindMaps').toLowerCase()}`}
                      />
                    </div>
                    <div className="text-center text-xs text-text-secondary">
                      <div>{t('tracking.ideasAbbrev')} {day.ideas}</div>
                      <div>{t('tracking.mindMapsAbbrev')} {day.mindMaps}</div>
                      <div className="text-[10px] text-text-tertiary">{formatTime(day.timeSpent)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2 mb-3">
            {[t('tracking.sun'), t('tracking.mon'), t('tracking.tue'), t('tracking.wed'), t('tracking.thu'), t('tracking.fri'), t('tracking.sat')].map((day, index) => (
              <div key={index} className="text-center text-xs font-bold text-text-tertiary uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {dailyActivity.map((day, index) => {
              const totalActivity = day.ideas + day.mindMaps;
              const maxActivity = Math.max(...dailyActivity.map(d => d.ideas + d.mindMaps), 1);
              return (
                <div
                  key={index}
                  className={`aspect-square rounded-lg border-2 transition-all hover:scale-110 cursor-pointer relative group ${getActivityColor(totalActivity, maxActivity)}`}
                  title={`${day.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'es' ? 'es-ES' : 'en-US')}: ${day.ideas} ${t('tracking.ideas').toLowerCase()}, ${day.mindMaps} ${t('tracking.mindMaps').toLowerCase()}, ${formatTime(day.timeSpent)} ${t('tracking.timeActive').toLowerCase()}`}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                    <span className={`text-xs font-bold ${totalActivity > 0 ? 'text-white drop-shadow-sm' : 'text-text-tertiary'}`}>
                      {day.date.getDate()}
                    </span>
                    {totalActivity > 0 && (
                      <span className="text-[10px] text-white/90 drop-shadow-sm mt-0.5">
                        {day.ideas + day.mindMaps}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-text-tertiary">
            <span className="font-medium">{t('tracking.lessActive')}</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700" />
              <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-900/40 rounded" />
              <div className="w-4 h-4 bg-yellow-400 dark:bg-yellow-800/60 rounded" />
              <div className="w-4 h-4 bg-orange-500 dark:bg-orange-700/80 rounded" />
              <div className="w-4 h-4 bg-orange-600 dark:bg-orange-600 rounded" />
            </div>
            <span className="font-medium">{t('tracking.moreActive')}</span>
          </div>
        </div>
      )}

      {/* Mini Trend Summary */}
      <div className="mt-6 pt-4 border-t border-border-secondary">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-text-tertiary mb-1">{t('tracking.ideas')}</div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-yellow-500 h-1.5 rounded-full"
                style={{ width: `${Math.min((stats.ideasThisPeriod / Math.max(stats.totalIdeas, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-text-tertiary mb-1">{t('tracking.mindMaps')}</div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-orange-500 h-1.5 rounded-full"
                style={{ width: `${Math.min((stats.mindMapsThisPeriod / Math.max(stats.totalMindMaps, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-text-tertiary mb-1">{t('tracking.timeSpent')}</div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${Math.min((stats.timeSpentThisPeriod / Math.max(stats.totalTimeSpent, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

