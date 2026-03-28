/**
 * COMMIT Events Webhook — forwards database changes to Jarvis.
 *
 * Called by Supabase Database Webhooks (pg_net) on INSERT/UPDATE to
 * key tables (tasks, goals, objectives, journal_entries).
 *
 * Filters out jarvis-originated changes to prevent echo loops.
 * Forwards to Jarvis's /api/commit-events endpoint.
 *
 * Environment secrets:
 *   JARVIS_API_URL — Jarvis base URL (e.g. http://localhost:8080)
 *   JARVIS_API_KEY — Jarvis API key for authentication
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // F3: Validate caller is the database trigger (service role key)
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || !expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jarvisUrl = Deno.env.get("JARVIS_API_URL");
  const jarvisKey = Deno.env.get("JARVIS_API_KEY");

  if (!jarvisUrl || !jarvisKey) {
    console.error("[commit-events] Missing JARVIS_API_URL or JARVIS_API_KEY");
    return new Response(
      JSON.stringify({ error: "Jarvis integration not configured" }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const record = payload.record ?? payload.old_record;
  if (!record) {
    return new Response(JSON.stringify({ error: "No record data" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const modifiedBy = record.modified_by as string | undefined;

  // Skip jarvis-originated changes to prevent echo loops
  if (modifiedBy === "jarvis") {
    return new Response(
      JSON.stringify({ status: "skipped", reason: "jarvis-originated" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Build the event payload for Jarvis
  const eventPayload = {
    event: payload.type,
    table: payload.table,
    row_id: (record.id as string) ?? "",
    user_id: (record.user_id as string) ?? "",
    modified_by: modifiedBy ?? "user",
    changes:
      payload.type === "UPDATE" && payload.old_record
        ? diffRecords(payload.old_record, payload.record!)
        : record,
  };

  // Forward to Jarvis (F9: 10s timeout to avoid Edge Function hanging)
  try {
    const response = await fetch(`${jarvisUrl}/api/commit-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": jarvisKey,
      },
      body: JSON.stringify(eventPayload),
      signal: AbortSignal.timeout(10_000),
    });

    console.log(
      `[commit-events] Forwarded ${payload.type} ${payload.table}/${record.id} → Jarvis (${response.status})`,
    );

    // F8: Don't leak raw Jarvis response
    return new Response(JSON.stringify({ status: "forwarded" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[commit-events] Failed to forward to Jarvis:", error);
    // Don't fail the webhook — Jarvis being down shouldn't block COMMIT
    // F8: Don't leak internal error details
    return new Response(
      JSON.stringify({
        status: "jarvis_unreachable",
        error: "Jarvis temporarily unavailable",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/** Compute the diff between old and new record (only changed fields). */
function diffRecords(
  oldRec: Record<string, unknown>,
  newRec: Record<string, unknown>,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(newRec)) {
    if (JSON.stringify(oldRec[key]) !== JSON.stringify(newRec[key])) {
      diff[key] = newRec[key];
    }
  }
  return diff;
}
