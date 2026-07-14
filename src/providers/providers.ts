import { hashString } from "../engine";
import { BUILTIN_WORDLIST } from "./builtin";
import { parseAny, parseCsv, parseJson, parsePaste, ImportError } from "./parse";
import type { ParseResult } from "./parse";
import { fetchGist, fetchText, parseGistUrl } from "./remote";
import type { Wordlist, WordlistSource } from "./types";

export interface ImportedWordlist {
  wordlist: Wordlist;
  warnings: string[];
}

/** A source a wordlist can be loaded from. Kept async for the remote impls. */
export interface WordProvider {
  load(): Promise<ImportedWordlist>;
}

function toWordlist(
  result: ParseResult,
  sourceType: WordlistSource,
  id: string,
  name: string,
  sourceUrl?: string,
): ImportedWordlist {
  return {
    wordlist: { id, name, sourceType, entries: result.entries, ...(sourceUrl ? { sourceUrl } : {}) },
    warnings: result.warnings,
  };
}

/**
 * Content-derived id for uploads/pastes so the same list yields the same
 * daily puzzle for everyone; source-derived id for URLs and gists.
 */
function contentId(entries: ParseResult["entries"]): string {
  return `h${hashString(entries.map((e) => e.word).join(",")).toString(36)}`;
}

export function builtinProvider(): WordProvider {
  return {
    load: async () => ({ wordlist: BUILTIN_WORDLIST, warnings: [] }),
  };
}

export function fileProvider(file: File): WordProvider {
  return {
    async load() {
      if (file.size > 1_000_000) throw new ImportError("That file is too large (limit 1 MB).");
      const text = await file.text();
      const isCsv = /\.csv$/i.test(file.name);
      const result = isCsv ? parseCsv(text) : parseJson(text);
      const name = file.name.replace(/\.(json|csv)$/i, "");
      return toWordlist(result, isCsv ? "csv" : "json", contentId(result.entries), name);
    },
  };
}

export function pasteProvider(text: string, name = "Pasted list"): WordProvider {
  return {
    async load() {
      const result = parsePaste(text);
      return toWordlist(result, "paste", contentId(result.entries), name);
    },
  };
}

export function urlProvider(url: string, authHeader?: string): WordProvider {
  return {
    async load() {
      const text = await fetchText(url, authHeader);
      const result = parseAny(text, url);
      let name = "Remote list";
      try {
        name = new URL(url).hostname;
      } catch {
        // keep the fallback name
      }
      return toWordlist(result, "url", `u${hashString(url).toString(36)}`, name, url);
    },
  };
}

export function gistProvider(url: string): WordProvider {
  return {
    async load() {
      const ref = parseGistUrl(url);
      const { text, hint } = await fetchGist(ref);
      const result = parseAny(text, hint);
      return toWordlist(result, "gist", `g${ref.id.slice(0, 12)}`, "Gist list", url);
    },
  };
}
