import acronyms from "../data/acronyms.json";
import type { Wordlist } from "./types";

/** The bundled Cyberdle acronym list — always available, works offline. */
export const BUILTIN_WORDLIST: Wordlist = {
  id: "builtin",
  name: "Cyberdle Acronyms",
  sourceType: "builtin",
  entries: acronyms,
};
