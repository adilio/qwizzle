import { acronyms, words } from "../wordlists";
import type { Category, WordItem, WordProvider } from "./WordProvider";

interface RawWordItem {
  word: string;
  clue?: string;
  expansion?: string;
  definition?: string;
}

const datasets: Record<Category, RawWordItem[]> = {
  acronym: acronyms as RawWordItem[],
  vocab: words as RawWordItem[],
};

function normaliseWord(raw: RawWordItem): WordItem {
  return {
    word: String(raw.word ?? "").toUpperCase(),
    clue: raw.clue,
    expansion: raw.expansion,
    definition: raw.definition ?? raw.clue,
  };
}

export const LocalListProvider: WordProvider = {
  async getRandomWord(category: Category): Promise<WordItem> {
    const list = datasets[category];
    const entry = list[Math.floor(Math.random() * list.length)];
    return normaliseWord(entry);
  },
  async isValidGuess(guess: string, category: Category): Promise<boolean> {
    const upperGuess = guess.toUpperCase();
    return datasets[category].some((item) => normaliseWord(item).word === upperGuess);
  },
};
