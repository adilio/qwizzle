import { Suspense, lazy } from "react";
import { ErrorBoundary } from "./error/ErrorBoundary";
import { PluginErrorBoundary } from "./error/PluginErrorBoundary";
import { ThemeProvider } from "./theme/theme";
import { WordProviderProvider } from "@qwizzle/providers";
import { PluginAwareProvider } from "./providers/PluginAwareProvider";
import { LoadingSpinner } from "./components/LoadingSpinner";

// Lazy load the game screen for better initial load performance
const GameScreen = lazy(() => import("./screens/GameScreen"));

// Optional: Load config from a URL or local file
// import config from "./qwizzle.config.json";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PluginErrorBoundary>
          <PluginAwareProvider
          // config={config}  // Uncomment to use custom config
          // configUrl="https://example.com/qwizzle.config.json"  // Or load from URL
          >
            <WordProviderProvider>
              <Suspense fallback={<LoadingSpinner message="Loading Qwizzle..." fullScreen />}>
                <GameScreen />
              </Suspense>
            </WordProviderProvider>
          </PluginAwareProvider>
        </PluginErrorBoundary>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
