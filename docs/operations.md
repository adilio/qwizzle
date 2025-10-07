# Operations Cheatsheet

- `pnpm dev:web` – run the Vite dev server (default port 5173).
- `pnpm --filter qwizzle-web build && pnpm --filter qwizzle-web preview` – build and serve the production bundle for smoke checks.
- `pnpm size` – rebuild the web bundle and list asset sizes (watch for the 200 KB gzipped budget).
- `pnpm start:mobile` – launch the Expo scaffold once the mobile package is wired up.
