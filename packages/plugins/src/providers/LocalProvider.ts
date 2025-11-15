/**
 * Local Provider
 * Uses in-memory word lists
 */

import type { WordProvider, WordItem, Category } from "../types";

export interface LocalProviderOptions {
  words: WordItem[];
  category: Category;
}

export class LocalProvider implements WordProvider {
  private words: WordItem[];
  private category: Category;

  constructor(options: LocalProviderOptions) {
    this.words = options.words.map((item) => ({
      word: item.word.toUpperCase(),
      clue: item.clue,
      expansion: item.expansion,
      definition: item.definition ?? item.clue,
    }));
    this.category = options.category;

    if (this.words.length === 0) {
      throw new Error("LocalProvider requires at least one word");
    }
  }

  async getRandomWord(category: Category): Promise<WordItem> {
    if (category !== this.category) {
      throw new Error(`Category mismatch: expected "${this.category}", got "${category}"`);
    }

    const index = Math.floor(Math.random() * this.words.length);
    return this.words[index];
  }

  async isValidGuess(guess: string, category: Category): Promise<boolean> {
    if (category !== this.category) {
      return false;
    }

    const upperGuess = guess.toUpperCase();
    return this.words.some((item) => item.word === upperGuess);
  }

  async getAllWords(category: Category): Promise<WordItem[]> {
    if (category !== this.category) {
      return [];
    }

    return [...this.words];
  }

  async getCategories(): Promise<Category[]> {
    return [this.category];
  }

  /**
   * Add a word to the provider
   */
  addWord(word: WordItem): void {
    this.words.push({
      word: word.word.toUpperCase(),
      clue: word.clue,
      expansion: word.expansion,
      definition: word.definition ?? word.clue,
    });
  }

  /**
   * Remove a word by its word value
   */
  removeWord(word: string): boolean {
    const upperWord = word.toUpperCase();
    const index = this.words.findIndex((item) => item.word === upperWord);

    if (index === -1) {
      return false;
    }

    this.words.splice(index, 1);
    return true;
  }

  /**
   * Get total word count
   */
  getWordCount(): number {
    return this.words.length;
  }
}

/**
 * Create a LocalProvider from configuration
 */
export function createLocalProvider(options: LocalProviderOptions): LocalProvider {
  return new LocalProvider(options);
}
