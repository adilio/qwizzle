/**
 * Qwizzle Plugin System
 * Extensibility layer for word lists, themes, and more
 */

// Core types
export type {
  Category,
  WordItem,
  WordProvider,
  PluginMetadata,
  WordListPluginConfig,
  WordListPlugin,
  ThemeColors,
  ThemeTypography,
  ThemeSizing,
  ThemeManifest,
  ThemePlugin,
  Plugin,
  PluginType,
  PluginRegistryEntry,
  QwizzleConfig,
  PluginLoadResult,
  ProviderFactory,
} from "./types";

// Registry
export { PluginRegistry, globalRegistry } from "./registry";

// Providers
export {
  GistProvider,
  createGistProvider,
  UrlProvider,
  createUrlProvider,
  LocalProvider,
  createLocalProvider,
  MultiSourceProvider,
  createMultiSourceProvider,
} from "./providers";

export type {
  GistProviderOptions,
  UrlProviderOptions,
  LocalProviderOptions,
  MultiSourceProviderOptions,
} from "./providers";

// Themes
export { ThemeLoader, createThemeLoader, darkTheme, cyberpunkTheme, oceanTheme, forestTheme, defaultThemes } from "./themes";

export type { ThemeLoaderOptions } from "./themes";

// Loader
export {
  loadWordListPlugin,
  loadThemePlugin,
  loadConfig,
  loadConfigFromUrl,
  loadConfigFromJson,
  createDefaultConfig,
} from "./loader";
