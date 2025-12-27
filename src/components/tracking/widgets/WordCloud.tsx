import { BookOpen } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCreativeData } from '../../../hooks/useCreativeData';

interface WordCloudProps {
  selectedDate: Date;
  viewMode: 'daily' | 'weekly' | 'monthly';
}

export default function WordCloud({ selectedDate, viewMode }: WordCloudProps) {
  const { t } = useLanguage();
  const { wordFrequencies, loading } = useCreativeData(selectedDate, viewMode);

  if (loading) {
    return <div className="glass-card p-6 border border-white/40 dark:border-white/10 h-64 animate-pulse bg-white/20 dark:bg-white/5" />;
  }

  return (
    <div className="glass-card p-6 border border-white/40 dark:border-white/10">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="w-5 h-5 text-accent-primary" />
        <h3 className="text-lg font-heading font-bold text-text-primary">{t('tracking.wordDensity')}</h3>
      </div>
      {wordFrequencies.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">{t('tracking.noJournalEntriesFound')}</p>
          <p className="text-xs mt-1">{t('tracking.startJournalingToSeeFrequency')}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 p-4 bg-bg-tertiary rounded-lg min-h-[200px] items-center justify-center">
          {wordFrequencies.map((item, index) => {
            const maxCount = wordFrequencies[0]?.count || 1;
            const size = Math.max(12, Math.min(32, 12 + (item.count / maxCount) * 20));
            const opacity = 0.6 + (item.count / maxCount) * 0.4;
            const colorIndex = index % 5;
            const colors = [
              'text-yellow-600 dark:text-yellow-400',
              'text-orange-600 dark:text-orange-400',
              'text-blue-600 dark:text-blue-400',
              'text-purple-600 dark:text-purple-400',
              'text-green-600 dark:text-green-400',
            ];
            
            return (
              <span
                key={item.word}
                className={`font-medium ${colors[colorIndex]} whitespace-nowrap`}
                style={{
                  fontSize: `${size}px`,
                  opacity,
                  fontWeight: item.count > maxCount * 0.5 ? 'bold' : 'normal',
                }}
                title={`${item.word}: ${item.count} ${t('tracking.occurrences')}`}
              >
                {item.word}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

