/**
 * Mobile Theme Context
 * Provides theme support for React Native
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

export interface ThemeColors {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
  success: string;
  danger: string;
  surface: string;
  surfaceBorder: string;
  tBase: string;
  tBorder: string;
  tCorrect: string;
  tPresent: string;
  tAbsent: string;
  keyBorder: string;
}

export const darkTheme: ThemeColors = {
  bg: "#000b05",
  fg: "#e6fbee",
  muted: "#56c97f",
  accent: "#00cc66",
  accentFg: "#00150b",
  success: "#00cc66",
  danger: "#f45b5b",
  surface: "#001509",
  surfaceBorder: "#014f29",
  tBase: "#002312",
  tBorder: "#026233",
  tCorrect: "#00cc66",
  tPresent: "#f4d35e",
  tAbsent: "#013518",
  keyBorder: "#026233",
};

export const lightTheme: ThemeColors = {
  bg: "#ffffff",
  fg: "#05210f",
  muted: "#19884b",
  accent: "#00cc66",
  accentFg: "#ffffff",
  success: "#00b85c",
  danger: "#d84848",
  surface: "#f4fff7",
  surfaceBorder: "#8ad8aa",
  tBase: "#ffffff",
  tBorder: "#8ad8aa",
  tCorrect: "#00cc66",
  tPresent: "#ffd966",
  tAbsent: "#e4f6ec",
  keyBorder: "#3ea463",
};

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === "dark");

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const colors = isDark ? darkTheme : lightTheme;

  return <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
