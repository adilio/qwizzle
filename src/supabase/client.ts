import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Null when the env vars are absent — every account/sync feature checks this
 * and hides itself, so the app still fully works as a local-only game.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const TABLES = {
  profiles: (import.meta.env.VITE_SUPABASE_PROFILES_TABLE as string) || "profiles",
  editions: (import.meta.env.VITE_SUPABASE_EDITIONS_TABLE as string) || "editions",
  wordlists: (import.meta.env.VITE_SUPABASE_WORDLISTS_TABLE as string) || "wordlists",
  stats: (import.meta.env.VITE_SUPABASE_STATS_TABLE as string) || "stats",
};
