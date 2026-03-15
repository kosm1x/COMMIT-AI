import { createClient } from "@supabase/supabase-js";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Adapter: Supabase expects (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
const supabaseFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  return fetchWithRetry(url, init);
};

// Create a client with placeholder values if env vars are missing
// This allows the app to load and show an error message instead of crashing
export const supabase = createClient<Database>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true, // Persist session in localStorage
      autoRefreshToken: true, // Auto-refresh tokens before expiry
      detectSessionInUrl: true, // Detect session from URL (password reset, etc.)
      storage: window.localStorage, // Explicit storage specification
    },
    global: {
      // Use retry-enabled fetch for all Supabase requests
      fetch: supabaseFetch,
    },
  },
);

export const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey);

// Re-export Database type from auto-generated file
export type { Database } from "./database.types";
