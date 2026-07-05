import type { WordEntry } from "../engine";

export type WordlistSource = "builtin" | "json" | "csv" | "paste" | "url" | "gist";

export interface Wordlist {
  id: string;
  name: string;
  sourceType: WordlistSource;
  entries: WordEntry[];
}
