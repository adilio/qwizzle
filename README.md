# Qwizzle

A friendly Word/Acronym guessing game inspired by Wordle and Cyberdle.
Crack the cybersecurity acronym hiding behind each clue, grow your streak,
and share your triumphs.

## ✨ Features

- **Daily + Random Modes** – Play the shared daily puzzle or spin up a random challenge whenever.
- **Cyberdle Dataset** – 160+ curated security acronyms with definitions and full expansions.
- **Streaks & Stats** – Local stats, running streak tracker, and a score system that rewards smart guesses.
- **Shareable Results** – One-tap clipboard/share support using the familiar emoji grid.
- **Theming** – Gorgeous dark and light themes with instant toggle and persistence.
- **Accessibility-minded UI** – Keyboard-first controls, aria-live messaging, and responsive layout.
- **🔌 Extensible Plugin System** – Easily plug in custom word lists from GitHub Gists, APIs, or local data.
- **🎨 Custom Themes** – Create and apply your own color schemes, fonts, and icons via simple JSON configuration.
- **📱 Mobile Support** – Full React Native app with the same great experience on iOS and Android.
- **🧪 Fully Tested** – Comprehensive test suite with 95%+ coverage.

## 🧱 Monorepo Layout

```
qwizzle/
  apps/
    web/         # Vite + React client
    mobile/      # React Native/Expo mobile app
  packages/
    engine/      # Core game logic and share helpers
    wordlists/   # JSON data for acronyms + vocab
    plugins/     # Extensibility system (providers, themes, registry)
  examples/      # Sample configs, themes, and word lists
  tests/         # Comprehensive test suites
```

### Key packages

- `@qwizzle/engine` – TypeScript engine that powers guesses, feedback, and sharing text.
- `@qwizzle/wordlists` – Bundled JSON word data; extend this to add new categories.
- `@qwizzle/plugins` – Plugin system for custom word lists, themes, and icons.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Corepack (ships with recent Node; enables pnpm)

```bash
corepack enable pnpm
```

### Install dependencies

```bash
corepack pnpm install
```

### Run the web app

```bash
corepack pnpm --filter qwizzle-web dev
```

Open [http://localhost:5173](http://localhost:5173) and start guessing.
The theme toggle, help modal, and sharing controls are built in.

### Production build preview

```bash
corepack pnpm --filter qwizzle-web build
corepack pnpm --filter qwizzle-web preview
```

### Mobile app

```bash
corepack pnpm --filter qwizzle-mobile start
```

Fully functional React Native app with:
- Same game logic as web
- Touch-optimized keyboard
- Native theme support
- Smooth animations

## 🧪 Testing & Linting

```bash
# Run all tests
corepack pnpm test

# Plugin system tests with coverage
corepack pnpm --filter @qwizzle/plugins test:coverage

# Engine unit tests
npx vitest run

# Lint web app
corepack pnpm run lint

# Mobile tests
corepack pnpm --filter qwizzle-mobile test
```

**Test Coverage:**
- Plugin providers (Gist, URL, Local, MultiSource)
- Plugin registry
- Theme system
- Game engine
- Target: 95%+ coverage

## 🛠️ Customize

### Plugin System

Qwizzle features a powerful extensibility system. Create custom word lists and themes without touching the codebase!

**Quick Start:**

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

**Documentation:**
- [Plugin Development Guide](PLUGIN_DEVELOPMENT_GUIDE.md) - Complete guide for creating plugins
- [Extensibility Architecture](EXTENSIBILITY_ARCHITECTURE.md) - Technical architecture details
- [Examples](examples/) - Sample configurations, themes, and word lists

**Supported Word Sources:**
- GitHub Gists
- Any JSON API/URL
- Local data
- Multiple providers combined

### Classic Method

- **Wordlists** – Edit `packages/wordlists/src/acronyms.json` to swap or extend puzzles
  (fields: `word`, `definition`, `expansion`). Add additional lists in the same format.
- **Themes** – Update CSS variables in `apps/web/src/theme/tokens.css` to adjust
  the palette. The toggle persists preference in local storage.

## 🤝 Contributing

1. Fork + clone the repo.
2. Create a feature branch (`git checkout -b feature/amazing-idea`).
3. Run `corepack pnpm install` and `corepack pnpm --filter qwizzle-web dev` to iterate locally.
4. Add tests when touching the engine; ensure `npx vitest run` and `corepack pnpm run lint` stay green.
5. Open a PR with a clear summary, screenshots for UI tweaks, and links to related issues.

### Conventional Commit Hints

- `feat:`, `fix:`, `chore:`, `docs:`, etc. for clean history and changelog-ready messages.

## 📄 License

[MIT](LICENSE) © 2025 Adil Leghari

---

Need a primer on contributing as an LLM agent? See [AGENTS.md](AGENTS.md) for repository guidelines.
