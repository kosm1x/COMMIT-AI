import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify JWT auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: {
    prompt: string;
    temperature: number;
    max_tokens: number;
    top_p?: number;
    reasoning_effort?: string;
    language?: "en" | "es" | "zh";
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.prompt || body.temperature == null || body.max_tokens == null) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: prompt, temperature, max_tokens",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Get LLM config from server-side secrets (backwards compatible with GROQ_API_KEY)
  const llmApiKey = Deno.env.get("LLM_API_KEY") || Deno.env.get("GROQ_API_KEY");
  const llmEndpoint =
    Deno.env.get("LLM_ENDPOINT") ||
    "https://api.groq.com/openai/v1/chat/completions";
  const llmModel = Deno.env.get("LLM_MODEL") || "qwen/qwen3-32b";
  if (!llmApiKey) {
    return new Response(
      JSON.stringify({ error: "AI service not configured" }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Append language instruction
  const languageInstructions: Record<string, string> = {
    en: "IMPORTANT: Respond in English. All text, labels, and content must be in English.",
    es: "IMPORTANTE: Responde en español. Todo el texto, etiquetas y contenido deben estar en español.",
    zh: "重要：用中文回复。所有文本、标签和内容必须使用中文。",
  };

  const language = body.language || "en";
  const languagePrompt =
    languageInstructions[language] || languageInstructions.en;
  const fullPrompt = `${body.prompt}\n\n${languagePrompt}`;

  // Build LLM request
  const requestBody: Record<string, unknown> = {
    model: llmModel,
    messages: [{ role: "user", content: fullPrompt }],
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    top_p: body.top_p ?? 0.95,
  };

  if (body.reasoning_effort) {
    requestBody.reasoning_effort = body.reasoning_effort;
  }

  // Call LLM API
  try {
    const llmResponse = await fetch(llmEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llmApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("LLM API error:", llmResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "AI service error",
          status: llmResponse.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await llmResponse.json();
    const content = data.choices?.[0]?.message?.content || null;

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error calling LLM:", error);
    return new Response(JSON.stringify({ error: "AI service unavailable" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
