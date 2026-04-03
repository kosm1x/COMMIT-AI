export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      agent_suggestions: {
        Row: {
          created_at: string | null;
          id: string;
          reasoning: string | null;
          resolved_at: string | null;
          source: string | null;
          status: string | null;
          suggestion: Json;
          target_id: string | null;
          target_table: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          reasoning?: string | null;
          resolved_at?: string | null;
          source?: string | null;
          status?: string | null;
          suggestion: Json;
          target_id?: string | null;
          target_table?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          reasoning?: string | null;
          resolved_at?: string | null;
          source?: string | null;
          status?: string | null;
          suggestion?: Json;
          target_id?: string | null;
          target_table?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_analysis: {
        Row: {
          analyzed_at: string;
          coping_strategies: Json | null;
          emotions: Json | null;
          entry_id: string;
          id: string;
          patterns: Json | null;
          user_id: string;
        };
        Insert: {
          analyzed_at?: string;
          coping_strategies?: Json | null;
          emotions?: Json | null;
          entry_id: string;
          id?: string;
          patterns?: Json | null;
          user_id: string;
        };
        Update: {
          analyzed_at?: string;
          coping_strategies?: Json | null;
          emotions?: Json | null;
          entry_id?: string;
          id?: string;
          patterns?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_analysis_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: true;
            referencedRelation: "journal_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_plan_tasks: {
        Row: {
          created_at: string;
          daily_plan_id: string;
          id: string;
          order_index: number | null;
          task_id: string;
          time_slot: string;
        };
        Insert: {
          created_at?: string;
          daily_plan_id: string;
          id?: string;
          order_index?: number | null;
          task_id: string;
          time_slot: string;
        };
        Update: {
          created_at?: string;
          daily_plan_id?: string;
          id?: string;
          order_index?: number | null;
          task_id?: string;
          time_slot?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_plan_tasks_daily_plan_id_fkey";
            columns: ["daily_plan_id"];
            isOneToOne: false;
            referencedRelation: "daily_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_plan_tasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_plans: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          plan_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          plan_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          plan_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          last_edited_at: string;
          modified_by: string | null;
          order: number | null;
          status: string | null;
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
          vision_id: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          last_edited_at?: string;
          modified_by?: string | null;
          order?: number | null;
          status?: string | null;
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
          vision_id?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          last_edited_at?: string;
          modified_by?: string | null;
          order?: number | null;
          status?: string | null;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
          vision_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "goals_vision_id_fkey";
            columns: ["vision_id"];
            isOneToOne: false;
            referencedRelation: "visions";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_ai_suggestions: {
        Row: {
          applied: boolean | null;
          content: string;
          created_at: string;
          id: string;
          idea_id: string;
          suggestion_type: string | null;
          user_id: string;
        };
        Insert: {
          applied?: boolean | null;
          content: string;
          created_at?: string;
          id?: string;
          idea_id: string;
          suggestion_type?: string | null;
          user_id: string;
        };
        Update: {
          applied?: boolean | null;
          content?: string;
          created_at?: string;
          id?: string;
          idea_id?: string;
          suggestion_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_ai_suggestions_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_connections: {
        Row: {
          connected_idea_id: string;
          connection_type: string | null;
          created_at: string;
          id: string;
          idea_id: string;
          is_ai_generated: boolean | null;
          strength: number | null;
          user_id: string;
        };
        Insert: {
          connected_idea_id: string;
          connection_type?: string | null;
          created_at?: string;
          id?: string;
          idea_id: string;
          is_ai_generated?: boolean | null;
          strength?: number | null;
          user_id: string;
        };
        Update: {
          connected_idea_id?: string;
          connection_type?: string | null;
          created_at?: string;
          id?: string;
          idea_id?: string;
          is_ai_generated?: boolean | null;
          strength?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_connections_connected_idea_id_fkey";
            columns: ["connected_idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_connections_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
        ];
      };
      ideas: {
        Row: {
          category: string | null;
          content: string;
          created_at: string;
          id: string;
          initial_input: string;
          status: string | null;
          tags: Json | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          initial_input?: string;
          status?: string | null;
          tags?: Json | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          initial_input?: string;
          status?: string | null;
          tags?: Json | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      journal_entries: {
        Row: {
          content: string;
          created_at: string;
          entry_date: string;
          id: string;
          modified_by: string | null;
          primary_emotion: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          entry_date?: string;
          id?: string;
          modified_by?: string | null;
          primary_emotion?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          entry_date?: string;
          id?: string;
          modified_by?: string | null;
          primary_emotion?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mind_maps: {
        Row: {
          created_at: string;
          id: string;
          mermaid_syntax: string;
          problem_statement: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mermaid_syntax: string;
          problem_statement: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mermaid_syntax?: string;
          problem_statement?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      objectives: {
        Row: {
          created_at: string;
          description: string | null;
          goal_id: string | null;
          id: string;
          last_edited_at: string;
          modified_by: string | null;
          order: number | null;
          priority: string | null;
          status: string | null;
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          goal_id?: string | null;
          id?: string;
          last_edited_at?: string;
          modified_by?: string | null;
          order?: number | null;
          priority?: string | null;
          status?: string | null;
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          goal_id?: string | null;
          id?: string;
          last_edited_at?: string;
          modified_by?: string | null;
          order?: number | null;
          priority?: string | null;
          status?: string | null;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "objectives_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      task_completions: {
        Row: {
          completion_date: string;
          created_at: string;
          id: string;
          task_id: string;
          user_id: string;
        };
        Insert: {
          completion_date?: string;
          created_at?: string;
          id?: string;
          task_id: string;
          user_id: string;
        };
        Update: {
          completion_date?: string;
          created_at?: string;
          id?: string;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          description: string | null;
          document_links: Json | null;
          due_date: string | null;
          id: string;
          is_recurring: boolean;
          last_edited_at: string;
          modified_by: string | null;
          notes: string | null;
          objective_id: string | null;
          order: number | null;
          priority: string | null;
          status: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          document_links?: Json | null;
          due_date?: string | null;
          id?: string;
          is_recurring?: boolean;
          last_edited_at?: string;
          modified_by?: string | null;
          notes?: string | null;
          objective_id?: string | null;
          order?: number | null;
          priority?: string | null;
          status?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          document_links?: Json | null;
          due_date?: string | null;
          id?: string;
          is_recurring?: boolean;
          last_edited_at?: string;
          modified_by?: string | null;
          notes?: string | null;
          objective_id?: string | null;
          order?: number | null;
          priority?: string | null;
          status?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_objective_id_fkey";
            columns: ["objective_id"];
            isOneToOne: false;
            referencedRelation: "objectives";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_digests: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          stats: Json;
          insights: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          stats: Json;
          insights?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          stats?: Json;
          insights?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          created_at: string;
          dark_mode: boolean;
          id: string;
          language: string | null;
          last_page_visited: string | null;
          theme: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dark_mode?: boolean;
          id?: string;
          language?: string | null;
          last_page_visited?: string | null;
          theme?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dark_mode?: boolean;
          id?: string;
          language?: string | null;
          last_page_visited?: string | null;
          theme?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      visions: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          last_edited_at: string;
          modified_by: string | null;
          order: number | null;
          status: string | null;
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          last_edited_at?: string;
          modified_by?: string | null;
          order?: number | null;
          status?: string | null;
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          last_edited_at?: string;
          modified_by?: string | null;
          order?: number | null;
          status?: string | null;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
