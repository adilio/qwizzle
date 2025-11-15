/**
 * Plugin Loader
 * Loads and initializes plugins from configuration
 */

import type {
  QwizzleConfig,
  WordListPlugin,
  WordListPluginConfig,
  ThemePlugin,
  ThemeManifest,
  PluginLoadResult,
  WordProvider,
} from "./types";
import { globalRegistry } from "./registry";
import { createGistProvider } from "./providers/GistProvider";
import { createUrlProvider } from "./providers/UrlProvider";
import { createLocalProvider } from "./providers/LocalProvider";

/**
 * Load a word list plugin from configuration
 */
export async function loadWordListPlugin(config: WordListPluginConfig): Promise<PluginLoadResult> {
  try {
    let provider: WordProvider;

    switch (config.type) {
      case "gist":
        provider = createGistProvider({
          gistId: config.gistId,
          filename: config.filename,
          category: config.category,
        });
        break;

      case "url":
        provider = createUrlProvider({
          url: config.url,
          category: config.category,
          headers: config.headers,
        });
        break;

      case "local":
        provider = createLocalProvider({
          words: config.data,
          category: config.category,
        });
        break;

      case "api":
        provider = createUrlProvider({
          url: config.baseUrl,
          category: config.category,
          headers: config.headers,
        });
        break;

      default:
        throw new Error(`Unknown word list plugin type: ${(config as { type: string }).type}`);
    }

    // Test the provider by trying to get a random word
    try {
      await provider.getRandomWord(config.category);
    } catch (error) {
      throw new Error(`Provider validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const plugin: WordListPlugin = {
      metadata: {
        id: `wordlist-${config.type}-${config.category}`,
        name: `${config.category} (${config.type})`,
        version: "1.0.0",
      },
      config,
      provider,
    };

    globalRegistry.register(plugin, "wordlist", true);

    return { success: true, plugin };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Load a theme plugin
 */
export function loadThemePlugin(theme: ThemeManifest): PluginLoadResult {
  try {
    // Validate theme
    if (!theme.id || !theme.name) {
      throw new Error("Theme must have id and name");
    }

    if (!theme.colors) {
      throw new Error("Theme must have colors");
    }

    const plugin: ThemePlugin = {
      metadata: {
        id: theme.id,
        name: theme.name,
        version: theme.version ?? "1.0.0",
        description: theme.description,
        author: theme.author,
      },
      theme,
    };

    globalRegistry.register(plugin, "theme", true);

    return { success: true, plugin };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Load all plugins from configuration
 */
export async function loadConfig(config: QwizzleConfig): Promise<{
  wordLists: PluginLoadResult[];
  themes: PluginLoadResult[];
}> {
  const results = {
    wordLists: [] as PluginLoadResult[],
    themes: [] as PluginLoadResult[],
  };

  // Load word list plugins
  if (config.wordLists) {
    for (const wordListConfig of config.wordLists) {
      const result = await loadWordListPlugin(wordListConfig);
      results.wordLists.push(result);

      if (!result.success) {
        console.error(`Failed to load word list plugin:`, result.error);
      }
    }
  }

  // Load theme plugins
  if (config.themes) {
    for (const theme of config.themes) {
      const result = loadThemePlugin(theme);
      results.themes.push(result);

      if (!result.success) {
        console.error(`Failed to load theme plugin:`, result.error);
      }
    }
  }

  return results;
}

/**
 * Load configuration from URL
 */
export async function loadConfigFromUrl(url: string): Promise<{
  wordLists: PluginLoadResult[];
  themes: PluginLoadResult[];
}> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
  }

  const config = (await response.json()) as QwizzleConfig;
  return loadConfig(config);
}

/**
 * Load configuration from JSON string
 */
export async function loadConfigFromJson(json: string): Promise<{
  wordLists: PluginLoadResult[];
  themes: PluginLoadResult[];
}> {
  const config = JSON.parse(json) as QwizzleConfig;
  return loadConfig(config);
}

/**
 * Create a default configuration template
 */
export function createDefaultConfig(): QwizzleConfig {
  return {
    wordLists: [
      {
        type: "gist",
        gistId: "your-gist-id-here",
        category: "custom",
      },
    ],
    theme: "qwizzle-dark",
    themes: [],
    categories: ["acronym", "vocab"],
  };
}
