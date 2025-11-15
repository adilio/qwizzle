/**
 * UrlProvider Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createUrlProvider } from "../../src/providers/UrlProvider";

describe("UrlProvider", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("should create a provider", () => {
    const provider = createUrlProvider({ url: "https://example.com/words.json", category: "test" });
    expect(provider).toBeDefined();
  });

  it("should fetch words from URL (array format)", async () => {
    const mockWords = [
      { word: "TEST", definition: "A test word" },
      { word: "URL", definition: "Uniform Resource Locator" },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockWords,
    });

    const provider = createUrlProvider({ url: "https://example.com/words.json", category: "test" });
    const word = await provider.getRandomWord("test");

    expect(word).toBeDefined();
    expect(word.word).toMatch(/^(TEST|URL)$/);
  });

  it("should fetch words from URL (object with 'words' property)", async () => {
    const mockResponse = {
      words: [
        { word: "TEST", definition: "A test word" },
        { word: "URL", definition: "Uniform Resource Locator" },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const provider = createUrlProvider({ url: "https://example.com/api/words", category: "test" });
    const word = await provider.getRandomWord("test");

    expect(word).toBeDefined();
    expect(word.word).toMatch(/^(TEST|URL)$/);
  });

  it("should fetch words from URL (object with 'data' property)", async () => {
    const mockResponse = {
      data: [{ word: "TEST", definition: "A test word" }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const provider = createUrlProvider({ url: "https://example.com/api/data", category: "test" });
    const word = await provider.getRandomWord("test");

    expect(word.word).toBe("TEST");
  });

  it("should include custom headers", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ word: "TEST", definition: "Test" }],
    });

    const provider = createUrlProvider({
      url: "https://example.com/words.json",
      category: "test",
      headers: { Authorization: "Bearer token123" },
    });

    await provider.getRandomWord("test");

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/words.json", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer token123",
      },
    });
  });

  it("should validate guesses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ word: "TEST", definition: "A test word" }],
    });

    const provider = createUrlProvider({ url: "https://example.com/words.json", category: "test" });

    expect(await provider.isValidGuess("TEST", "test")).toBe(true);
    expect(await provider.isValidGuess("test", "test")).toBe(true);
    expect(await provider.isValidGuess("INVALID", "test")).toBe(false);
  });

  it("should throw error when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const provider = createUrlProvider({ url: "https://example.com/words.json", category: "test" });

    await expect(provider.getRandomWord("test")).rejects.toThrow("Failed to fetch words");
  });

  it("should cache fetched words", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ word: "TEST", definition: "Test" }],
    });

    const provider = createUrlProvider({ url: "https://example.com/words.json", category: "test" });

    await provider.getRandomWord("test");
    await provider.getRandomWord("test");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("should validate schema by default", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ word: "TEST" }],
    });

    const provider = createUrlProvider({ url: "https://example.com/words.json", category: "test" });

    await expect(provider.getRandomWord("test")).rejects.toThrow("must have at least one of clue, expansion, or definition");
  });

  it("should skip schema validation when disabled", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ word: "TEST" }],
    });

    const provider = createUrlProvider({
      url: "https://example.com/words.json",
      category: "test",
      validateSchema: false,
    });

    const word = await provider.getRandomWord("test");
    expect(word.word).toBe("TEST");
  });
});
