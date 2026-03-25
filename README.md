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
- **Fully Tested** - Engine unit tests with Vitest.

---

## Project Layout

```
qwizzle/
  apps/
    web/               # Vite + React app
      src/
        engine/        # Pure game logic and share helpers
        wordlists/     # JSON data (acronyms.json, words.json) + barrel index
        providers/     # WordProvider interface + LocalList, Http, URL, Gist impls
        hooks/         # useGameState, useKeyboard
        screens/       # GameScreen
        ui/            # Board, Keyboard
        components/    # Shared UI (LoadingSpinner)
        theme/         # ThemeProvider, applyTheme, CSS tokens
        error/         # ErrorBoundary
        utils/         # storage, dailySeed
  tests/
    engine/            # Engine unit tests
```

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
pnpm dev
```

Open http://localhost:5173 and start guessing.

### Production build

```bash
pnpm build      # Build web app
pnpm preview    # Preview production bundle
pnpm size       # Build and list asset sizes (target: ~200 KB gzipped)
```

---

## Architecture

### React Component Tree

```
App({ config? })
└── ErrorBoundary
    └── ThemeProvider
        └── WordProviderProvider
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
| App entry + config | `apps/web/src/App.tsx` |
| Game logic (feedback algorithm) | `apps/web/src/engine/engine.ts` |
| Share/export (emoji grid) | `apps/web/src/engine/share.ts` |
| Core game state hook | `apps/web/src/hooks/useGameState.ts` |
| Main UI container | `apps/web/src/screens/GameScreen.tsx` |
| Word provider interface | `apps/web/src/providers/WordProvider.ts` |
| Provider context + hook | `apps/web/src/providers/index.tsx` |
| Daily puzzle seeding | `apps/web/src/utils/dailySeed.ts` |
| CSS variables / theming | `apps/web/src/theme/tokens.css` |
| Runtime theme injection | `apps/web/src/theme/applyTheme.ts` |

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

All word providers satisfy a single interface:

```typescript
interface WordProvider {
  getRandomWord(category: Category): Promise<WordItem>
  isValidGuess(guess: string, category: Category): Promise<boolean>
}
```

Four built-in implementations:

| Provider | Description |
|---|---|
| `LocalListProvider` | Default — in-memory JSON, works offline |
| `createHttpProvider(baseUrl)` | REST API via `VITE_PROVIDER=http` + `VITE_API_BASE` |
| `createUrlProvider(url, category, headers?)` | Fetch a JSON word list from any URL |
| `createGistProvider(gistId, category, filename?)` | Fetch a JSON word list from a GitHub Gist |

The active provider is injected via `WordProviderProvider` and consumed with `useWordProvider()`.

---

## Extensibility

### Custom word lists

Pass any `WordProvider` through `AppConfig` to replace the built-in dataset at runtime:

```typescript
import App from "./App";
import { createUrlProvider } from "./providers";

const myProvider = createUrlProvider(
  "https://example.com/my-words.json",
  "acronym",
);

<App config={{ wordProvider: myProvider }} />
```

`createUrlProvider` accepts an optional `headers` map for authenticated endpoints.

`createGistProvider` resolves the raw URL from the GitHub Gist API — useful for
hosting word lists without a server:

```typescript
import { createGistProvider } from "./providers";

const provider = createGistProvider(
  "abc123gistid",   // Gist ID
  "acronym",
  "my-words.json",  // optional: specific filename within the gist
);
```

Word lists must be a JSON array (or an object with a `words` or `data` array) where
each entry has at minimum a `word` field:

```json
[
  { "word": "SOC", "definition": "Security Operations Center" },
  { "word": "IOC", "expansion": "Indicator of Compromise" }
]
```

`word` is normalised to uppercase automatically. `definition` falls back to `clue` if absent.

You can also implement `WordProvider` directly for fully custom behaviour (database
lookups, weighted randomisation, A/B testing, etc.) and pass it the same way.

### Custom themes

Call `applyTheme` to inject a `<style>` block that overrides the CSS token defaults.
Both dark and optional light overrides are supported:

```typescript
import { applyTheme } from "./theme/applyTheme";
import type { CustomTheme } from "./theme/applyTheme";

const myTheme: CustomTheme = {
  colors: {
    bg: "#0d0d0d",
    fg: "#f0f0f0",
    accent: "#7c3aed",
    muted: "#a78bfa",
    tCorrect: "#7c3aed",
    tPresent: "#f59e0b",
    tAbsent: "#1e1e1e",
  },
  lightColors: {
    bg: "#ffffff",
    fg: "#111111",
    accent: "#7c3aed",
  },
};

// standalone
applyTheme(myTheme);

// or via AppConfig (applied on mount)
<App config={{ theme: myTheme }} />
```

The full set of overridable color keys:

| Key | CSS variable | Role |
|---|---|---|
| `bg` | `--bg` | Page background |
| `bgGlow` | `--bg-glow` | Ambient glow behind board |
| `fg` | `--fg` | Primary text |
| `muted` | `--muted` | Secondary text |
| `accent` | `--accent` | Brand / highlight |
| `accentFg` | `--accent-fg` | Text on accent backgrounds |
| `success` | `--success` | Win state |
| `danger` | `--danger` | Error state |
| `surface` | `--surface` | Card / modal background |
| `surfaceBorder` | `--surface-border` | Card borders |
| `tCorrect` | `--t-correct` | Correct letter tile |
| `tPresent` | `--t-present` | Present letter tile |
| `tAbsent` | `--t-absent` | Absent letter tile |

Styles are injected into `#qwizzle-custom-theme` in `<head>` and override the
defaults in `tokens.css`. The dark/light toggle still works — provide `lightColors`
to customise that variant too.

---

## Theming internals

The default palette lives in `tokens.css`. Dark is the default; light is activated
by `html[data-theme="light"]`, persisted to `localStorage("qwizzle:theme")`.
`ThemeProvider` manages the toggle and `applyTheme` handles runtime injection.

---

## Data persistence

```
localStorage:
  "qwizzle:theme"      → "dark" | "light"
  "qwizzle:stats"      → { played, wins, streak, best, score }
  "qwizzle:seen-help"  → "true"
```

## Daily puzzle seeding

`dailySeed(category, listLength)` hashes `"${category}-${YYYY-MM-DD}"` with djb2
and mods by list length — same category + date always produces the same index,
rotating at midnight UTC.

## Error handling

| Layer | Errors |
|---|---|
| Engine | `TARGET_REQUIRED`, `WRONG_LENGTH`, `EMPTY_WORD_LIST` |
| UI validation | "Not enough letters", "Not in list" |
| React boundary | `ErrorBoundary.tsx` catches render errors, shows reload button |
| localStorage | Silent fallback to defaults |

---

## Testing & Linting

```bash
pnpm test        # Run engine tests (Vitest)
pnpm test:watch  # Watch mode
pnpm lint        # ESLint on web app
```

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
4. Add tests when touching the engine; keep `pnpm test` and `pnpm lint` green.
5. Open a PR with a clear summary, screenshots for UI tweaks, and links to related issues.

Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, etc.

---

## License

[MIT](LICENSE) © 2025 Adil Leghari
