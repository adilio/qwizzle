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
        engine/        # Game logic and share helpers
        wordlists/     # JSON data for acronyms + vocab
        providers/     # Word provider interface + implementations
        hooks/         # useGameState, useKeyboard
        screens/       # GameScreen
        ui/            # Board, Keyboard
        theme/         # ThemeProvider, CSS tokens
        utils/         # storage, dailySeed
  tests/               # Engine unit tests
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
| Game logic (feedback algorithm) | `apps/web/src/engine/engine.ts` |
| Share/export (emoji grid) | `apps/web/src/engine/share.ts` |
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

## Testing & Linting

```bash
pnpm test        # Run engine tests (Vitest)
pnpm test:watch  # Watch mode
pnpm lint        # ESLint on web app
```

---

## Customization

- **Wordlists** — Edit `apps/web/src/wordlists/acronyms.json` (fields: `word`, `definition`, `expansion`).
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
4. Add tests when touching the engine; keep `pnpm test` and `pnpm lint` green.
5. Open a PR with a clear summary, screenshots for UI tweaks, and links to related issues.

Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, etc.

---

## License

[MIT](LICENSE) © 2025 Adil Leghari
