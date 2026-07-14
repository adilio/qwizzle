import { DEFAULT_DARK, DEFAULT_LIGHT, sanitizeColors } from "../theme/tokens";
import type { ThemeColors } from "../theme/tokens";
import type { Wordlist, WordlistSource } from "../providers/types";
import { BRAND } from "../brand";
import { normalizeEntries, ImportError } from "../providers/parse";

/** A saved customization: name suffix, both palettes, and a wordlist ref. */
export interface Edition {
  version: 1;
  brand: typeof BRAND;
  editionName: string;
  theme: {
    /** Dark palette (the default variant). */
    colors: ThemeColors;
    lightColors: ThemeColors;
  };
  wordlist: EditionWordlistRef;
}

/**
 * builtin/url/gist lists travel by reference; uploaded or pasted lists embed
 * their entries so an exported edition is fully portable.
 */
export interface EditionWordlistRef {
  source_type: WordlistSource;
  id?: string;
  name?: string;
  source_url?: string;
  entries?: Wordlist["entries"];
}

export function defaultEdition(): Edition {
  return {
    version: 1,
    brand: BRAND,
    editionName: "",
    theme: { colors: { ...DEFAULT_DARK }, lightColors: { ...DEFAULT_LIGHT } },
    wordlist: { source_type: "builtin" },
  };
}

export function wordlistRefFor(list: Wordlist, sourceUrl?: string): EditionWordlistRef {
  if (list.sourceType === "builtin") return { source_type: "builtin" };
  const ref: EditionWordlistRef = {
    source_type: list.sourceType,
    id: list.id,
    name: list.name,
  };
  // url/gist lists carry their origin so a recipient can re-fetch the list.
  const origin = sourceUrl ?? list.sourceUrl;
  if (origin) ref.source_url = origin;
  // Embed content for sources that can't be re-fetched.
  if (list.sourceType === "json" || list.sourceType === "csv" || list.sourceType === "paste") {
    ref.entries = list.entries;
  }
  return ref;
}

const MAX_NAME_LENGTH = 40;

export function sanitizeEditionName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

/** Parse an exported edition JSON string. Throws ImportError with a reason. */
export function parseEdition(text: string): Edition {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError("That file is not valid JSON.");
  }
  if (!raw || typeof raw !== "object") {
    throw new ImportError("That file does not look like a Qwizzle edition.");
  }
  const data = raw as Record<string, unknown>;
  if (data.brand !== BRAND || data.version !== 1) {
    throw new ImportError("That file does not look like a Qwizzle edition.");
  }
  const theme = (data.theme ?? {}) as Record<string, unknown>;
  const edition: Edition = {
    version: 1,
    brand: BRAND,
    editionName: sanitizeEditionName(data.editionName),
    theme: {
      colors: sanitizeColors(theme.colors, DEFAULT_DARK),
      lightColors: sanitizeColors(theme.lightColors, DEFAULT_LIGHT),
    },
    wordlist: sanitizeWordlistRef(data.wordlist),
  };
  return edition;
}

function sanitizeWordlistRef(raw: unknown): EditionWordlistRef {
  if (!raw || typeof raw !== "object") return { source_type: "builtin" };
  const data = raw as Record<string, unknown>;
  const source = data.source_type;
  if (
    source !== "json" &&
    source !== "csv" &&
    source !== "paste" &&
    source !== "url" &&
    source !== "gist"
  ) {
    return { source_type: "builtin" };
  }
  const ref: EditionWordlistRef = { source_type: source };
  if (typeof data.id === "string") ref.id = data.id.slice(0, 64);
  if (typeof data.name === "string") ref.name = data.name.slice(0, 80);
  if (typeof data.source_url === "string") ref.source_url = data.source_url.slice(0, 2048);
  if (Array.isArray(data.entries)) {
    // Re-validate embedded entries like any other untrusted import.
    ref.entries = normalizeEntries(data.entries).entries;
  }
  return ref;
}

/** Rebuild a playable Wordlist from an embedded edition ref, if it has one. */
export function wordlistFromRef(ref: EditionWordlistRef): Wordlist | null {
  if (!ref.entries || ref.entries.length === 0) return null;
  return {
    id: ref.id ?? `edition-${Date.now().toString(36)}`,
    name: ref.name ?? "Edition list",
    sourceType: ref.source_type,
    entries: ref.entries,
    ...(ref.source_url ? { sourceUrl: ref.source_url } : {}),
  };
}

export function exportEditionJson(edition: Edition): string {
  return JSON.stringify(edition, null, 2);
}
