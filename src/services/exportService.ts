import { supabase } from "../lib/supabase";
import { logger } from "../utils/logger";

/**
 * Export all user data as a downloadable file.
 */
export async function exportAllData(
  userId: string,
  format: "json" | "markdown",
): Promise<void> {
  const [
    journal,
    visions,
    goals,
    objectives,
    tasks,
    ideas,
    connections,
    mindMaps,
    digests,
  ] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("*, ai_analysis(*)")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false }),
    supabase
      .from("visions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("objectives")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase.from("idea_connections").select("*").eq("user_id", userId),
    supabase
      .from("mind_maps")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("weekly_digests")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false }),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    journal: journal.data ?? [],
    objectives: {
      visions: visions.data ?? [],
      goals: goals.data ?? [],
      objectives: objectives.data ?? [],
      tasks: tasks.data ?? [],
    },
    ideas: {
      items: ideas.data ?? [],
      connections: connections.data ?? [],
    },
    mindMaps: mindMaps.data ?? [],
    weeklyDigests: digests.data ?? [],
  };

  let content: string;
  let mimeType: string;
  let extension: string;

  if (format === "json") {
    content = JSON.stringify(data, null, 2);
    mimeType = "application/json";
    extension = "json";
  } else {
    content = toMarkdown(data);
    mimeType = "text/markdown";
    extension = "md";
  }

  download(
    content,
    `commit-export-${new Date().toISOString().slice(0, 10)}.${extension}`,
    mimeType,
  );
  logger.info(`[Export] ${format} export completed`);
}

function toMarkdown(data: Record<string, unknown>): string {
  const d = data as {
    exportedAt: string;
    journal: {
      entry_date: string;
      content: string;
      ai_analysis: { primary_emotion?: string } | null;
    }[];
    objectives: {
      visions: { title: string; description?: string }[];
      goals: { title: string; status?: string }[];
      objectives: { title: string; status?: string }[];
      tasks: { title: string; status?: string; due_date?: string }[];
    };
    ideas: {
      items: { title: string; content?: string }[];
      connections: unknown[];
    };
    mindMaps: { title?: string; definition?: string }[];
    weeklyDigests: { week_start: string; insights: string[] }[];
  };

  const lines: string[] = [];
  lines.push("# COMMIT Data Export");
  lines.push(`\nExported: ${d.exportedAt}\n`);

  // Journal
  lines.push("## Journal Entries\n");
  for (const entry of d.journal) {
    const emotion = entry.ai_analysis?.primary_emotion ?? "";
    lines.push(`### ${entry.entry_date}${emotion ? ` (${emotion})` : ""}`);
    lines.push(entry.content + "\n");
  }

  // Objectives hierarchy
  lines.push("## Visions\n");
  for (const v of d.objectives.visions) {
    lines.push(`- **${v.title}**${v.description ? `: ${v.description}` : ""}`);
  }

  lines.push("\n## Goals\n");
  for (const g of d.objectives.goals) {
    lines.push(`- ${g.title} [${g.status ?? "not_started"}]`);
  }

  lines.push("\n## Objectives\n");
  for (const o of d.objectives.objectives) {
    lines.push(`- ${o.title} [${o.status ?? "not_started"}]`);
  }

  lines.push("\n## Tasks\n");
  for (const t of d.objectives.tasks) {
    const due = t.due_date ? ` (due: ${t.due_date})` : "";
    lines.push(`- ${t.title} [${t.status ?? "not_started"}]${due}`);
  }

  // Ideas
  lines.push("\n## Ideas\n");
  for (const idea of d.ideas.items) {
    lines.push(`### ${idea.title}`);
    if (idea.content) lines.push(idea.content);
    lines.push("");
  }

  // Mind Maps
  if (d.mindMaps.length > 0) {
    lines.push("## Mind Maps\n");
    for (const m of d.mindMaps) {
      lines.push(`### ${m.title ?? "Untitled"}`);
      if (m.definition) lines.push("```mermaid\n" + m.definition + "\n```\n");
    }
  }

  // Weekly Digests
  if (d.weeklyDigests.length > 0) {
    lines.push("## Weekly Digests\n");
    for (const digest of d.weeklyDigests) {
      lines.push(`### Week of ${digest.week_start}`);
      for (const insight of digest.insights) {
        lines.push(`- ${insight}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
