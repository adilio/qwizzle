import type { WordProvider, WordItem, Category } from "./WordProvider";

interface RawWord {
  word: string;
  clue?: string;
  expansion?: string;
  definition?: string;
}

function normalizeWords(data: unknown): WordItem[] {
  const raw: RawWord[] = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>).words as RawWord[]) ??
      ((data as Record<string, unknown>).data as RawWord[]) ??
      [];
  return raw.map((item) => ({
    word: String(item.word).toUpperCase(),
    clue: item.clue,
    expansion: item.expansion,
    definition: item.definition ?? item.clue,
  }));
}

function makeProvider(fetchWords: () => Promise<WordItem[]>, category: Category): WordProvider {
  let cache: WordItem[] | null = null;

  async function load(): Promise<WordItem[]> {
    if (!cache) cache = await fetchWords();
    return cache;
  }

  return {
    async getRandomWord(cat: Category): Promise<WordItem> {
      const words = await load();
      if (cat !== category) throw new Error(`Provider does not support category: ${cat}`);
      return words[Math.floor(Math.random() * words.length)];
    },
    async isValidGuess(guess: string, cat: Category): Promise<boolean> {
      if (cat !== category) return false;
      const words = await load();
      return words.some((w) => w.word === guess.toUpperCase());
    },
  };
}

export function createUrlProvider(
  url: string,
  category: Category,
  headers?: Record<string, string>,
): WordProvider {
  return makeProvider(async () => {
    const res = await fetch(url, headers ? { headers } : undefined);
    if (!res.ok) throw new Error(`Failed to fetch word list: ${res.status}`);
    return normalizeWords(await res.json());
  }, category);
}

export function createGistProvider(
  gistId: string,
  category: Category,
  filename?: string,
): WordProvider {
  return makeProvider(async () => {
    const meta = await fetch(`https://api.github.com/gists/${gistId}`);
    if (!meta.ok) throw new Error(`Gist not found: ${gistId}`);
    const gist = await meta.json();
    const files = Object.values(gist.files) as Array<{ filename: string; raw_url: string }>;
    const file = filename
      ? files.find((f) => f.filename === filename)
      : (files.find((f) => f.filename.endsWith(".json")) ?? files[0]);
    if (!file) throw new Error(`No suitable file found in gist ${gistId}`);
    const res = await fetch(file.raw_url);
    if (!res.ok) throw new Error(`Failed to fetch gist content: ${res.status}`);
    return normalizeWords(await res.json());
  }, category);
}
