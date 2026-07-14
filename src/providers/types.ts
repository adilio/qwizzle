import type { WordEntry } from "../engine";

export type WordlistSource = "builtin" | "json" | "csv" | "paste" | "url" | "gist";

export interface Wordlist {
  id: string;
  name: string;
  sourceType: WordlistSource;
  entries: WordEntry[];
  /** Where a url/gist list came from, so editions can carry the reference. */
  sourceUrl?: string;
}
