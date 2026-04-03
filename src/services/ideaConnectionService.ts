import { supabase } from "../lib/supabase";
import { logger } from "../utils/logger";
import type { Connection } from "../components/ideas/types";

/**
 * Load saved connections for an idea from the database.
 */
export async function loadConnections(ideaId: string): Promise<Connection[]> {
  try {
    const { data, error } = await supabase
      .from("idea_connections")
      .select(
        "connected_idea_id, connection_type, strength, ideas!idea_connections_connected_idea_id_fkey(title)",
      )
      .eq("idea_id", ideaId);

    if (error || !data) return [];

    return data.map((row) => {
      const idea = row.ideas as unknown as { title: string } | null;
      return {
        ideaId: row.connected_idea_id,
        ideaTitle: idea?.title ?? "Unknown",
        connectionType: (row.connection_type ??
          "related") as Connection["connectionType"],
        strength: row.strength ?? 50,
        reason: "",
      };
    });
  } catch (error) {
    logger.error("[IdeaConnections] Failed to load:", error);
    return [];
  }
}

/**
 * Save AI-discovered connections to the database (upsert).
 */
export async function saveConnections(
  ideaId: string,
  userId: string,
  connections: Connection[],
): Promise<void> {
  if (connections.length === 0) return;

  try {
    const rows = connections.map((c) => ({
      user_id: userId,
      idea_id: ideaId,
      connected_idea_id: c.ideaId,
      connection_type: c.connectionType,
      strength: c.strength,
      is_ai_generated: true,
    }));

    const { error } = await supabase
      .from("idea_connections")
      .upsert(rows, { onConflict: "idea_id,connected_idea_id" });

    if (error) {
      logger.error("[IdeaConnections] Failed to save:", error);
    }
  } catch (error) {
    logger.error("[IdeaConnections] Save error:", error);
  }
}
