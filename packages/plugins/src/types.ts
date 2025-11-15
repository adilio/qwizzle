/**
 * Core plugin system types for Qwizzle extensibility
 */

export type Category = string;

export interface WordItem {
  word: string;
  clue?: string;
  expansion?: string;
  definition?: string;
}

/**
 * Base interface for word providers
 */
export interface WordProvider {
  getRandomWord(category: Category): Promise<WordItem>;
  isValidGuess(guess: string, category: Category): Promise<boolean>;
  /**
   * Optional: Get all words for a category (for validation)
   */
  getAllWords?(category: Category): Promise<WordItem[]>;
  /**
   * Optional: Get available categories
   */
  getCategories?(): Promise<Category[]>;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
}

/**
 * Word list plugin configuration
 */
export type WordListPluginConfig =
  | {
      type: "gist";
      gistId: string;
      filename?: string;
      category: Category;
    }
  | {
      type: "url";
      url: string;
      category: Category;
      headers?: Record<string, string>;
    }
  | {
      type: "local";
      data: WordItem[];
      category: Category;
    }
  | {
      type: "api";
      baseUrl: string;
      category: Category;
      headers?: Record<string, string>;
    };

/**
 * Word list plugin
 */
export interface WordListPlugin {
  metadata: PluginMetadata;
  config: WordListPluginConfig;
  provider: WordProvider;
}

/**
 * Theme color scheme
 */
export interface ThemeColors {
  // Background colors
  bg: string;
  bgGlow?: string;
  fg: string;
  muted: string;

  // Accent colors
  accent: string;
  accentFg?: string;
  success?: string;
  danger?: string;

  // Surface colors
  surface?: string;
  surfaceBorder?: string;

  // Tile colors
  tBase?: string;
  tBorder?: string;
  tCorrect: string;
  tPresent: string;
  tAbsent: string;

  // Keyboard colors
  keyBorder?: string;
}

/**
 * Theme typography
 */
export interface ThemeTypography {
  primaryFont?: string;
  secondaryFont?: string;
  monoFont?: string;
  baseFontSize?: string;
}

/**
 * Theme sizing/spacing
 */
export interface ThemeSizing {
  tile?: string;
  gap?: string;
  padding?: string;
  borderRadius?: string;
}

/**
 * Theme manifest
 */
export interface ThemeManifest {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version?: string;

  // Color schemes (can have light and dark variants)
  colors: ThemeColors;
  lightColors?: ThemeColors;

  // Typography
  typography?: ThemeTypography;

  // Sizing
  sizing?: ThemeSizing;

  // Custom icon/logo
  icon?: string;
  logo?: string;

  // Custom CSS (advanced)
  customCss?: string;
}

/**
 * Theme plugin
 */
export interface ThemePlugin {
  metadata: PluginMetadata;
  theme: ThemeManifest;
}

/**
 * Plugin types
 */
export type Plugin = WordListPlugin | ThemePlugin;

export type PluginType = "wordlist" | "theme";

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry<T extends Plugin = Plugin> {
  type: PluginType;
  plugin: T;
  enabled: boolean;
  loadedAt: Date;
}

/**
 * Configuration file format
 */
export interface QwizzleConfig {
  /**
   * Word list plugins to load
   */
  wordLists?: WordListPluginConfig[];

  /**
   * Active theme ID
   */
  theme?: string;

  /**
   * Custom themes to load
   */
  themes?: ThemeManifest[];

  /**
   * Available categories (auto-detected if not specified)
   */
  categories?: Category[];

  /**
   * Custom icon URL
   */
  customIcon?: string;

  /**
   * Custom logo URL
   */
  customLogo?: string;
}

/**
 * Plugin loading result
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: Plugin;
  error?: string;
}

/**
 * Provider factory function
 */
export type ProviderFactory = (config: WordListPluginConfig) => Promise<WordProvider>;
