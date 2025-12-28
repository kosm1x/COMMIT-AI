import { useLanguage } from '../contexts/LanguageContext';

/**
 * Hook for accessing translations
 * Usage: const t = useTranslation(); t('login.welcomeBack')
 */
export function useTranslation() {
  const { t } = useLanguage();
  return t;
}


