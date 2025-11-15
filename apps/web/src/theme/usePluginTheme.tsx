/**
 * Plugin Theme Hook
 * React hook for managing themes from the plugin system
 */

import { useState, useEffect, useCallback } from "react";
import { globalRegistry, createThemeLoader, type ThemeManifest } from "@qwizzle/plugins";

export interface UsePluginThemeOptions {
  /**
   * Initial theme ID
   */
  initialThemeId?: string;
  /**
   * LocalStorage key for persisting theme preference
   */
  storageKey?: string;
  /**
   * Prefer dark mode
   */
  prefersDark?: boolean;
}

export interface UsePluginThemeResult {
  currentTheme: ThemeManifest | null;
  availableThemes: ThemeManifest[];
  setTheme: (themeId: string) => void;
  prefersDark: boolean;
  setPrefersDark: (prefersDark: boolean) => void;
  isLoading: boolean;
  error: string | null;
}

export function usePluginTheme(options: UsePluginThemeOptions = {}): UsePluginThemeResult {
  const { initialThemeId, storageKey = "qwizzle:custom-theme", prefersDark: initialPrefersDark = true } = options;

  const [currentThemeId, setCurrentThemeId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return initialThemeId ?? null;
    }
    return window.localStorage.getItem(storageKey) ?? initialThemeId ?? null;
  });

  const [prefersDark, setPrefersDarkState] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return initialPrefersDark;
    }
    const stored = window.localStorage.getItem("qwizzle:prefers-dark");
    return stored ? stored === "true" : initialPrefersDark;
  });

  const [themeLoader] = useState(() => createThemeLoader({ prefersDark }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableThemes = globalRegistry.getAllThemes();
  const currentTheme = currentThemeId ? globalRegistry.getTheme(currentThemeId) ?? null : null;

  const setTheme = useCallback(
    (themeId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const theme = globalRegistry.getTheme(themeId);
        if (!theme) {
          throw new Error(`Theme not found: ${themeId}`);
        }

        themeLoader.loadTheme(theme);
        setCurrentThemeId(themeId);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, themeId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        console.error("Failed to load theme:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [themeLoader, storageKey],
  );

  const setPrefersDark = useCallback(
    (value: boolean) => {
      setPrefersDarkState(value);
      themeLoader.setPrefersDark(value);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("qwizzle:prefers-dark", String(value));
      }
    },
    [themeLoader],
  );

  // Load initial theme
  useEffect(() => {
    if (currentThemeId && !currentTheme && availableThemes.length > 0) {
      setTheme(currentThemeId);
    }
  }, [currentThemeId, currentTheme, availableThemes.length, setTheme]);

  return {
    currentTheme,
    availableThemes,
    setTheme,
    prefersDark,
    setPrefersDark,
    isLoading,
    error,
  };
}
