/**
 * Plugin-Aware Provider
 * Integrates the plugin system with the existing provider infrastructure
 */

import { createContext, useContext, useMemo, useEffect, useState, type ReactNode } from "react";
import { globalRegistry, loadConfig, type QwizzleConfig } from "@qwizzle/plugins";
import { LocalListProvider } from "./LocalListProvider";
import { createHttpProvider } from "./HttpProvider";
import type { WordProvider, Category } from "./WordProvider";

interface PluginAwareContextValue {
  getProvider: (category: Category) => WordProvider;
  availableCategories: Category[];
  isLoading: boolean;
  error: string | null;
}

const PluginAwareContext = createContext<PluginAwareContextValue | undefined>(undefined);

interface PluginAwareProviderProps {
  readonly children: ReactNode;
  readonly config?: QwizzleConfig;
  readonly configUrl?: string;
}

export function PluginAwareProvider({ children, config, configUrl }: PluginAwareProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>(["acronym", "vocab"]);

  useEffect(() => {
    const loadPlugins = async () => {
      if (!config && !configUrl) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let configToLoad: QwizzleConfig;

        if (configUrl) {
          const response = await fetch(configUrl);
          if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status}`);
          }
          configToLoad = await response.json();
        } else {
          configToLoad = config!;
        }

        const results = await loadConfig(configToLoad);

        const failedWordLists = results.wordLists.filter((r) => !r.success);
        if (failedWordLists.length > 0) {
          console.warn("Some word lists failed to load:", failedWordLists);
        }

        const availableCategories = globalRegistry.getCategories();
        if (availableCategories.length > 0) {
          setCategories(availableCategories);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        console.error("Failed to load plugins:", err);
      } finally {
        setIsLoading(false);
      }
    };

    void loadPlugins();
  }, [config, configUrl]);

  const value = useMemo(
    () => ({
      getProvider: (category: Category): WordProvider => {
        // Try to get provider from plugin registry first
        const pluginProvider = globalRegistry.getWordProvider(category);
        if (pluginProvider) {
          return pluginProvider;
        }

        // Fall back to legacy providers
        if (import.meta.env.VITE_PROVIDER === "http" && import.meta.env.VITE_API_BASE) {
          return createHttpProvider(import.meta.env.VITE_API_BASE);
        }

        return LocalListProvider;
      },
      availableCategories: categories,
      isLoading,
      error,
    }),
    [categories, isLoading, error],
  );

  return <PluginAwareContext.Provider value={value}>{children}</PluginAwareContext.Provider>;
}

export function usePluginAwareProvider(): PluginAwareContextValue {
  const ctx = useContext(PluginAwareContext);
  if (!ctx) {
    throw new Error("usePluginAwareProvider must be used within PluginAwareProvider");
  }
  return ctx;
}

/**
 * Hook to get a word provider for a specific category
 */
export function useWordProviderForCategory(category: Category): WordProvider {
  const { getProvider } = usePluginAwareProvider();
  return useMemo(() => getProvider(category), [getProvider, category]);
}
