import { supabase } from "../lib/supabase";
import { Language } from "../i18n/translations";
import { logger } from "../utils/logger";

export interface UserPreferences {
  language: Language;
  theme: "light" | "dark";
  last_page_visited: string;
}

const PREFS_STORAGE_KEY = "commit_user_preferences";

/**
 * Save user preferences to database
 */
export async function savePreferencesToDB(
  userId: string,
  preferences: Partial<UserPreferences>,
) {
  try {
    // Use upsert to handle both insert and update in one operation
    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        language: preferences.language || "en",
        theme: preferences.theme || "dark",
        last_page_visited: preferences.last_page_visited || "/journal",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      logger.error("[Preferences] Error saving to database:", error);
    } else {
      logger.info("[Preferences] Successfully saved to database");
    }
  } catch (error) {
    logger.error("[Preferences] Failed to save preferences:", error);
  }
}

/**
 * Load user preferences from database
 */
export async function loadPreferencesFromDB(
  userId: string,
): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logger.error("Error loading user preferences:", error);
      return null;
    }

    if (!data) {
      logger.info("[Preferences] No preferences found in database for user");
      return null;
    }

    return {
      language: (data.language || "en") as Language,
      theme: (data.theme || "dark") as "light" | "dark",
      last_page_visited: data.last_page_visited || "/journal",
    };
  } catch (error) {
    logger.error("Failed to load preferences:", error);
    return null;
  }
}

/**
 * Save preferences to localStorage (for immediate use)
 */
export function savePreferencesToLocalStorage(
  preferences: Partial<UserPreferences>,
) {
  try {
    const existing = localStorage.getItem(PREFS_STORAGE_KEY);
    const current = existing ? JSON.parse(existing) : {};
    const updated = { ...current, ...preferences };
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));

    // Also save to individual keys for backwards compatibility
    if (preferences.language) {
      localStorage.setItem("commit_language", preferences.language);
    }
    if (preferences.theme) {
      localStorage.setItem("theme", preferences.theme);
    }
    if (preferences.last_page_visited) {
      localStorage.setItem("commit_last_page", preferences.last_page_visited);
    }
  } catch (error) {
    logger.error("Failed to save preferences to localStorage:", error);
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
    const language = localStorage.getItem("commit_language") as Language | null;
    const theme = localStorage.getItem("theme") as "light" | "dark" | null;
    const lastPage = localStorage.getItem("commit_last_page");

    if (language || theme || lastPage) {
      return {
        language: language || "en",
        theme: theme || "dark",
        last_page_visited: lastPage || "/journal",
      };
    }

    return null;
  } catch (error) {
    logger.error("Failed to load preferences from localStorage:", error);
    return null;
  }
}

/**
 * Sync preferences from database to localStorage (called on sign-in)
 *
 * Priority for theme/language: localStorage > database > defaults
 * Priority for last_page_visited: database > localStorage > defaults
 *
 * last_page_visited uses database priority because it's saved on sign-out,
 * representing the authoritative "last known state" before logout.
 */
export async function syncPreferencesOnSignIn(
  userId: string,
): Promise<UserPreferences> {
  logger.info("[Preferences] Syncing preferences for user:", userId);

  // First, check localStorage for any existing preferences
  const localPrefs = loadPreferencesFromLocalStorage();
  logger.info("[Preferences] Local preferences:", localPrefs);

  // Then, load from database (authoritative source for last_page_visited)
  const dbPrefs = await loadPreferencesFromDB(userId);
  logger.info("[Preferences] Database preferences:", dbPrefs);

  // Merge preferences with different priorities:
  // - theme/language: localStorage > database (user might have changed them locally)
  // - last_page_visited: database > localStorage (saved at logout, represents true last state)
  const finalPrefs: UserPreferences = {
    language: localPrefs?.language || dbPrefs?.language || "en",
    theme: localPrefs?.theme || dbPrefs?.theme || "dark",
    last_page_visited:
      dbPrefs?.last_page_visited || localPrefs?.last_page_visited || "/journal",
  };

  logger.info("[Preferences] Final merged preferences:", finalPrefs);

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
  logger.info(
    "[Preferences] Saving preferences before sign-out for user:",
    userId,
  );
  const prefs = loadPreferencesFromLocalStorage();
  logger.info("[Preferences] Preferences to save:", prefs);
  if (prefs) {
    await savePreferencesToDB(userId, prefs);
    logger.info("[Preferences] Preferences saved to database");
  }
}

/**
 * Track AI suggestion acceptance or rejection.
 * Increments the count for the given function type in the ai_feedback JSONB column.
 */
export async function updateAIFeedback(
  userId: string,
  functionType: string,
  accepted: boolean,
): Promise<void> {
  try {
    // ai_feedback column added in migration 20260401000001 — not yet in generated types
    const { data } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    const raw = data as Record<string, unknown> | null;
    const feedback =
      (raw?.ai_feedback as Record<string, Record<string, number>>) ?? {};
    const key = accepted ? "accepted_types" : "rejected_types";
    const bucket = feedback[key] ?? {};
    bucket[functionType] = (bucket[functionType] ?? 0) + 1;
    feedback[key] = bucket;

    await supabase
      .from("user_preferences")
      .update({ ai_feedback: feedback } as Record<string, unknown>)
      .eq("user_id", userId);
  } catch (error) {
    logger.error("[Preferences] Failed to update AI feedback:", error);
  }
}
