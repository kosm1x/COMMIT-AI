import { createContext, useContext, useEffect, useState } from 'react';
import { savePreferencesToLocalStorage, savePreferencesToDB } from '../services/userPreferencesService';
import { supabase } from '../lib/supabase';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize from localStorage or system preference
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) return stored;
    
    // Default to dark theme
    return 'dark';
  });

  // Listen for preferences loaded event from AuthContext
  useEffect(() => {
    const handlePreferencesLoaded = () => {
      console.log('[ThemeContext] Preferences loaded event received');
      const stored = localStorage.getItem('theme') as Theme | null;
      console.log('[ThemeContext] Stored theme:', stored);
      if (stored) {
        console.log('[ThemeContext] Updating theme to:', stored);
        setTheme(stored);
      }
    };

    window.addEventListener('preferencesLoaded', handlePreferencesLoaded);
    return () => window.removeEventListener('preferencesLoaded', handlePreferencesLoaded);
  }, []);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Persist to localStorage
    localStorage.setItem('theme', theme);
    savePreferencesToLocalStorage({ theme });

    // Save to database if user is signed in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        savePreferencesToDB(user.id, { theme });
      }
    });
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

