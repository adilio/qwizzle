import { supabase, TABLES } from "./client";
import type { Edition, EditionWordlistRef } from "../editions/edition";
import { defaultEdition, sanitizeEditionName } from "../editions/edition";
import { sanitizeColors, DEFAULT_DARK, DEFAULT_LIGHT } from "../theme/tokens";
import type { Stats } from "../engine";
import { createInitialStats } from "../engine";
import type { Wordlist } from "../providers/types";
import { normalizeEntries } from "../providers/parse";

export interface CloudEdition {
  id: string;
  name: string;
  edition: Edition;
  isPublic: boolean;
  shareSlug: string | null;
  updatedAt: string;
}

interface EditionRow {
  id: string;
  name: string;
  theme_json: unknown;
  wordlist_ref: unknown;
  is_public: boolean;
  share_slug: string | null;
  updated_at: string;
}

function rowToEdition(row: EditionRow): CloudEdition {
  const theme = (row.theme_json ?? {}) as Record<string, unknown>;
  const edition: Edition = {
    version: 1,
    brand: "Qwizzle",
    editionName: sanitizeEditionName(row.name),
    theme: {
      colors: sanitizeColors(theme.colors, DEFAULT_DARK),
      lightColors: sanitizeColors(theme.lightColors, DEFAULT_LIGHT),
    },
    wordlist: sanitizeRef(row.wordlist_ref),
  };
  return {
    id: row.id,
    name: row.name,
    edition,
    isPublic: row.is_public,
    shareSlug: row.share_slug,
    updatedAt: row.updated_at,
  };
}

function sanitizeRef(raw: unknown): EditionWordlistRef {
  if (!raw || typeof raw !== "object") return { source_type: "builtin" };
  const ref = raw as EditionWordlistRef;
  if (ref.source_type === "builtin" || !ref.source_type) return { source_type: "builtin" };
  const clean: EditionWordlistRef = { source_type: ref.source_type };
  if (typeof ref.id === "string") clean.id = ref.id.slice(0, 64);
  if (typeof ref.name === "string") clean.name = ref.name.slice(0, 80);
  if (typeof ref.source_url === "string") clean.source_url = ref.source_url.slice(0, 2048);
  if (Array.isArray(ref.entries)) {
    try {
      clean.entries = normalizeEntries(ref.entries).entries;
    } catch {
      return { source_type: "builtin" };
    }
  }
  return clean;
}

const SELECT = "id, name, theme_json, wordlist_ref, is_public, share_slug, updated_at";

export async function fetchCloudEditions(): Promise<CloudEdition[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLES.editions)
    .select(SELECT)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return (data as EditionRow[]).map(rowToEdition);
}

export async function saveCloudEdition(
  userId: string,
  edition: Edition,
  existingId?: string,
): Promise<{ id: string } | { error: string }> {
  if (!supabase) return { error: "Accounts are not configured." };
  const row = {
    user_id: userId,
    name: edition.editionName,
    theme_json: edition.theme,
    wordlist_ref: edition.wordlist,
    updated_at: new Date().toISOString(),
  };
  const query = existingId
    ? supabase.from(TABLES.editions).update(row).eq("id", existingId).select("id").single()
    : supabase.from(TABLES.editions).insert(row).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { error: error?.message ?? "Save failed." };
  return { id: (data as { id: string }).id };
}

export async function deleteCloudEdition(id: string): Promise<void> {
  await supabase?.from(TABLES.editions).delete().eq("id", id);
}

function randomSlug(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
}

/** Toggle public sharing; returns the slug when made public. */
export async function setEditionPublic(
  id: string,
  isPublic: boolean,
): Promise<string | null> {
  if (!supabase) return null;
  const patch: Record<string, unknown> = { is_public: isPublic };
  let slug: string | null = null;
  if (isPublic) {
    slug = randomSlug();
    patch.share_slug = slug;
  }
  const { data, error } = await supabase
    .from(TABLES.editions)
    .update(patch)
    .eq("id", id)
    .select("share_slug")
    .single();
  if (error || !data) return null;
  return (data as { share_slug: string | null }).share_slug ?? slug;
}

/** Anonymous read of a published edition — powers /e/<slug> links. */
export async function fetchEditionBySlug(slug: string): Promise<CloudEdition | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLES.editions)
    .select(SELECT)
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error || !data) return null;
  return rowToEdition(data as EditionRow);
}

interface WordlistRow {
  id: string;
  name: string;
  source_type: Wordlist["sourceType"];
  payload_json: unknown;
  source_url: string | null;
  item_count: number;
}

export async function fetchCloudWordlists(): Promise<Wordlist[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLES.wordlists)
    .select("id, name, source_type, payload_json, source_url, item_count");
  if (error || !data) return [];
  const lists: Wordlist[] = [];
  for (const row of data as WordlistRow[]) {
    if (!Array.isArray(row.payload_json)) continue;
    try {
      lists.push({
        id: `c${row.id.slice(0, 12)}`,
        name: row.name,
        sourceType: row.source_type,
        entries: normalizeEntries(row.payload_json).entries,
        ...(row.source_url ? { sourceUrl: row.source_url } : {}),
      });
    } catch {
      // skip corrupt rows
    }
  }
  return lists;
}

export async function saveCloudWordlist(
  userId: string,
  list: Wordlist,
): Promise<{ error: string | null }> {
  if (!supabase || list.sourceType === "builtin") return { error: null };
  const { error } = await supabase.from(TABLES.wordlists).upsert(
    {
      user_id: userId,
      name: list.name,
      source_type: list.sourceType,
      payload_json: list.entries,
      source_url: list.sourceUrl ?? null,
      item_count: list.entries.length,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,name" },
  );
  return { error: error?.message ?? null };
}

export async function fetchCloudStats(): Promise<Stats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLES.stats).select("stats_json").maybeSingle();
  if (error || !data) return null;
  const raw = (data as { stats_json: unknown }).stats_json as Partial<Stats> | null;
  if (!raw || raw.version !== 1) return null;
  const base = createInitialStats();
  return {
    ...base,
    played: Number(raw.played) || 0,
    won: Number(raw.won) || 0,
    streak: Number(raw.streak) || 0,
    best: Number(raw.best) || 0,
    score: Number(raw.score) || 0,
    lastDailyKey: typeof raw.lastDailyKey === "string" ? raw.lastDailyKey : null,
  };
}

export async function saveCloudStats(
  userId: string,
  stats: Stats,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Accounts are not configured." };
  const { error } = await supabase.from(TABLES.stats).upsert({
    user_id: userId,
    stats_json: stats,
    updated_at: new Date().toISOString(),
  });
  return { error: error?.message ?? null };
}

export async function upsertProfile(userId: string, displayName: string | null): Promise<void> {
  if (!supabase) return;
  await supabase.from(TABLES.profiles).upsert({
    user_id: userId,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });
}

export function editionForCloud(edition: Edition): Edition {
  return { ...defaultEdition(), ...edition };
}
