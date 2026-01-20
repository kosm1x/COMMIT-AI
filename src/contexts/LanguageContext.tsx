import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { Language, getTranslation, TranslationKeys } from '../i18n/translations';
import { savePreferencesToLocalStorage, savePreferencesToDB } from '../services/userPreferencesService';
import { supabase } from '../lib/supabase';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'commit_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage, default to 'en'
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'es' || stored === 'zh') {
      return stored;
    }
    return 'en';
  });

  // Recalculate translations whenever language changes
  const translations = useMemo(() => getTranslation(language), [language]);

  // Listen for preferences loaded event from AuthContext
  useEffect(() => {
    const handlePreferencesLoaded = () => {
      console.log('[LanguageContext] Preferences loaded event received');
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      console.log('[LanguageContext] Stored language:', stored);
      if (stored === 'en' || stored === 'es' || stored === 'zh') {
        console.log('[LanguageContext] Updating language to:', stored);
        setLanguageState(stored);
      }
    };

    window.addEventListener('preferencesLoaded', handlePreferencesLoaded);
    return () => window.removeEventListener('preferencesLoaded', handlePreferencesLoaded);
  }, []);

  useEffect(() => {
    console.log('Language changed to:', language, 'saving to localStorage and DB');
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    savePreferencesToLocalStorage({ language });

    // Save to database if user is signed in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        savePreferencesToDB(user.id, { language });
      }
    });
  }, [language]);

  const setLanguage = (lang: Language) => {
    console.log('LanguageContext.setLanguage called with:', lang, 'current:', language);
    setLanguageState(lang);
  };

  // Translation function with nested key support (e.g., 'login.welcomeBack')
  const t = useMemo(() => {
    return (key: string): string => {
      const keys = key.split('.');
      let value: any = translations;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return key; // Return key if translation not found
        }
      }
      
      return typeof value === 'string' ? value : key;
    };
  }, [translations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

