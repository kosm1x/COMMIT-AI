import { fetchWithRetry } from "../../utils/fetchWithRetry";
import { supabase } from "../../lib/supabase";
import { RateLimiter } from "../../utils/security";
import { logger } from "../../utils/logger";

export const aiRateLimiter = new RateLimiter(10, 1);

export interface EmotionResult {
  name: string;
  intensity: number;
  color: string;
}

export interface AnalysisResult {
  emotions: EmotionResult[];
  patterns: string[];
  coping_strategies: string[];
  primary_emotion: string;
}

export const emotionColors: { [key: string]: string } = {
  happy: "bg-yellow-500",
  sad: "bg-blue-500",
  angry: "bg-red-500",
  anxious: "bg-orange-500",
  calm: "bg-green-500",
  excited: "bg-pink-500",
  frustrated: "bg-purple-500",
  hopeful: "bg-teal-500",
  overwhelmed: "bg-indigo-500",
  grateful: "bg-emerald-500",
  determined: "bg-cyan-500",
  confused: "bg-gray-500",
};

/** Discriminated union for AI function returns. Callers pattern-match on status. */
export type AIResult<T> = { status: "ok"; data: T } | { status: "unavailable" };
export const aiUnavailable: AIResult<never> = { status: "unavailable" };
export function aiOk<T>(data: T): AIResult<T> {
  return { status: "ok", data };
}

/**
 * Call AI via Supabase Edge Function proxy (ai-proxy)
 * The Edge Function holds the Groq API key server-side, appends language
 * instructions, and forwards to Groq. Requires authenticated session.
 * @returns The text response, or null on any failure
 */
export async function callLLM(
  prompt: string,
  temperature: number,
  max_tokens: number,
  top_p: number = 0.95,
  reasoning_effort?: "default" | "low" | "medium" | "high",
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
  functionName?: string,
  input?: Record<string, unknown>,
): Promise<string | null> {
  if (!aiRateLimiter.canProceed()) {
    return null;
  }

  const internalController = new AbortController();
  const timeoutId = setTimeout(() => internalController.abort(), 30_000);
  if (signal) {
    signal.addEventListener("abort", () => internalController.abort(), {
      once: true,
    });
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      return null;
    }

    const body: Record<string, unknown> = {
      prompt,
      temperature,
      max_tokens,
      top_p,
      language,
    };

    if (reasoning_effort) {
      body.reasoning_effort = reasoning_effort;
    }
    if (functionName) {
      body.function_name = functionName;
    }
    if (input) {
      body.input = input;
    }

    const response = await fetchWithRetry(
      `${supabaseUrl}/functions/v1/ai-proxy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
        signal: internalController.signal,
      },
      {
        maxRetries: 2,
        baseDelay: 1000,
        retryOn: (res) => res.status >= 500 || res.status === 429,
      },
    );

    if (!response.ok) {
      logger.error("AI proxy error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.content || null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      logger.warn("AI call aborted or timed out");
      return null;
    }
    logger.error("Error calling AI proxy:", error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
