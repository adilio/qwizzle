import type { Category, WordItem, WordProvider } from "./WordProvider";

async function json<T>(url: string, signal?: AbortSignal, retries = 2): Promise<T> {
  try {
    const response = await fetch(url, {
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(String(response.status));
    }

    return (await response.json()) as T;
  } catch (error) {
    if (retries > 0) {
      return json<T>(url, signal, retries - 1);
    }
    throw error;
  }
}

export function createHttpProvider(baseUrl: string): WordProvider {
  return {
    async getRandomWord(category: Category): Promise<WordItem> {
      const controller = new AbortController();
      return json<WordItem>(`${baseUrl}/api/word?category=${category}`, controller.signal);
    },
    async isValidGuess(guess: string, category: Category): Promise<boolean> {
      const controller = new AbortController();
      const result = await json<{ valid: boolean }>(
        `${baseUrl}/api/validate?category=${category}&guess=${encodeURIComponent(guess)}`,
        controller.signal,
      );
      return Boolean(result.valid);
    },
  };
}
