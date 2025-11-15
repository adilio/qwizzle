/**
 * Plugin Registry
 * Central system for managing and accessing plugins
 */

import type {
  Plugin,
  PluginRegistryEntry,
  PluginType,
  WordListPlugin,
  ThemePlugin,
  Category,
  WordProvider,
  ThemeManifest,
} from "./types";

export class PluginRegistry {
  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private wordProviders: Map<Category, WordProvider> = new Map();
  private themes: Map<string, ThemeManifest> = new Map();

  /**
   * Register a plugin
   */
  register(plugin: Plugin, type: PluginType, enabled = true): void {
    const entry: PluginRegistryEntry = {
      type,
      plugin,
      enabled,
      loadedAt: new Date(),
    };

    this.plugins.set(plugin.metadata.id, entry);

    // Index by type for faster lookups
    if (type === "wordlist") {
      const wordListPlugin = plugin as WordListPlugin;
      const category = wordListPlugin.config.category;
      if (enabled) {
        this.wordProviders.set(category, wordListPlugin.provider);
      }
    } else if (type === "theme") {
      const themePlugin = plugin as ThemePlugin;
      this.themes.set(themePlugin.theme.id, themePlugin.theme);
    }
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }

    // Clean up indexes
    if (entry.type === "wordlist") {
      const wordListPlugin = entry.plugin as WordListPlugin;
      this.wordProviders.delete(wordListPlugin.config.category);
    } else if (entry.type === "theme") {
      const themePlugin = entry.plugin as ThemePlugin;
      this.themes.delete(themePlugin.theme.id);
    }

    return this.plugins.delete(pluginId);
  }

  /**
   * Enable a plugin
   */
  enable(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }

    entry.enabled = true;

    // Re-index
    if (entry.type === "wordlist") {
      const wordListPlugin = entry.plugin as WordListPlugin;
      this.wordProviders.set(wordListPlugin.config.category, wordListPlugin.provider);
    }

    return true;
  }

  /**
   * Disable a plugin
   */
  disable(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }

    entry.enabled = false;

    // Remove from indexes
    if (entry.type === "wordlist") {
      const wordListPlugin = entry.plugin as WordListPlugin;
      this.wordProviders.delete(wordListPlugin.config.category);
    }

    return true;
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId)?.plugin;
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by type
   */
  getPluginsByType(type: PluginType): PluginRegistryEntry[] {
    return Array.from(this.plugins.values()).filter((entry) => entry.type === type);
  }

  /**
   * Get word provider for a category
   */
  getWordProvider(category: Category): WordProvider | undefined {
    return this.wordProviders.get(category);
  }

  /**
   * Get all available categories
   */
  getCategories(): Category[] {
    return Array.from(this.wordProviders.keys());
  }

  /**
   * Get theme by ID
   */
  getTheme(themeId: string): ThemeManifest | undefined {
    return this.themes.get(themeId);
  }

  /**
   * Get all themes
   */
  getAllThemes(): ThemeManifest[] {
    return Array.from(this.themes.values());
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.enabled ?? false;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.wordProviders.clear();
    this.themes.clear();
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const entries = Array.from(this.plugins.values());
    return {
      total: entries.length,
      enabled: entries.filter((e) => e.enabled).length,
      disabled: entries.filter((e) => !e.enabled).length,
      byType: {
        wordlist: entries.filter((e) => e.type === "wordlist").length,
        theme: entries.filter((e) => e.type === "theme").length,
      },
      categories: this.getCategories().length,
      themes: this.themes.size,
    };
  }
}

// Global registry instance
export const globalRegistry = new PluginRegistry();
