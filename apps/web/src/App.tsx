import { ErrorBoundary } from "./error/ErrorBoundary";
import GameScreen from "./screens/GameScreen";
import { ThemeProvider } from "./theme/theme";
import { WordProviderProvider } from "@qwizzle/providers";

export default function App() {
  return (
    <ThemeProvider>
      <WordProviderProvider>
        <ErrorBoundary>
          <GameScreen />
        </ErrorBoundary>
      </WordProviderProvider>
    </ThemeProvider>
  );
}
