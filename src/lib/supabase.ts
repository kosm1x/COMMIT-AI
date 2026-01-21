import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Fetch wrapper with automatic retry for transient failures
 * Handles network errors, rate limits (429), and server errors (5xx)
 */
async function fetchWithRetry(
  url: RequestInfo | URL,
  options?: RequestInit
): Promise<Response> {
  const maxRetries = 2;
  const baseDelay = 1000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Retry on server errors (5xx) or rate limits (429)
      if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Network error - retry if attempts remaining
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// Create a client with placeholder values if env vars are missing
// This allows the app to load and show an error message instead of crashing
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,        // Persist session in localStorage
      autoRefreshToken: true,       // Auto-refresh tokens before expiry
      detectSessionInUrl: true,     // Detect session from URL (password reset, etc.)
      storage: window.localStorage, // Explicit storage specification
    },
    global: {
      // Use retry-enabled fetch for all Supabase requests
      fetch: fetchWithRetry,
    },
  }
);

export const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          entry_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          entry_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          entry_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_analysis: {
        Row: {
          id: string;
          entry_id: string;
          user_id: string;
          emotions: any;
          patterns: any;
          coping_strategies: any;
          analyzed_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          user_id: string;
          emotions?: any;
          patterns?: any;
          coping_strategies?: any;
          analyzed_at?: string;
        };
        Update: {
          id?: string;
          entry_id?: string;
          user_id?: string;
          emotions?: any;
          patterns?: any;
          coping_strategies?: any;
          analyzed_at?: string;
        };
      };
      visions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          target_date: string | null;
          order: number;
          created_at: string;
          updated_at: string;
          last_edited_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          target_date?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          last_edited_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          target_date?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          last_edited_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          target_date: string | null;
          vision_id: string | null;
          order: number;
          created_at: string;
          updated_at: string;
          last_edited_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          target_date?: string | null;
          vision_id?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          last_edited_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          target_date?: string | null;
          vision_id?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          last_edited_at?: string;
        };
      };
      objectives: {
        Row: {
          id: string;
          goal_id: string | null;
          user_id: string;
          title: string;
          description: string;
          status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          priority: 'high' | 'medium' | 'low';
          target_date: string | null;
          order: number;
          created_at: string;
          updated_at: string;
          last_edited_at: string;
        };
        Insert: {
          id?: string;
          goal_id?: string | null;
          user_id: string;
          title: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          priority?: 'high' | 'medium' | 'low';
          target_date?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          last_edited_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string | null;
          user_id?: string;
          title?: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          priority?: 'high' | 'medium' | 'low';
          target_date?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          last_edited_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          objective_id: string | null;
          user_id: string;
          title: string;
          description: string;
          status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          priority: 'high' | 'medium' | 'low';
          due_date: string | null;
          completed_at: string | null;
          order: number;
          created_at: string;
          updated_at: string;
          last_edited_at: string;
          notes: string;
          is_recurring: boolean;
        };
        Insert: {
          id?: string;
          objective_id?: string | null;
          user_id: string;
          title: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          priority?: 'high' | 'medium' | 'low';
          due_date?: string | null;
          completed_at?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          last_edited_at?: string;
          notes?: string;
          is_recurring?: boolean;
        };
        Update: {
          id?: string;
          objective_id?: string | null;
          user_id?: string;
          title?: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
          priority?: 'high' | 'medium' | 'low';
          due_date?: string | null;
          completed_at?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          last_edited_at?: string;
          notes?: string;
          is_recurring?: boolean;
        };
      };
      task_completions: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          completion_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          completion_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          completion_date?: string;
          created_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          dark_mode: boolean;
          language: string;
          theme: string;
          last_page_visited: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dark_mode?: boolean;
          language?: string;
          theme?: string;
          last_page_visited?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dark_mode?: boolean;
          language?: string;
          theme?: string;
          last_page_visited?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
