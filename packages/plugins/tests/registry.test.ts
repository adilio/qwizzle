/**
 * Plugin Registry Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PluginRegistry } from "../src/registry";
import { createLocalProvider } from "../src/providers/LocalProvider";
import type { WordListPlugin, ThemePlugin, ThemeManifest } from "../src/types";

describe("PluginRegistry", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe("Word List Plugins", () => {
    it("should register a word list plugin", () => {
      const provider = createLocalProvider({
        words: [{ word: "TEST", definition: "Test" }],
        category: "test",
      });

      const plugin: WordListPlugin = {
        metadata: { id: "test-plugin", name: "Test Plugin", version: "1.0.0" },
        config: { type: "local", data: [], category: "test" },
        provider,
      };

      registry.register(plugin, "wordlist");

      expect(registry.hasPlugin("test-plugin")).toBe(true);
      expect(registry.getWordProvider("test")).toBeDefined();
    });

    it("should unregister a word list plugin", () => {
      const provider = createLocalProvider({
        words: [{ word: "TEST", definition: "Test" }],
        category: "test",
      });

      const plugin: WordListPlugin = {
        metadata: { id: "test-plugin", name: "Test Plugin", version: "1.0.0" },
        config: { type: "local", data: [], category: "test" },
        provider,
      };

      registry.register(plugin, "wordlist");
      const removed = registry.unregister("test-plugin");

      expect(removed).toBe(true);
      expect(registry.hasPlugin("test-plugin")).toBe(false);
      expect(registry.getWordProvider("test")).toBeUndefined();
    });

    it("should enable and disable plugins", () => {
      const provider = createLocalProvider({
        words: [{ word: "TEST", definition: "Test" }],
        category: "test",
      });

      const plugin: WordListPlugin = {
        metadata: { id: "test-plugin", name: "Test Plugin", version: "1.0.0" },
        config: { type: "local", data: [], category: "test" },
        provider,
      };

      registry.register(plugin, "wordlist", true);
      expect(registry.isEnabled("test-plugin")).toBe(true);

      registry.disable("test-plugin");
      expect(registry.isEnabled("test-plugin")).toBe(false);
      expect(registry.getWordProvider("test")).toBeUndefined();

      registry.enable("test-plugin");
      expect(registry.isEnabled("test-plugin")).toBe(true);
      expect(registry.getWordProvider("test")).toBeDefined();
    });

    it("should get all categories", () => {
      const provider1 = createLocalProvider({
        words: [{ word: "TEST", definition: "Test" }],
        category: "cat1",
      });

      const provider2 = createLocalProvider({
        words: [{ word: "TEST", definition: "Test" }],
        category: "cat2",
      });

      const plugin1: WordListPlugin = {
        metadata: { id: "plugin1", name: "Plugin 1", version: "1.0.0" },
        config: { type: "local", data: [], category: "cat1" },
        provider: provider1,
      };

      const plugin2: WordListPlugin = {
        metadata: { id: "plugin2", name: "Plugin 2", version: "1.0.0" },
        config: { type: "local", data: [], category: "cat2" },
        provider: provider2,
      };

      registry.register(plugin1, "wordlist");
      registry.register(plugin2, "wordlist");

      const categories = registry.getCategories();
      expect(categories).toContain("cat1");
      expect(categories).toContain("cat2");
      expect(categories).toHaveLength(2);
    });
  });

  describe("Theme Plugins", () => {
    it("should register a theme plugin", () => {
      const theme: ThemeManifest = {
        id: "test-theme",
        name: "Test Theme",
        colors: { bg: "#000", fg: "#fff", accent: "#0f0", muted: "#999", tCorrect: "#0f0", tPresent: "#ff0", tAbsent: "#333" },
      };

      const plugin: ThemePlugin = {
        metadata: { id: "test-theme", name: "Test Theme", version: "1.0.0" },
        theme,
      };

      registry.register(plugin, "theme");

      expect(registry.hasPlugin("test-theme")).toBe(true);
      expect(registry.getTheme("test-theme")).toBeDefined();
    });

    it("should get all themes", () => {
      const theme1: ThemeManifest = {
        id: "theme1",
        name: "Theme 1",
        colors: { bg: "#000", fg: "#fff", accent: "#0f0", muted: "#999", tCorrect: "#0f0", tPresent: "#ff0", tAbsent: "#333" },
      };

      const theme2: ThemeManifest = {
        id: "theme2",
        name: "Theme 2",
        colors: { bg: "#fff", fg: "#000", accent: "#00f", muted: "#666", tCorrect: "#0f0", tPresent: "#ff0", tAbsent: "#ccc" },
      };

      const plugin1: ThemePlugin = {
        metadata: { id: "theme1", name: "Theme 1", version: "1.0.0" },
        theme: theme1,
      };

      const plugin2: ThemePlugin = {
        metadata: { id: "theme2", name: "Theme 2", version: "1.0.0" },
        theme: theme2,
      };

      registry.register(plugin1, "theme");
      registry.register(plugin2, "theme");

      const themes = registry.getAllThemes();
      expect(themes).toHaveLength(2);
      expect(themes.map((t) => t.id)).toContain("theme1");
      expect(themes.map((t) => t.id)).toContain("theme2");
    });
  });

  describe("General Operations", () => {
    it("should get plugins by type", () => {
      const wordListPlugin: WordListPlugin = {
        metadata: { id: "word-plugin", name: "Word Plugin", version: "1.0.0" },
        config: { type: "local", data: [], category: "test" },
        provider: createLocalProvider({ words: [{ word: "TEST", definition: "Test" }], category: "test" }),
      };

      const themePlugin: ThemePlugin = {
        metadata: { id: "theme-plugin", name: "Theme Plugin", version: "1.0.0" },
        theme: {
          id: "test-theme",
          name: "Test Theme",
          colors: { bg: "#000", fg: "#fff", accent: "#0f0", muted: "#999", tCorrect: "#0f0", tPresent: "#ff0", tAbsent: "#333" },
        },
      };

      registry.register(wordListPlugin, "wordlist");
      registry.register(themePlugin, "theme");

      const wordListPlugins = registry.getPluginsByType("wordlist");
      const themePlugins = registry.getPluginsByType("theme");

      expect(wordListPlugins).toHaveLength(1);
      expect(themePlugins).toHaveLength(1);
    });

    it("should clear all plugins", () => {
      const provider = createLocalProvider({
        words: [{ word: "TEST", definition: "Test" }],
        category: "test",
      });

      const plugin: WordListPlugin = {
        metadata: { id: "test-plugin", name: "Test Plugin", version: "1.0.0" },
        config: { type: "local", data: [], category: "test" },
        provider,
      };

      registry.register(plugin, "wordlist");
      expect(registry.hasPlugin("test-plugin")).toBe(true);

      registry.clear();
      expect(registry.hasPlugin("test-plugin")).toBe(false);
      expect(registry.getAllPlugins()).toHaveLength(0);
    });

    it("should get registry statistics", () => {
      const provider1 = createLocalProvider({
        words: [{ word: "TEST", definition: "Test" }],
        category: "cat1",
      });

      const provider2 = createLocalProvider({
        words: [{ word: "TEST", definition: "Test" }],
        category: "cat2",
      });

      const wordPlugin1: WordListPlugin = {
        metadata: { id: "word1", name: "Word 1", version: "1.0.0" },
        config: { type: "local", data: [], category: "cat1" },
        provider: provider1,
      };

      const wordPlugin2: WordListPlugin = {
        metadata: { id: "word2", name: "Word 2", version: "1.0.0" },
        config: { type: "local", data: [], category: "cat2" },
        provider: provider2,
      };

      const themePlugin: ThemePlugin = {
        metadata: { id: "theme1", name: "Theme 1", version: "1.0.0" },
        theme: {
          id: "theme1",
          name: "Theme 1",
          colors: { bg: "#000", fg: "#fff", accent: "#0f0", muted: "#999", tCorrect: "#0f0", tPresent: "#ff0", tAbsent: "#333" },
        },
      };

      registry.register(wordPlugin1, "wordlist");
      registry.register(wordPlugin2, "wordlist");
      registry.register(themePlugin, "theme");

      const stats = registry.getStats();
      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(3);
      expect(stats.disabled).toBe(0);
      expect(stats.byType.wordlist).toBe(2);
      expect(stats.byType.theme).toBe(1);
      expect(stats.categories).toBe(2);
      expect(stats.themes).toBe(1);
    });
  });
});
