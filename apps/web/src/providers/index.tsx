import { createContext, useContext, useMemo } from "react";
import { LocalListProvider } from "./LocalListProvider";
import { createHttpProvider } from "./HttpProvider";
import type { WordProvider } from "./WordProvider";

function resolveProvider(): WordProvider {
  if (import.meta.env.VITE_PROVIDER === "http" && import.meta.env.VITE_API_BASE) {
    return createHttpProvider(import.meta.env.VITE_API_BASE);
  }
  return LocalListProvider;
}

const defaultProvider = resolveProvider();

const WordProviderContext = createContext<WordProvider>(defaultProvider);

interface ProviderProps {
  readonly children: React.ReactNode;
  readonly provider?: WordProvider;
}

export function WordProviderProvider({ children, provider }: ProviderProps) {
  const value = useMemo(() => provider ?? resolveProvider(), [provider]);
  return <WordProviderContext.Provider value={value}>{children}</WordProviderContext.Provider>;
}

export function useWordProvider(): WordProvider {
  return useContext(WordProviderContext);
}

export type { WordProvider, WordItem, Category } from "./WordProvider";
export { LocalListProvider } from "./LocalListProvider";
export { createHttpProvider } from "./HttpProvider";
export { createUrlProvider, createGistProvider } from "./createUrlProvider";
