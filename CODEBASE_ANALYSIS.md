# QWIZZLE CODEBASE - COMPREHENSIVE ARCHITECTURE ANALYSIS

**Generated:** November 15, 2025  
**Project:** Qwizzle - Word/Acronym Guessing Game (Wordle-style)  
**Type:** TypeScript Monorepo with pnpm workspaces

---

## EXECUTIVE SUMMARY

Qwizzle is a well-structured monorepo consisting of:

1. **Web App** (React 19 + Vite + TypeScript) - Production-ready
2. **Mobile App** (Expo placeholder) - Future implementation
3. **Game Engine** (Shared TypeScript library) - Core logic
4. **Word Lists** (JSON data packages) - Curated puzzle data

The architecture emphasizes **shared logic**, **type safety**, and **clean separation of concerns** across multiple packages and platforms.

---

## KEY ARCHITECTURE DECISIONS

### 1. **Monorepo Structure (pnpm workspaces)**
- Allows shared `@qwizzle/engine` and `@qwizzle/wordlists` packages
- Enables code reuse across web and mobile platforms
- Clear boundary between game logic and UI implementations
- Single source of truth for data and game mechanics

### 2. **React 19 with TypeScript**
- Full type safety with strict compiler settings
- Modern hooks-based architecture (no Redux/MobX)
- Context API for theme and word provider management
- Functional components with proper dependency management

### 3. **Vite for Build & Development**
- Lightning-fast development server (HMR enabled)
- Modern ES module bundling
- Production build under 200 KB gzipped
- CSS-in-JS via CSS variables (tokens) for theming

### 4. **Game Engine Abstraction**
- **Pure functions**: `newGame()`, `computeFeedback()`, `submitGuess()`
- **No side effects** - easily testable with Vitest
- **Provider pattern** for word sources (LocalList, HTTP, or custom)
- **Type definitions** expose contract clearly

### 5. **Data Storage Strategy**
- **Default**: Embedded JSON (160+ cybersecurity acronyms)
- **Alternative**: HTTP provider interface for remote sources
- **Environment-based switching**: VITE_PROVIDER env variable
- **Easy to extend**: Add new categories via JSON files

---

## CRITICAL FILE PATHS & STRUCTURE

### Root Level Files
```
/home/user/qwizzle/
├── package.json                 # Monorepo root config
├── pnpm-workspace.yaml          # pnpm workspace definition
├── tsconfig.base.json           # Base TypeScript config
├── vitest.config.ts             # Test configuration
├── index.html                   # Legacy version (reference)
├── style.css                    # Legacy CSS
├── acronyms.js                  # Legacy data
└── docs/operations.md           # Deployment guide
```

### Web App (`/apps/web/`)
```
/home/user/qwizzle/apps/web/
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root component
│   ├── theme/
│   │   ├── theme.tsx            # ThemeProvider context
│   │   ├── tokens.css           # CSS variables (dark/light)
│   │   └── app.css              # Global component styles
│   ├── screens/
│   │   └── GameScreen.tsx       # Main UI container (850+ lines)
│   ├── ui/
│   │   ├── Board.tsx            # Guess grid
│   │   └── Keyboard.tsx         # On-screen keyboard
│   ├── hooks/
│   │   ├── useGameState.ts      # Core game state (345 lines)
│   │   └── useKeyboard.ts       # Keyboard events
│   ├── providers/
│   │   ├── index.tsx            # Provider setup
│   │   ├── WordProvider.ts      # Interface definition
│   │   ├── LocalListProvider.ts # Default provider
│   │   └── HttpProvider.ts      # Optional HTTP provider
│   ├── utils/
│   │   ├── storage.ts           # localStorage wrapper
│   │   └── dailySeed.ts         # Daily puzzle seeding
│   └── error/
│       └── ErrorBoundary.tsx    # React error boundary
├── index.html                   # Vite template
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript config
├── eslint.config.mjs            # ESLint rules
└── public/
    ├── manifest.webmanifest     # PWA manifest
    └── icons/                   # Icon placeholder
```

### Game Engine (`/packages/engine/`)
```
/home/user/qwizzle/packages/engine/src/
├── index.ts                     # Public API exports
├── types.ts                     # Type definitions
├── engine.ts                    # Game logic (feedback algorithm)
└── share.ts                     # Share/export functionality
```

### Word Lists (`/packages/wordlists/`)
```
/home/user/qwizzle/packages/wordlists/src/
├── index.ts                     # JSON exports
├── acronyms.json                # 160+ cybersecurity acronyms
└── words.json                   # General vocabulary (expandable)
```

### Tests (`/tests/engine/`)
```
/home/user/qwizzle/tests/
├── engine/
│   └── edge-cases.test.ts       # Engine unit tests (2 tests)
```

---

## COMPONENT HIERARCHY & DATA FLOW

### React Component Tree
```
App
├── ThemeProvider [theme context]
│   └── WordProviderProvider [word source context]
│       └── ErrorBoundary [catches render errors]
│           └── GameScreen [main UI container]
│               ├── Header (title, help, stats, theme toggle)
│               ├── Controls (play, hint, mode toggle)
│               ├── Definition display
│               ├── Message/Status
│               ├── Play Area
│               │   ├── Board [grid of tiles]
│               │   └── Keyboard [on-screen buttons]
│               ├── Scoreboard
│               ├── Footer (links, credits)
│               └── Modals (Help, Stats, Results)
```

### Key State Management
1. **ThemeProvider**: Dark/light mode (persisted)
2. **WordProviderProvider**: Word source selection
3. **useGameState Hook**: 
   - Game progress (rows, cursor, feedback)
   - Game stats (played, wins, streak, score)
   - User messages and animations
   - Result display

### Data Persistence
```
localStorage:
  "qwizzle:theme"     → "dark" | "light"
  "qwizzle:stats"     → { played, wins, streak, best, score }
  "qwizzle:seen-help" → "true" (help modal flag)
```

---

## GAME FLOW WALKTHROUGH

### Initialization
1. App mounts → ThemeProvider loads theme from localStorage
2. WordProviderProvider resolves provider (local or HTTP)
3. GameScreen mounts → useGameState hook initializes
4. selectPuzzle() gets word from provider
5. newGame() creates GameState object
6. UI renders with definition and empty board

### User Guess Flow
1. User presses keys → useKeyboard captures input
2. onChar updates current row in state
3. User presses Enter → onEnter triggers validation
4. Validation:
   - Check length
   - Check validity via provider.isValidGuess()
5. Valid guess:
   - Call engine.submitGuess()
   - computeFeedback() generates letter feedback
   - Update keyState (keyboard colors)
   - Increment cursor to next row
   - Check for win/loss
6. Invalid guess:
   - Show error message
   - Flash invalid row animation
   - Auto-clear message after 3s

### Game End
1. Max guesses reached or word guessed correctly
2. updateStats() persists stats to localStorage
3. Result modal displays
4. If win: confetti animation triggers
5. Share button available (emoji grid format)

---

## THEMING SYSTEM

### CSS Variables (Dark Theme Default)
```css
--bg: #000b05                    /* Background */
--fg: #e6fbee                    /* Foreground/text */
--accent: #00cc66                /* Primary accent */
--surface: #001509               /* Card backgrounds */
--t-correct: #00cc66             /* Correct tile */
--t-present: #f4d35e             /* Present tile */
--t-absent: #013518              /* Absent tile */
```

### Light Theme Variant
```css
:root[data-theme='light'] {
  /* Inverted/adjusted colors */
}
```

### Responsive Sizing (Clamp)
```css
--tile: clamp(3rem, 7vw, 4rem)
--gap: clamp(0.35rem, 2vw, 0.55rem)
--pad: clamp(1rem, 4vw, 2.4rem)
```

---

## WORD LISTS & DATA STRUCTURE

### Acronyms (160+ items)
```json
[
  {
    "word": "CNAPP",
    "expansion": "Cloud-Native Application Protection Platform",
    "definition": "A comprehensive security platform..."
  },
  ...
]
```

### Words (General Vocabulary)
```json
[
  { "word": "REACT", "clue": "A JavaScript library..." },
  ...
]
```

### Data Selection
- **Daily Mode**: Hash-based seeding (djb2 algorithm)
  - Same date + category → same puzzle
  - Changes at midnight UTC
- **Random Mode**: Math.random() selection

### Provider Pattern
```typescript
interface WordProvider {
  getRandomWord(category: Category): Promise<WordItem>
  isValidGuess(guess: string, category: Category): Promise<boolean>
}
```

Two implementations:
1. **LocalListProvider** (default): In-memory JSON data
2. **HttpProvider** (optional): Remote API calls

---

## TESTING & QUALITY ASSURANCE

### Test Setup
- **Framework**: Vitest (Vite-native testing)
- **Configuration**: `/vitest.config.ts`
- **Test Files**: `/tests/engine/edge-cases.test.ts`

### Current Test Coverage
```typescript
✓ Handles repeated letters correctly
✓ Throws on wrong-length guess
```

### Linting
- **ESLint** configured for web app
- **Rules**:
  - Type imports preferred
  - No unused variables (except _ prefixed)
  - React hooks validation
- **Engine/Wordlists**: TODO linting scripts

---

## BUILD & DEPLOYMENT

### Development
```bash
pnpm dev:web     # Start Vite dev server (port 5173)
pnpm test        # Run Vitest
pnpm lint        # Run ESLint
```

### Production
```bash
pnpm build:web   # Build for production
pnpm preview:web # Preview production build
pnpm size        # Build + list asset sizes
```

### Build Configuration
- **Output**: `apps/web/dist/`
- **Target Size**: ~200 KB gzipped
- **Minification**: JS + CSS via Vite
- **Code Splitting**: Automatic by Vite

### Environment Variables
```env
VITE_PROVIDER=http              # Optional provider
VITE_API_BASE=https://api.com   # API endpoint
```

---

## ACCESSIBILITY & UX

### Keyboard Support
- A-Z input via keyboard
- Enter to submit
- Backspace to delete
- Visual on-screen keyboard
- Proper ARIA labels and live regions

### Responsive Design
- Mobile-first with clamp() functions
- Safe area insets (notch support)
- Touch-friendly (44px minimum buttons)
- No tap highlight colors

### Modals
- Help (tutorial on first visit)
- Stats (game statistics)
- Results (win/loss with share)
- All dismissable with close button

---

## IMPORTANT CONFIGURATION FILES

### `tsconfig.base.json`
Path aliases for monorepo:
- `@qwizzle/engine` → `packages/engine/src/index.ts`
- `@qwizzle/wordlists/*` → `packages/wordlists/src/*`

### `vite.config.ts`
- Port: 5173
- React plugin enabled
- Additional aliases:
  - `@` → `src/`
  - `@qwizzle/providers` → `src/providers`
  - `@qwizzle/utils` → `src/utils`

### `apps/web/eslint.config.mjs`
- TypeScript support
- React hooks validation
- No undef warnings (uses TypeScript)

---

## KEY INSIGHTS & PATTERNS

### 1. **Pure Engine Logic**
All game mechanics are in `@qwizzle/engine` - pure functions with no React/platform dependencies. This enables:
- Easy testing without UI
- Reuse across web/mobile/CLI
- Clear API contract

### 2. **Provider Pattern for Data**
WordProvider interface allows swapping implementations without UI changes:
- Local (default) - immediate, works offline
- HTTP (optional) - remote, persistent, server-managed
- Custom - extensible for future needs

### 3. **Context API for Global State**
Two context providers handle:
- **Theme**: Minimal state, localStorage persistence
- **Word Provider**: Resolved once at startup

Remaining state lives in hooks and components (useGameState).

### 4. **Single Source of Truth**
- Word data: JSON files in `@qwizzle/wordlists`
- Game logic: TypeScript in `@qwizzle/engine`
- CSS theming: Variables in `tokens.css`

### 5. **Accessibility First**
- ARIA landmarks and roles throughout
- aria-live regions for messages
- Keyboard navigation primary
- Mouse/touch as fallback

---

## EXPANSION POINTS & TODOs

### Documented TODOs
1. **Mobile Integration**: Expo app needs engine/wordlists integration
2. **Linting**: Engine and wordlists packages need ESLint config
3. **CI/CD**: GitHub Actions pipeline not set up
4. **Icons**: Public/icons directory ready for PNG assets
5. **HTTP Provider**: API endpoints need backend implementation

### Suggested Improvements
1. **More Tests**: Cover edge cases in useGameState, share function
2. **Category Toggle**: UI for switching between acronym/vocab modes
3. **Stats Modal**: Add distribution chart (histogram of guess counts)
4. **Dark Mode**: Already implemented but could add more themes
5. **PWA Features**: Install prompts, offline support
6. **Analytics**: Track gameplay, popular acronyms

---

## DEPLOYMENT CHECKLIST

- [ ] Environment variables set (if using HTTP provider)
- [ ] PWA icons in `public/icons/` (optional)
- [ ] Run `pnpm build:web` to create dist
- [ ] Serve `apps/web/dist/` as static files
- [ ] Enable HTTPS (recommended for PWA)
- [ ] Set CSP headers if needed
- [ ] Consider caching strategy (manifest, JS, CSS)

---

## EXTERNAL DEPENDENCIES

### Production
- **react** 19.0.0 - UI framework
- **canvas-confetti** 1.9.3 - Win animation

### Development
- **vite** 5.2.0 - Build tool
- **typescript** 5.4.0 - Type safety
- **vitest** 1.6.0 - Testing framework
- **eslint** 8.57.0 - Code quality
- **lightningcss** 1.21.0 - CSS minification

---

## CONCLUSION

Qwizzle demonstrates strong architectural principles:
- Clear separation of concerns (engine vs UI)
- Type-safe implementation throughout
- Reusable, composable components
- Extensible provider pattern
- Mobile-ready codebase structure

The monorepo setup enables code sharing between web and mobile while maintaining clean boundaries. The shared `@qwizzle/engine` ensures consistent game mechanics across all platforms.

**Status**: Production-ready for web, mobile scaffold ready for development.

