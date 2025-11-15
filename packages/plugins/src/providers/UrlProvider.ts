/**
 * URL Provider
 * Loads word lists from any JSON endpoint
 */

import type { WordProvider, WordItem, Category } from "../types";

export interface UrlProviderOptions {
  url: string;
  category: Category;
  headers?: Record<string, string>;
  cacheDuration?: number; // in milliseconds
  validateSchema?: boolean;
}

export class UrlProvider implements WordProvider {
  private words: WordItem[] = [];
  private category: Category;
  private url: string;
  private headers: Record<string, string>;
  private cacheDuration: number;
  private validateSchema: boolean;
  private lastFetch: number = 0;
  private loading: Promise<void> | null = null;

  constructor(options: UrlProviderOptions) {
    this.url = options.url;
    this.category = options.category;
    this.headers = options.headers ?? {};
    this.cacheDuration = options.cacheDuration ?? 5 * 60 * 1000; // 5 minutes default
    this.validateSchema = options.validateSchema ?? true;
  }

  private async fetchWords(): Promise<void> {
    const response = await fetch(this.url, {
      headers: {
        Accept: "application/json",
        ...this.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch words: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Support different response formats
    let wordList: unknown[];
    if (Array.isArray(data)) {
      wordList = data;
    } else if (typeof data === "object" && data !== null) {
      // Try common property names
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.words)) {
        wordList = obj.words;
      } else if (Array.isArray(obj.data)) {
        wordList = obj.data;
      } else if (Array.isArray(obj.items)) {
        wordList = obj.items;
      } else {
        throw new Error("Response must contain an array or have a 'words', 'data', or 'items' property");
      }
    } else {
      throw new Error("Invalid response format: expected array or object");
    }

    this.words = wordList.map((item) => this.normalizeWordItem(item));
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

    if (this.validateSchema) {
      // Ensure at least one of clue, expansion, or definition exists
      if (!item.clue && !item.expansion && !item.definition) {
        throw new Error(`Invalid word item "${item.word}": must have at least one of clue, expansion, or definition`);
      }
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
        this.loading = this.fetchWords().finally(() => {
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
      throw new Error("No words available from URL");
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
   * Force refresh the word list
   */
  async refresh(): Promise<void> {
    this.lastFetch = 0;
    await this.ensureLoaded();
  }
}

/**
 * Create a UrlProvider from configuration
 */
export function createUrlProvider(options: UrlProviderOptions): UrlProvider {
  return new UrlProvider(options);
}
