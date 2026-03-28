/**
 * Agent Suggestions Service — CRUD for the agent_suggestions table.
 *
 * Jarvis creates suggestions via the MCP bridge (service role).
 * The frontend reads, accepts, or rejects them via this service.
 */

import { supabase } from "../lib/supabase";

export interface AgentSuggestion {
  id: string;
  user_id: string;
  type: string;
  target_table: string | null;
  target_id: string | null;
  title: string;
  suggestion: Record<string, unknown>;
  reasoning: string | null;
  source: string | null;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
  resolved_at: string | null;
}

export class SuggestionsService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /** Load all pending suggestions, newest first. */
  async loadPending(): Promise<AgentSuggestion[]> {
    const { data, error } = await supabase
      .from("agent_suggestions")
      .select("*")
      .eq("user_id", this.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[suggestions] Failed to load pending:", error.message);
      return [];
    }
    return (data ?? []) as AgentSuggestion[];
  }

  /** Load recently resolved suggestions (for history). */
  async loadRecent(limit = 20): Promise<AgentSuggestion[]> {
    const { data, error } = await supabase
      .from("agent_suggestions")
      .select("*")
      .eq("user_id", this.userId)
      .neq("status", "pending")
      .order("resolved_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[suggestions] Failed to load recent:", error.message);
      return [];
    }
    return (data ?? []) as AgentSuggestion[];
  }

  /** Get count of pending suggestions. */
  async getPendingCount(): Promise<number> {
    const { count, error } = await supabase
      .from("agent_suggestions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", this.userId)
      .eq("status", "pending");

    if (error) {
      console.error("[suggestions] Failed to count pending:", error.message);
      return 0;
    }
    return count ?? 0;
  }

  /** Mark a suggestion as accepted. */
  async accept(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("agent_suggestions")
      .update({
        status: "accepted",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) {
      console.error("[suggestions] Failed to accept:", error.message);
      return false;
    }
    return true;
  }

  /** Mark a suggestion as rejected. */
  async reject(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("agent_suggestions")
      .update({
        status: "rejected",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) {
      console.error("[suggestions] Failed to reject:", error.message);
      return false;
    }
    return true;
  }

  /** Load recent Jarvis-originated changes across hierarchy tables. */
  async loadJarvisActivity(limit = 20): Promise<
    Array<{
      table: string;
      id: string;
      title: string;
      modified_at: string;
    }>
  > {
    const tables = ["tasks", "goals", "objectives", "visions"] as const;

    // Parallel queries — each table is independent
    const tableResults = await Promise.all(
      tables.map(async (table) => {
        const { data, error } = await supabase
          .from(table)
          .select("id, title, last_edited_at, modified_by")
          .eq("user_id", this.userId)
          .eq("modified_by", "jarvis")
          .order("last_edited_at", { ascending: false })
          .limit(5);

        if (error || !data) return [];
        return data.map((row) => ({
          table,
          id: row.id,
          title: row.title,
          modified_at: row.last_edited_at ?? "",
        }));
      }),
    );

    return tableResults
      .flat()
      .sort(
        (a, b) =>
          new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime(),
      )
      .slice(0, limit);
  }
}

export function createSuggestionsService(userId: string): SuggestionsService {
  return new SuggestionsService(userId);
}
