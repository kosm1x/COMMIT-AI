import { en } from './en';
import { es } from './es';
import { zh } from './zh';

export type Language = 'en' | 'es' | 'zh';

export type TranslationKeys = typeof en;

export const translations: Record<Language, TranslationKeys> = {
  en,
  es,
  zh,
};

export const getTranslation = (lang: Language): TranslationKeys => {
  return translations[lang] || translations.en;
};

