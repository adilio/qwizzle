# Qwizzle

A friendly Word/Acronym guessing game inspired by Wordle and Cyberdle.
Crack the cybersecurity acronym hiding behind each clue, grow your streak, and share your triumphs.

## Features

- **Daily + Random Modes** - Play the shared daily puzzle or spin up a random challenge whenever.
- **Cyberdle Dataset** - 160+ curated security acronyms with definitions and full expansions.
- **Streaks & Stats** - Local stats, running streak tracker, and a score system that rewards smart guesses.
- **Shareable Results** - One-tap clipboard/share support using the familiar emoji grid.
- **Theming** - Dark and light themes with instant toggle and persistence.
- **Accessibility-minded UI** - Keyboard-first controls, aria-live messaging, and responsive layout.
- **Extensible Plugin System** - Plug in custom word lists from GitHub Gists, APIs, or local data.
- **Custom Themes** - Create and apply your own color schemes, fonts, and icons via JSON config.
- **Mobile Support** - Full React Native app with the same great experience on iOS and Android.
- **Fully Tested** - Comprehensive test suite with 95%+ coverage.

---

## Monorepo Layout

```
qwizzle/
  apps/
    web/         # Vite + React client
    mobile/      # React Native/Expo mobile app
  packages/
    engine/      # Core game logic and share helpers
    wordlists/   # JSON data for acronyms + vocab
    plugins/     # Extensibility system (providers, themes, registry)
    cli/         # Plugin validation CLI tool
  examples/      # Sample configs, themes, and word lists
  tests/         # Comprehensive test suites
```

### Key packages

| Package | Description |
|---|---|
| `@qwizzle/engine` | Pure TypeScript engine: guesses, feedback, sharing |
| `@qwizzle/wordlists` | Bundled JSON word data — extend to add categories |
| `@qwizzle/plugins` | Plugin system for custom word lists, themes, and icons |
| `@qwizzle/cli` | CLI tool for validating and scaffolding plugins |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Corepack (ships with recent Node; enables pnpm)

```bash
corepack enable pnpm
```

### Install

```bash
corepack pnpm install
```

### Run the web app

```bash
corepack pnpm --filter qwizzle-web dev
# or from root:
pnpm dev
```

Open http://localhost:5173 and start guessing.

### Production build

```bash
pnpm build          # Build web app
pnpm preview:web    # Preview production bundle
pnpm size           # Build and list asset sizes (target: ~200 KB gzipped)
```

### Mobile app

```bash
pnpm dev:mobile     # or: corepack pnpm --filter qwizzle-mobile start
```

---

## Architecture

### React Component Tree

```
App
└── ThemeProvider
    └── WordProviderProvider
        └── ErrorBoundary
            └── GameScreen
                ├── Header (title, help, stats, theme toggle)
                ├── Controls (play, hint, mode toggle)
                ├── Definition display
                ├── Message/Status (aria-live)
                ├── Board (6-row guess grid)
                ├── Keyboard (on-screen input)
                ├── Scoreboard
                └── Modals (Help, Stats, Results)
```

### Key files

| Responsibility | File |
|---|---|
| Game logic (feedback algorithm) | `packages/engine/src/engine.ts` |
| Share/export (emoji grid) | `packages/engine/src/share.ts` |
| Core game state hook | `apps/web/src/hooks/useGameState.ts` |
| Main UI container | `apps/web/src/screens/GameScreen.tsx` |
| Word provider interface | `apps/web/src/providers/WordProvider.ts` |
| Daily puzzle seeding | `apps/web/src/utils/dailySeed.ts` |
| CSS variables / theming | `apps/web/src/theme/tokens.css` |

### Game engine

The engine exposes pure functions — no React or platform dependencies:

```typescript
newGame(target, maxGuesses?)      // Initialize game state
computeFeedback(guess, target)    // Wordle-style letter feedback
submitGuess(state, guess)         // Process a guess, return result
shareGrid(rows)                   // Convert feedback to emoji grid
shareText(mode, rows, solvedIn?)  // Generate shareable text
```

Core types:

```typescript
type LetterMark = "correct" | "present" | "absent"

interface GameState   { target: string; guesses: string[]; maxGuesses: number }
interface GuessResult { feedback: LetterFeedback[]; isWin: boolean }
interface WordItem    { word: string; clue?: string; expansion?: string; definition?: string }
```

### Word provider pattern

Two built-in implementations share a common interface:

```typescript
interface WordProvider {
  getRandomWord(category: Category): Promise<WordItem>
  isValidGuess(guess: string, category: Category): Promise<boolean>
}
```

- **LocalListProvider** (default) — in-memory JSON, works offline
- **HttpProvider** (optional) — remote API; enable via `VITE_PROVIDER=http` + `VITE_API_BASE=<url>`

### Theming

Themes are CSS variable sets defined in `tokens.css`. Dark is the default:

```css
--bg: #000b05      --fg: #e6fbee      --accent: #00cc66
--t-correct: #00cc66  --t-present: #f4d35e  --t-absent: #013518
--tile: clamp(3rem, 7vw, 4rem)        /* Fluid sizing */
```

Toggle sets `html[data-theme="light"]`, persisted to `localStorage("qwizzle:theme")`.

### Data persistence

```
localStorage:
  "qwizzle:theme"      → "dark" | "light"
  "qwizzle:stats"      → { played, wins, streak, best, score }
  "qwizzle:seen-help"  → "true"
```

### Daily puzzle seeding

`dailySeed(category, listLength)` hashes `"${category}-${YYYY-MM-DD}"` with djb2 and mods by list length — same category + date always produces the same index, rotating at midnight UTC.

### Error handling

| Layer | Errors |
|---|---|
| Engine | `TARGET_REQUIRED`, `WRONG_LENGTH`, `EMPTY_WORD_LIST` |
| UI validation | "Not enough letters", "Not in list" |
| React boundary | `ErrorBoundary.tsx` catches render errors, shows reload button |
| localStorage | Silent fallback to defaults |

---

## Plugin System

### Overview

The `@qwizzle/plugins` package provides a full extensibility layer: custom word lists, themes, and icons — no build step required.

```
packages/plugins/src/
├── types.ts                      # Core type definitions
├── registry.ts                   # PluginRegistry
├── loader.ts                     # Config loader
├── providers/
│   ├── GistProvider.ts           # GitHub Gist integration
│   ├── UrlProvider.ts            # Generic JSON URL/API
│   ├── LocalProvider.ts          # In-memory data
│   └── MultiSourceProvider.ts    # Combine multiple providers
└── themes/
    ├── ThemeLoader.ts            # Dynamic CSS injection
    └── defaultThemes.ts          # Built-in themes
```

### Quick start

1. Create a `qwizzle.config.json`:

```json
{
  "wordLists": [
    {
      "type": "gist",
      "gistId": "your-gist-id",
      "category": "custom"
    }
  ],
  "themes": [
    {
      "id": "my-theme",
      "name": "My Theme",
      "colors": {
        "bg": "#0a0e27",
        "fg": "#f2f2f2",
        "accent": "#ff006e",
        "muted": "#9d4edd",
        "tCorrect": "#00f5d4",
        "tPresent": "#ffbe0b",
        "tAbsent": "#2d3250"
      }
    }
  ],
  "theme": "my-theme"
}
```

2. Load in your app:

```tsx
import config from "./qwizzle.config.json";
import { PluginAwareProvider } from "./providers/PluginAwareProvider";

<PluginAwareProvider config={config}>
  <App />
</PluginAwareProvider>
```

### Word list providers

#### GitHub Gist

```json
{
  "type": "gist",
  "gistId": "abc123def456",
  "filename": "words.json",
  "category": "frontend"
}
```

Gist file format:
```json
[
  { "word": "REACT", "expansion": "...", "definition": "..." }
]
```

#### URL / JSON API

```json
{
  "type": "url",
  "url": "https://example.com/api/words.json",
  "category": "custom",
  "headers": { "Authorization": "Bearer token" }
}
```

Accepts array, `{ "words": [...] }`, or `{ "data": [...] }` response shapes.

#### Local (in-memory)

```json
{
  "type": "local",
  "category": "custom",
  "data": [
    { "word": "CUSTOM", "definition": "A custom word" }
  ]
}
```

### Word item schema

| Field | Required | Description |
|---|---|---|
| `word` | Yes | The word to guess (uppercased automatically) |
| `definition` | Recommended | Explanation shown as the puzzle clue |
| `expansion` | Optional | Full form of acronym |
| `clue` | Optional | Alternate hint field |

### Theme schema

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "description": "...",
  "version": "1.0.0",
  "author": "...",
  "colors": {
    "bg": "#1a1a2e",       "fg": "#eee",          "muted": "#888",
    "accent": "#e94560",   "accentFg": "#fff",
    "surface": "#16213e",  "surfaceBorder": "#0f3460",
    "tCorrect": "#00ff00", "tPresent": "#ffcc00",  "tAbsent": "#1a1a2e",
    "tBase": "#16213e",    "tBorder": "#0f3460",   "keyBorder": "#0f3460"
  },
  "lightColors": { "bg": "#fff", "fg": "#1a1a2e", "..." : "..." },
  "typography": { "primaryFont": "Inter, sans-serif" },
  "sizing": { "tile": "clamp(3rem, 7vw, 4rem)" },
  "icon": "https://example.com/icon.png"
}
```

Required colors: `bg`, `fg`, `accent`, `muted`, `tCorrect`, `tPresent`, `tAbsent`.

### Programmatic API

```typescript
import {
  createGistProvider, createUrlProvider,
  createLocalProvider, createMultiSourceProvider,
  createThemeLoader,
  loadConfig, loadConfigFromUrl, globalRegistry,
} from "@qwizzle/plugins";

// Providers
const provider = createGistProvider({ gistId: "abc123", category: "tech" });
const multi    = createMultiSourceProvider({
  providers: [provider, createUrlProvider({ url: "...", category: "extra" })],
  category: "combined",
  strategy: "random", // "round-robin" | "weighted"
});

// Themes
const loader = createThemeLoader();
loader.loadTheme(myTheme);
await loader.loadThemeFromUrl("https://example.com/theme.json");
loader.setPrefersDark(true);

// Config loading
await loadConfig(config);
const theme    = globalRegistry.getTheme("my-theme");
const provider = globalRegistry.getWordProvider("tech");
```

### Plugin registry

```typescript
class PluginRegistry {
  register(plugin, type, enabled)
  unregister(pluginId)
  enable(pluginId) / disable(pluginId)
  getWordProvider(category)
  getTheme(themeId)
  getCategories() / getAllThemes()
  getStats()
}
```

### Performance

- Remote word lists cached for 5 minutes
- Plugin registration: <1ms, theme loading: <5ms
- Plugin system bundle overhead: ~25 KB gzipped

---

## CLI Tool

`@qwizzle/cli` validates and scaffolds plugins:

```bash
# Validate a word list, theme, or config
npx @qwizzle/cli validate wordlist.json
npx @qwizzle/cli validate theme.json --type theme
npx @qwizzle/cli validate qwizzle.config.json

# Scaffold from templates
npx @qwizzle/cli create wordlist my-words
npx @qwizzle/cli create theme my-theme
npx @qwizzle/cli create config
```

---

## Testing & Linting

```bash
pnpm test                                          # Engine tests (Vitest)
pnpm test:plugins                                  # Plugin system tests
pnpm test:plugins:coverage                         # With coverage report
pnpm test:all                                      # All tests
pnpm --filter @qwizzle/plugins test:coverage       # Plugin coverage
npx vitest run                                     # Engine unit tests directly
pnpm run lint                                      # ESLint on web app
pnpm type-check                                    # Type-check all packages
pnpm validate                                      # type-check + lint + test
```

Test coverage targets 95%+, covering: plugin providers (Gist, URL, Local, MultiSource), plugin registry, theme system, and game engine.

---

## Customization (classic method)

- **Wordlists** — Edit `packages/wordlists/src/acronyms.json` (fields: `word`, `definition`, `expansion`).
- **Themes** — Update CSS variables in `apps/web/src/theme/tokens.css`; toggle persists to localStorage.

---

## Environment Variables

```env
VITE_PROVIDER=http              # Use HTTP provider instead of local
VITE_API_BASE=https://api.com   # Required when VITE_PROVIDER=http
```

When HTTP provider is active, the app expects:
- `GET /api/word?category=<acronym|vocab>`
- `GET /api/validate?category=<acronym|vocab>&guess=<word>`

---

## Contributing

1. Fork + clone the repo.
2. Create a feature branch: `git checkout -b feature/amazing-idea`
3. `corepack pnpm install` then `pnpm dev` to iterate locally.
4. Add tests when touching the engine; keep `pnpm validate` green.
5. Open a PR with a clear summary, screenshots for UI tweaks, and links to related issues.

Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, etc.

### Adding a provider

1. Implement the `WordProvider` interface.
2. Add tests.
3. Export from `packages/plugins/src/providers/index.ts`.

### Creating a theme

1. Follow the `ThemeManifest` schema.
2. Test in both light and dark modes (check contrast ratios).
3. Add to `examples/themes/` and reference in `examples/configs/`.

---

## License

[MIT](LICENSE) © 2025 Adil Leghari
