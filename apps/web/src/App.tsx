import { useEffect } from "react";
import { ErrorBoundary } from "./error/ErrorBoundary";
import { ThemeProvider } from "./theme/theme";
import { WordProviderProvider } from "@qwizzle/providers";
import GameScreen from "./screens/GameScreen";
import { applyTheme, type CustomTheme } from "./theme/applyTheme";
import type { WordProvider } from "./providers/WordProvider";

export interface AppConfig {
  wordProvider?: WordProvider;
  theme?: CustomTheme;
}

export default function App({ config }: { config?: AppConfig } = {}) {
  useEffect(() => {
    if (config?.theme) applyTheme(config.theme);
  }, [config?.theme]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WordProviderProvider provider={config?.wordProvider}>
          <GameScreen />
        </WordProviderProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
