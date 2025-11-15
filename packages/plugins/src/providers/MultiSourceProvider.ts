/**
 * Multi-Source Provider
 * Combines multiple word providers into a single provider
 */

import type { WordProvider, WordItem, Category } from "../types";

export interface MultiSourceProviderOptions {
  providers: WordProvider[];
  category: Category;
  /**
   * Strategy for selecting words:
   * - 'round-robin': Cycle through providers
   * - 'random': Randomly select from all available words
   * - 'weighted': Use provider weights (requires weights array)
   */
  strategy?: "round-robin" | "random" | "weighted";
  /**
   * Weights for each provider (only used with 'weighted' strategy)
   */
  weights?: number[];
}

export class MultiSourceProvider implements WordProvider {
  private providers: WordProvider[];
  private category: Category;
  private strategy: "round-robin" | "random" | "weighted";
  private weights?: number[];
  private currentIndex: number = 0;
  private allWords: WordItem[] | null = null;
  private loading: Promise<void> | null = null;

  constructor(options: MultiSourceProviderOptions) {
    if (options.providers.length === 0) {
      throw new Error("MultiSourceProvider requires at least one provider");
    }

    this.providers = options.providers;
    this.category = options.category;
    this.strategy = options.strategy ?? "random";
    this.weights = options.weights;

    if (this.strategy === "weighted") {
      if (!this.weights || this.weights.length !== this.providers.length) {
        throw new Error("Weighted strategy requires weights array matching providers length");
      }
      const sum = this.weights.reduce((a, b) => a + b, 0);
      if (sum <= 0) {
        throw new Error("Weights must sum to a positive number");
      }
    }
  }

  private async loadAllWords(): Promise<void> {
    if (this.allWords !== null) {
      return;
    }

    if (!this.loading) {
      this.loading = (async () => {
        const wordArrays = await Promise.all(
          this.providers.map(async (provider) => {
            if (provider.getAllWords) {
              try {
                return await provider.getAllWords(this.category);
              } catch {
                return [];
              }
            }
            return [];
          }),
        );

        this.allWords = wordArrays.flat();
      })().finally(() => {
        this.loading = null;
      });
    }

    await this.loading;
  }

  async getRandomWord(category: Category): Promise<WordItem> {
    if (category !== this.category) {
      throw new Error(`Category mismatch: expected "${this.category}", got "${category}"`);
    }

    if (this.strategy === "round-robin") {
      // Simple round-robin through providers
      const provider = this.providers[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.providers.length;

      try {
        return await provider.getRandomWord(category);
      } catch (error) {
        // If provider fails, try the next one
        console.warn(`Provider at index ${this.currentIndex} failed:`, error);
        return this.getRandomWord(category); // Recursive retry
      }
    } else if (this.strategy === "weighted" && this.weights) {
      // Weighted random selection of provider
      const totalWeight = this.weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < this.providers.length; i++) {
        random -= this.weights[i];
        if (random <= 0) {
          try {
            return await this.providers[i].getRandomWord(category);
          } catch (error) {
            console.warn(`Weighted provider at index ${i} failed:`, error);
            // Fall through to try another provider
          }
        }
      }

      // Fallback to first provider
      return await this.providers[0].getRandomWord(category);
    } else {
      // Random strategy: load all words and pick randomly
      await this.loadAllWords();

      if (!this.allWords || this.allWords.length === 0) {
        throw new Error("No words available from any provider");
      }

      const index = Math.floor(Math.random() * this.allWords.length);
      return this.allWords[index];
    }
  }

  async isValidGuess(guess: string, category: Category): Promise<boolean> {
    if (category !== this.category) {
      return false;
    }

    // Check all providers in parallel
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return await provider.isValidGuess(guess, category);
        } catch {
          return false;
        }
      }),
    );

    return results.some((valid) => valid);
  }

  async getAllWords(category: Category): Promise<WordItem[]> {
    if (category !== this.category) {
      return [];
    }

    await this.loadAllWords();
    return this.allWords ? [...this.allWords] : [];
  }

  async getCategories(): Promise<Category[]> {
    return [this.category];
  }

  /**
   * Add a provider to the multi-source
   */
  addProvider(provider: WordProvider, weight?: number): void {
    this.providers.push(provider);

    if (this.strategy === "weighted") {
      if (weight === undefined) {
        throw new Error("Weight required when adding provider to weighted multi-source");
      }
      this.weights = [...(this.weights ?? []), weight];
    }

    // Invalidate cache
    this.allWords = null;
  }

  /**
   * Remove a provider by index
   */
  removeProvider(index: number): boolean {
    if (index < 0 || index >= this.providers.length) {
      return false;
    }

    this.providers.splice(index, 1);

    if (this.strategy === "weighted" && this.weights) {
      this.weights.splice(index, 1);
    }

    // Invalidate cache
    this.allWords = null;
    return true;
  }

  /**
   * Get number of providers
   */
  getProviderCount(): number {
    return this.providers.length;
  }

  /**
   * Refresh all providers (if they support it)
   */
  async refreshAll(): Promise<void> {
    await Promise.all(
      this.providers.map(async (provider) => {
        if ("refresh" in provider && typeof provider.refresh === "function") {
          try {
            await provider.refresh();
          } catch (error) {
            console.warn("Failed to refresh provider:", error);
          }
        }
      }),
    );

    // Invalidate cache
    this.allWords = null;
  }
}

/**
 * Create a MultiSourceProvider from configuration
 */
export function createMultiSourceProvider(options: MultiSourceProviderOptions): MultiSourceProvider {
  return new MultiSourceProvider(options);
}
