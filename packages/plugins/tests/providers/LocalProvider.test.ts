/**
 * LocalProvider Tests
 */

import { describe, it, expect } from "vitest";
import { createLocalProvider } from "../../src/providers/LocalProvider";
import type { WordItem } from "../../src/types";

const testWords: WordItem[] = [
  { word: "TEST", definition: "A test word" },
  { word: "WORD", clue: "A unit of language", definition: "A unit of language" },
  { word: "CODE", expansion: "Computer Code", definition: "Instructions for computers" },
];

describe("LocalProvider", () => {
  it("should create a provider with words", () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });
    expect(provider).toBeDefined();
  });

  it("should throw error when creating with empty word list", () => {
    expect(() => createLocalProvider({ words: [], category: "test" })).toThrow("LocalProvider requires at least one word");
  });

  it("should return a random word from the list", async () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });
    const word = await provider.getRandomWord("test");

    expect(word).toBeDefined();
    expect(word.word).toMatch(/^(TEST|WORD|CODE)$/);
  });

  it("should normalize words to uppercase", async () => {
    const lowerCaseWords: WordItem[] = [{ word: "lower", definition: "lowercase word" }];
    const provider = createLocalProvider({ words: lowerCaseWords, category: "test" });
    const word = await provider.getRandomWord("test");

    expect(word.word).toBe("LOWER");
  });

  it("should validate guesses correctly", async () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });

    expect(await provider.isValidGuess("TEST", "test")).toBe(true);
    expect(await provider.isValidGuess("test", "test")).toBe(true);
    expect(await provider.isValidGuess("INVALID", "test")).toBe(false);
  });

  it("should return false for wrong category", async () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });
    expect(await provider.isValidGuess("TEST", "wrong")).toBe(false);
  });

  it("should return all words for the correct category", async () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });
    const allWords = await provider.getAllWords("test");

    expect(allWords).toHaveLength(3);
    expect(allWords.map((w) => w.word)).toEqual(["TEST", "WORD", "CODE"]);
  });

  it("should return empty array for wrong category", async () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });
    const allWords = await provider.getAllWords("wrong");

    expect(allWords).toHaveLength(0);
  });

  it("should return categories", async () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });
    const categories = await provider.getCategories();

    expect(categories).toEqual(["test"]);
  });

  it("should add a word", () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });
    provider.addWord({ word: "NEW", definition: "A new word" });

    expect(provider.getWordCount()).toBe(4);
  });

  it("should remove a word", () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });
    const removed = provider.removeWord("TEST");

    expect(removed).toBe(true);
    expect(provider.getWordCount()).toBe(2);
  });

  it("should return false when removing non-existent word", () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });
    const removed = provider.removeWord("NONEXISTENT");

    expect(removed).toBe(false);
    expect(provider.getWordCount()).toBe(3);
  });

  it("should throw error when getting random word for wrong category", async () => {
    const provider = createLocalProvider({ words: testWords, category: "test" });

    await expect(provider.getRandomWord("wrong")).rejects.toThrow("Category mismatch");
  });
});
