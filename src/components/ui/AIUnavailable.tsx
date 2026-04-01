import { CloudOff, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface AIUnavailableProps {
  onRetry?: () => void;
  compact?: boolean;
}

export default function AIUnavailable({ onRetry, compact = false }: AIUnavailableProps) {
  const { t } = useLanguage();

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 text-sm text-text-tertiary">
        <CloudOff className="w-4 h-4 shrink-0" />
        <span>{t('ai.unavailable') || 'AI analysis unavailable'}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto text-indigo-500 hover:text-indigo-400 flex items-center gap-1 text-xs font-medium"
            aria-label={t('ai.retry') || 'Try again'}
          >
            <RefreshCw className="w-3 h-3" />
            {t('ai.retry') || 'Retry'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <CloudOff className="w-10 h-10 text-text-tertiary mb-3" />
      <p className="text-sm font-medium text-text-secondary mb-1">
        {t('ai.unavailable') || 'AI analysis unavailable'}
      </p>
      <p className="text-xs text-text-tertiary mb-4 max-w-xs">
        {t('ai.unavailableDetail') || 'The AI service is temporarily unreachable. Your data is safe.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-500 hover:text-indigo-400 border border-indigo-500/30 hover:border-indigo-400/40 rounded-lg transition-colors"
          aria-label={t('ai.retry') || 'Try again'}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('ai.retry') || 'Retry'}
        </button>
      )}
    </div>
  );
}
