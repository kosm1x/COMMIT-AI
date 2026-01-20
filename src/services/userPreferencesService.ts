import { supabase } from '../lib/supabase';
import { Language } from '../i18n/translations';

export interface UserPreferences {
  language: Language;
  theme: 'light' | 'dark';
  last_page_visited: string;
}

const PREFS_STORAGE_KEY = 'commit_user_preferences';

/**
 * Save user preferences to database
 */
export async function savePreferencesToDB(userId: string, preferences: Partial<UserPreferences>) {
  try {
    // Use upsert to handle both insert and update in one operation
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        language: preferences.language || 'en',
        theme: preferences.theme || 'dark',
        last_page_visited: preferences.last_page_visited || '/journal',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('[Preferences] Error saving to database:', error);
    } else {
      console.log('[Preferences] Successfully saved to database');
    }
  } catch (error) {
    console.error('[Preferences] Failed to save preferences:', error);
  }
}

/**
 * Load user preferences from database
 */
export async function loadPreferencesFromDB(userId: string): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading user preferences:', error);
      return null;
    }

    if (!data) {
      console.log('[Preferences] No preferences found in database for user');
      return null;
    }

    return {
      language: (data.language || 'en') as Language,
      theme: (data.theme || 'dark') as 'light' | 'dark',
      last_page_visited: data.last_page_visited || '/journal',
    };
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return null;
  }
}

/**
 * Save preferences to localStorage (for immediate use)
 */
export function savePreferencesToLocalStorage(preferences: Partial<UserPreferences>) {
  try {
    const existing = localStorage.getItem(PREFS_STORAGE_KEY);
    const current = existing ? JSON.parse(existing) : {};
    const updated = { ...current, ...preferences };
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));

    // Also save to individual keys for backwards compatibility
    if (preferences.language) {
      localStorage.setItem('commit_language', preferences.language);
    }
    if (preferences.theme) {
      localStorage.setItem('theme', preferences.theme);
    }
    if (preferences.last_page_visited) {
      localStorage.setItem('commit_last_page', preferences.last_page_visited);
    }
  } catch (error) {
    console.error('Failed to save preferences to localStorage:', error);
  }
}

/**
 * Load preferences from localStorage
 */
export function loadPreferencesFromLocalStorage(): UserPreferences | null {
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Fallback to individual keys
    const language = localStorage.getItem('commit_language') as Language | null;
    const theme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const lastPage = localStorage.getItem('commit_last_page');

    if (language || theme || lastPage) {
      return {
        language: language || 'en',
        theme: theme || 'dark',
        last_page_visited: lastPage || '/journal',
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to load preferences from localStorage:', error);
    return null;
  }
}

/**
 * Sync preferences from database to localStorage (called on sign-in)
 * 
 * Priority: localStorage > database > defaults
 * This ensures user's most recent changes (in localStorage) take precedence
 */
export async function syncPreferencesOnSignIn(userId: string): Promise<UserPreferences> {
  console.log('[Preferences] Syncing preferences for user:', userId);
  
  // First, check localStorage for any existing preferences (most recent)
  const localPrefs = loadPreferencesFromLocalStorage();
  console.log('[Preferences] Local preferences:', localPrefs);

  // Then, load from database (fallback for new devices)
  const dbPrefs = await loadPreferencesFromDB(userId);
  console.log('[Preferences] Database preferences:', dbPrefs);

  // localStorage preferences take precedence over database (local is more recent)
  const finalPrefs: UserPreferences = {
    language: localPrefs?.language || dbPrefs?.language || 'en',
    theme: localPrefs?.theme || dbPrefs?.theme || 'dark',
    last_page_visited: localPrefs?.last_page_visited || dbPrefs?.last_page_visited || '/journal',
  };

  console.log('[Preferences] Final merged preferences (local > db > defaults):', finalPrefs);

  // Save merged result to localStorage
  savePreferencesToLocalStorage(finalPrefs);
  
  // Also save back to database to keep them in sync
  await savePreferencesToDB(userId, finalPrefs);

  return finalPrefs;
}

/**
 * Sync preferences from localStorage to database (called before sign-out)
 */
export async function syncPreferencesOnSignOut(userId: string) {
  console.log('[Preferences] Saving preferences before sign-out for user:', userId);
  const prefs = loadPreferencesFromLocalStorage();
  console.log('[Preferences] Preferences to save:', prefs);
  if (prefs) {
    await savePreferencesToDB(userId, prefs);
    console.log('[Preferences] Preferences saved to database');
  }
}
