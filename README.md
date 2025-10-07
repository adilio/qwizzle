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

## 🧱 Monorepo Layout

```
qwizzle/
  apps/
    web/         # Vite + React client
    mobile/      # Expo scaffold (placeholder)
  packages/
    engine/      # Core game logic and share helpers
    wordlists/   # JSON data for acronyms + vocab
  docs/          # Ops notes and future contributor docs
  tests/         # Vitest suites (engine, etc.)
```

### Key packages

- `@qwizzle/engine` – TypeScript engine that powers guesses, feedback, and sharing text.
- `@qwizzle/wordlists` – Bundled JSON word data; extend this to add new categories.

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

### Mobile scaffold (optional)

```bash
corepack pnpm --filter qwizzle-mobile start
```

> The Expo app is a placeholder for now—perfect for experimenting with a future companion app.

## 🧪 Testing & Linting

```bash
npx vitest run                # engine unit tests
corepack pnpm run lint        # lint web app (engine/wordlists scripts currently echo TODO)
```

## 🛠️ Customize

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
