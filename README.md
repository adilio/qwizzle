# Qwizzle

**A customizable, Wordle-inspired quiz game.** Guess the word from its clue —
then make the game your own: bring your own word lists, restyle every color,
and share your edition with friends.

**Play it at [qwizzle.4dl.ca](https://qwizzle.4dl.ca)** · part of the 4dl (4↓) family.

![Qwizzle share card](public/og-card.jpg)

## What it does

- **Daily & random modes** — the daily puzzle is deterministic per word list
  (everyone playing the same list gets the same word each UTC day), with
  Wordle-style feedback, correct duplicate-letter handling, streaks, scores,
  hints, an emoji share card, and win confetti.
- **Bring your own words** — import a word list from a JSON or CSV file,
  pasted text (`WORD=Definition` per line), any URL or API (a published
  Google Sheet CSV link works), or a GitHub Gist. The built-in list is the
  [Cyberdle](https://github.com/adilio/cyberdle) security-acronym set
  (164 words).
- **Studio** — restyle every design token (both dark and light variants)
  with a live preview of the board, keyboard, and panels. Derive palettes
  from a website's favicon, an uploaded screenshot (client-side median-cut
  quantization), or ask AI for a brand-inspired palette. A WCAG contrast
  guard warns about unreadable combinations and fixes them in one click —
  a custom theme can never produce an unplayable board.
- **Editions** — your name + colors + word list, saved as an *edition*
  (`Qwizzle: Cyber Edition`). Export/import as a portable JSON file with no
  account, or sign in with Google to sync editions, word lists, and stats
  across devices and publish a read-only share link anyone can play.

Everything works signed-out and offline-friendly: accounts only add sync
and sharing.

## Stack

Vite + React + TypeScript front end; a pure-TypeScript game engine with no
framework dependencies (fully unit-tested with Vitest); Supabase for
Google auth, Postgres (row-level security on everything), and one Edge
Function for the AI palette so the LLM key never reaches the browser.
Hosted on Netlify, DNS via Cloudflare.

```
src/engine/       pure game logic: feedback, daily seed, stats, share text
src/providers/    word-list sources: builtin, file, paste, URL/API, gist
src/theme/        design tokens, contrast guard, palette derivation
src/studio/       the customization Studio
src/editions/     edition model + portable JSON export/import
src/supabase/     config-gated client, auth, sync
supabase/         SQL migrations (schema + RLS) and the palette function
```

## Develop

```sh
pnpm install
pnpm dev          # local game, no backend needed
pnpm verify       # typecheck + lint + tests — gate every commit on this
pnpm build
```

Copy `.env.example` to `.env` and fill in the Supabase URL + anon key to
enable accounts locally. The same two `VITE_*` variables must be set in the
Netlify build environment for the deployed site; the `LLM_API_KEY` secret
lives in the Supabase Edge Function environment (`supabase secrets set`),
never in the client build.

## Want a single-file version?

Qwizzle is a built web app. If you want a zero-build, single-HTML-file
game you can copy anywhere, use its predecessor
**[Cyberdle](https://github.com/adilio/cyberdle)** — one `index.html`, no
tooling, same core gameplay.

## License

MIT © [Adil Leghari](https://github.com/adilio)
