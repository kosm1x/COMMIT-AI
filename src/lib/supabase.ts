import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a client with placeholder values if env vars are missing
// This allows the app to load and show an error message instead of crashing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,        // Persist session in localStorage
      autoRefreshToken: true,       // Auto-refresh tokens before expiry
      detectSessionInUrl: true,     // Detect session from URL (password reset, etc.)
      storage: window.localStorage, // Explicit storage specification
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
    };
  };
};
