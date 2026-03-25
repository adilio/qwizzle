import { ErrorBoundary } from "./error/ErrorBoundary";
import { ThemeProvider } from "./theme/theme";
import { WordProviderProvider } from "@qwizzle/providers";
import GameScreen from "./screens/GameScreen";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WordProviderProvider>
          <GameScreen />
        </WordProviderProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
