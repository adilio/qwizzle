/**
 * GistProvider Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createGistProvider } from "../../src/providers/GistProvider";

describe("GistProvider", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("should create a provider", () => {
    const provider = createGistProvider({ gistId: "test123", category: "test" });
    expect(provider).toBeDefined();
  });

  it("should fetch words from gist", async () => {
    const mockWords = [
      { word: "TEST", definition: "A test word" },
      { word: "GIST", definition: "GitHub gist" },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: {
          "words.json": {
            filename: "words.json",
            content: JSON.stringify(mockWords),
          },
        },
      }),
    });

    const provider = createGistProvider({ gistId: "test123", category: "test" });
    const word = await provider.getRandomWord("test");

    expect(word).toBeDefined();
    expect(word.word).toMatch(/^(TEST|GIST)$/);
  });

  it("should validate guesses from fetched gist", async () => {
    const mockWords = [{ word: "TEST", definition: "A test word" }];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: {
          "words.json": {
            filename: "words.json",
            content: JSON.stringify(mockWords),
          },
        },
      }),
    });

    const provider = createGistProvider({ gistId: "test123", category: "test" });

    expect(await provider.isValidGuess("TEST", "test")).toBe(true);
    expect(await provider.isValidGuess("INVALID", "test")).toBe(false);
  });

  it("should throw error when gist fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const provider = createGistProvider({ gistId: "test123", category: "test" });

    await expect(provider.getRandomWord("test")).rejects.toThrow("Failed to fetch gist");
  });

  it("should throw error when no JSON file in gist", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: {
          "README.md": {
            filename: "README.md",
            content: "# Test",
          },
        },
      }),
    });

    const provider = createGistProvider({ gistId: "test123", category: "test" });

    await expect(provider.getRandomWord("test")).rejects.toThrow("No JSON file found in gist");
  });

  it("should use specified filename", async () => {
    const mockWords = [{ word: "TEST", definition: "A test word" }];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: {
          "custom.json": {
            filename: "custom.json",
            content: JSON.stringify(mockWords),
          },
        },
      }),
    });

    const provider = createGistProvider({
      gistId: "test123",
      category: "test",
      filename: "custom.json",
    });

    const word = await provider.getRandomWord("test");
    expect(word.word).toBe("TEST");
  });

  it("should throw error when specified filename not found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: {
          "other.json": {
            filename: "other.json",
            content: "[]",
          },
        },
      }),
    });

    const provider = createGistProvider({
      gistId: "test123",
      category: "test",
      filename: "notfound.json",
    });

    await expect(provider.getRandomWord("test")).rejects.toThrow('File "notfound.json" not found in gist');
  });

  it("should cache fetched words", async () => {
    const mockWords = [{ word: "TEST", definition: "A test word" }];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: {
          "words.json": {
            filename: "words.json",
            content: JSON.stringify(mockWords),
          },
        },
      }),
    });

    const provider = createGistProvider({ gistId: "test123", category: "test" });

    await provider.getRandomWord("test");
    await provider.getRandomWord("test");

    // Should only fetch once due to caching
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("should refresh cache when requested", async () => {
    const mockWords = [{ word: "TEST", definition: "A test word" }];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: {
          "words.json": {
            filename: "words.json",
            content: JSON.stringify(mockWords),
          },
        },
      }),
    });

    const provider = createGistProvider({ gistId: "test123", category: "test" });

    await provider.getRandomWord("test");
    await provider.refresh();
    await provider.getRandomWord("test");

    // Should fetch twice: initial + refresh
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
