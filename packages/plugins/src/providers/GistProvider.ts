/**
 * GitHub Gist Provider
 * Loads word lists from public GitHub gists
 */

import type { WordProvider, WordItem, Category } from "../types";

interface GistFile {
  content: string;
  filename: string;
}

interface GistResponse {
  files: Record<string, GistFile>;
}

export interface GistProviderOptions {
  gistId: string;
  filename?: string;
  category: Category;
  cacheDuration?: number; // in milliseconds
}

export class GistProvider implements WordProvider {
  private words: WordItem[] = [];
  private category: Category;
  private gistId: string;
  private filename?: string;
  private cacheDuration: number;
  private lastFetch: number = 0;
  private loading: Promise<void> | null = null;

  constructor(options: GistProviderOptions) {
    this.gistId = options.gistId;
    this.filename = options.filename;
    this.category = options.category;
    this.cacheDuration = options.cacheDuration ?? 5 * 60 * 1000; // 5 minutes default
  }

  private async fetchGist(): Promise<void> {
    const url = `https://api.github.com/gists/${this.gistId}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch gist: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GistResponse;

    // Find the target file
    let content: string | undefined;
    if (this.filename) {
      content = data.files[this.filename]?.content;
      if (!content) {
        throw new Error(`File "${this.filename}" not found in gist`);
      }
    } else {
      // Use the first JSON file
      const jsonFile = Object.values(data.files).find((file) => file.filename.endsWith(".json"));
      if (!jsonFile) {
        throw new Error("No JSON file found in gist");
      }
      content = jsonFile.content;
    }

    // Parse and validate
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error("Gist content must be an array of word items");
    }

    this.words = parsed.map((item) => this.normalizeWordItem(item));
    this.lastFetch = Date.now();
  }

  private normalizeWordItem(raw: unknown): WordItem {
    if (typeof raw !== "object" || raw === null) {
      throw new Error("Invalid word item: must be an object");
    }

    const item = raw as Record<string, unknown>;

    if (typeof item.word !== "string" || !item.word) {
      throw new Error("Invalid word item: missing 'word' field");
    }

    return {
      word: item.word.toUpperCase(),
      clue: typeof item.clue === "string" ? item.clue : undefined,
      expansion: typeof item.expansion === "string" ? item.expansion : undefined,
      definition:
        typeof item.definition === "string"
          ? item.definition
          : typeof item.clue === "string"
            ? item.clue
            : undefined,
    };
  }

  private async ensureLoaded(): Promise<void> {
    const now = Date.now();
    const needsRefresh = now - this.lastFetch > this.cacheDuration;

    if (this.words.length === 0 || needsRefresh) {
      if (!this.loading) {
        this.loading = this.fetchGist().finally(() => {
          this.loading = null;
        });
      }
      await this.loading;
    }
  }

  async getRandomWord(category: Category): Promise<WordItem> {
    if (category !== this.category) {
      throw new Error(`Category mismatch: expected "${this.category}", got "${category}"`);
    }

    await this.ensureLoaded();

    if (this.words.length === 0) {
      throw new Error("No words available in gist");
    }

    const index = Math.floor(Math.random() * this.words.length);
    return this.words[index];
  }

  async isValidGuess(guess: string, category: Category): Promise<boolean> {
    if (category !== this.category) {
      return false;
    }

    await this.ensureLoaded();

    const upperGuess = guess.toUpperCase();
    return this.words.some((item) => item.word === upperGuess);
  }

  async getAllWords(category: Category): Promise<WordItem[]> {
    if (category !== this.category) {
      return [];
    }

    await this.ensureLoaded();
    return [...this.words];
  }

  async getCategories(): Promise<Category[]> {
    return [this.category];
  }

  /**
   * Force refresh the gist data
   */
  async refresh(): Promise<void> {
    this.lastFetch = 0;
    await this.ensureLoaded();
  }
}

/**
 * Create a GistProvider from configuration
 */
export function createGistProvider(options: GistProviderOptions): GistProvider {
  return new GistProvider(options);
}
