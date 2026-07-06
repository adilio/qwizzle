import { useEffect, useRef, useState } from "react";
import { appTitle } from "./brand";
import { winPercent } from "./engine";
import type { GameMode } from "./engine";
import { useGame } from "./game/useGame";
import { useTheme } from "./theme/useTheme";
import { useWordlists } from "./wordlists/useWordlists";
import { WordlistDialog } from "./wordlists/WordlistDialog";
import { useEdition } from "./editions/useEdition";
import { Studio } from "./studio/Studio";
import { useAuth } from "./supabase/useAuth";
import { AccountDialog } from "./account/AccountDialog";
import {
  fetchCloudStats,
  fetchCloudWordlists,
  fetchEditionBySlug,
  saveCloudStats,
  saveCloudWordlist,
  upsertProfile,
} from "./supabase/sync";
import { wordlistFromRef } from "./editions/edition";
import { gistProvider, urlProvider } from "./providers/providers";
import type { Wordlist } from "./providers/types";
import { Board } from "./game/Board";
import { Keyboard } from "./game/Keyboard";
import { Modal } from "./game/Modal";
import { ResultDialog } from "./game/ResultDialog";
import { Scoreboard } from "./game/Scoreboard";
import { Confetti } from "./game/Confetti";

function challengeIndexFromUrl(): number | undefined {
  const raw = new URLSearchParams(window.location.search).get("p");
  if (!raw || !/^\d{1,6}$/.test(raw)) return undefined;
  return Number(raw);
}

export default function App() {
  const wordlists = useWordlists();
  const wordlist = wordlists.active;
  const [challengeIndex] = useState(challengeIndexFromUrl);
  const game = useGame(wordlist, challengeIndex);
  const { theme, toggle: toggleTheme } = useTheme();
  const { edition, setEdition, reset: resetEdition } = useEdition(theme);
  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const auth = useAuth();
  const anyDialogOpen =
    helpOpen || statsOpen || resultOpen || wordsOpen || studioOpen || accountOpen;
  const anyDialogOpenRef = useRef(anyDialogOpen);
  anyDialogOpenRef.current = anyDialogOpen;

  const title = appTitle(edition.editionName);
  const { state, stats } = game;

  useEffect(() => {
    document.title = title;
  }, [title]);

  // Latest game/wordlists without retriggering the sync effects below.
  const gameRef = useRef(game);
  gameRef.current = game;
  const wordlistsRef = useRef(wordlists);
  wordlistsRef.current = wordlists;

  // First sync after sign-in: profile, stats merge, wordlists both ways.
  const syncedUser = useRef<string | null>(null);
  useEffect(() => {
    const user = auth.user;
    if (!user || syncedUser.current === user.id) return;
    syncedUser.current = user.id;
    void (async () => {
      await upsertProfile(
        user.id,
        (user.user_metadata?.full_name as string | undefined) ?? user.email ?? null,
      );
      const cloud = await fetchCloudStats();
      const local = gameRef.current.stats;
      if (!cloud || local.played >= cloud.played) {
        await saveCloudStats(user.id, local);
      } else {
        gameRef.current.replaceStats(cloud);
      }
      const cloudLists = await fetchCloudWordlists();
      if (cloudLists.length > 0) wordlistsRef.current.mergeLists(cloudLists);
      for (const list of wordlistsRef.current.lists) {
        if (list.sourceType !== "builtin") void saveCloudWordlist(user.id, list);
      }
    })();
  }, [auth.user]);

  // Mirror stats to the account, debounced.
  useEffect(() => {
    if (!auth.user) return;
    const userId = auth.user.id;
    const timeout = window.setTimeout(() => void saveCloudStats(userId, game.stats), 1500);
    return () => window.clearTimeout(timeout);
  }, [game.stats, auth.user]);

  // /e/<slug> public share links: apply the edition read-only, no login needed.
  const sharedLoaded = useRef(false);
  useEffect(() => {
    if (sharedLoaded.current) return;
    sharedLoaded.current = true;
    const match = window.location.pathname.match(/^\/e\/([a-z0-9]{4,32})\/?$/);
    if (!match) return;
    void fetchEditionBySlug(match[1]).then(async (cloud) => {
      if (!cloud) {
        setBanner("That share link doesn't exist or is no longer shared.");
        return;
      }
      setEdition(cloud.edition);
      const ref = cloud.edition.wordlist;
      let list: Wordlist | null = wordlistFromRef(ref);
      if (!list && ref.source_url) {
        try {
          const provider =
            ref.source_type === "gist" ? gistProvider(ref.source_url) : urlProvider(ref.source_url);
          list = (await provider.load()).wordlist;
        } catch {
          // shared list unavailable — the builtin list still plays
        }
      }
      if (list) wordlistsRef.current.addList(list);
      setBanner(`Playing a shared edition — ${appTitle(cloud.edition.editionName)}.`);
    });
  }, [setEdition]);

  // Imports go to the account too when signed in.
  function handleImportedList(list: Wordlist) {
    wordlists.addList(list);
    if (auth.user) void saveCloudWordlist(auth.user.id, list);
  }

  // First visit: show the help dialog once.
  useEffect(() => {
    try {
      if (localStorage.getItem("qwizzle:intro-seen") !== "1") {
        localStorage.setItem("qwizzle:intro-seen", "1");
        setHelpOpen(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Game just finished: confetti right away on a win, result dialog shortly after.
  const { justEnded, clearJustEnded } = game;
  useEffect(() => {
    if (!justEnded) return;
    clearJustEnded();
    if (justEnded === "won") {
      setConfettiBurst((n) => n + 1);
      // No cleanup here: clearing justEnded re-runs this effect immediately,
      // and a cleanup would cancel the pending dialog open.
      window.setTimeout(() => setResultOpen(true), 600);
    } else {
      setResultOpen(true);
    }
  }, [justEnded, clearJustEnded]);

  // Physical keyboard.
  const { type, backspace, submit } = game;
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (anyDialogOpenRef.current) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (event.key === "Enter") {
        // preventDefault so Enter doesn't also activate a focused button.
        event.preventDefault();
        submit();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        backspace();
      } else if (/^[a-zA-Z0-9]$/.test(event.key)) {
        type(event.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [type, backspace, submit]);

  function startGame(mode: GameMode) {
    setResultOpen(false);
    game.start(mode);
  }

  // Mobile: a transparent input overlaid on the board raises the OS keyboard
  // when the board is tapped. Its value is diffed against the current guess so
  // typing and deleting flow through the same engine as the on-screen keys.
  const boardInputRef = useRef<HTMLInputElement>(null);
  function handleBoardInput(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cur = game.currentGuess;
    if (next.length > cur.length) {
      for (const ch of next.slice(cur.length)) game.type(ch);
    } else if (next.length < cur.length) {
      for (let i = next.length; i < cur.length; i++) game.backspace();
    }
  }
  function handleBoardKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      game.submit();
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="title">
          <h1>
            <img src="/favicon.svg" alt="" className="title__logo" />
            {title}
          </h1>
          <p>A Wordle-inspired quiz game</p>
        </div>
        <nav className="actions" aria-label="Primary">
          <button type="button" className="btn btn--ghost" onClick={() => setHelpOpen(true)}>
            Help
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setStatsOpen(true)}>
            Stats
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setWordsOpen(true)}>
            Words
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setStudioOpen(true)}>
            Studio
          </button>
          {auth.enabled && (
            <button type="button" className="btn btn--ghost" onClick={() => setAccountOpen(true)}>
              {auth.user ? "👤 Account" : "Sign in"}
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </nav>
      </header>

      <section className="controls">
        <div className="controls__buttons">
          <button type="button" className="btn btn--accent" onClick={() => startGame(state.mode)}>
            Play
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={game.hint}
            disabled={state.status !== "playing"}
          >
            Hint
          </button>
        </div>
        <div className="controls__meta" role="status" aria-live="polite">
          <span>{wordlist.name}</span>
          <span>· Puzzle #{state.index + 1}</span>
          <span>
            {state.mode === "daily"
              ? `Daily • ${state.dateKey ?? ""}`
              : "Random challenge"}
          </span>
          {stats.streak > 0 && (
            <span className="streak-flair">
              {stats.streak >= 10 ? "🔥" : stats.streak >= 5 ? "⚡" : "⭐"} {stats.streak}
            </span>
          )}
        </div>
        <div className="mode-toggle" role="radiogroup" aria-label="Puzzle mode">
          {(["daily", "random"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className="chip"
              role="radio"
              aria-checked={state.mode === mode}
              data-active={state.mode === mode}
              onClick={() => state.mode !== mode && startGame(mode)}
            >
              {mode === "daily" ? "Daily" : "Random"}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            role="switch"
            aria-checked={game.hardMode}
            data-active={game.hardMode}
            title="Hard mode: revealed hints must be reused in later guesses"
            onClick={() => game.setHardMode(!game.hardMode)}
          >
            Hard
          </button>
        </div>
      </section>

      <section className="definition" aria-live="polite">
        <h2>Clue</h2>
        <p>{game.entry.definition ?? "No clue available — good luck!"}</p>
      </section>

      {banner && (
        <div className="message" role="status" aria-live="polite" data-tone="info">
          {banner}
        </div>
      )}

      <div className="message" role="status" aria-live="polite" data-tone={game.message?.tone}>
        {game.message?.text}
      </div>

      <div
        className="board-wrap"
        onClick={() => boardInputRef.current?.focus()}
      >
        <input
          ref={boardInputRef}
          className="board-input"
          type="text"
          value={game.currentGuess}
          onChange={handleBoardInput}
          onKeyDown={handleBoardKeyDown}
          maxLength={state.word.length}
          inputMode="text"
          enterKeyHint="go"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-hidden="true"
          tabIndex={-1}
          disabled={state.status !== "playing"}
        />
        <Board state={state} currentGuess={game.currentGuess} />
      </div>

      <Keyboard
        keyStates={game.keyStates}
        onKey={game.type}
        onEnter={game.submit}
        onBackspace={game.backspace}
      />

      <Scoreboard stats={stats} />

      <footer className="footer">
        <div>Type with your keyboard, tap the board, or tap the keys. Enter submits, Backspace deletes.</div>
        <div>
          <a
            href="https://github.com/adilio/qwizzle"
            target="_blank"
            rel="noopener"
            className="footer__link"
          >
            View on GitHub
          </a>
          {" · "}
          Made with 💜 in 🇨🇦 by{" "}
          <a
            href="https://github.com/adilio"
            target="_blank"
            rel="noopener"
            className="footer__link"
          >
            Adil Leghari
          </a>
        </div>
      </footer>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="How to play">
        <p>Guess the word hiding behind the clue. You get six shots!</p>
        <ul>
          <li>
            🟩 <strong>Green</strong> — right letter, right spot.
          </li>
          <li>
            🟨 <strong>Yellow</strong> — it&rsquo;s in the word, just move it.
          </li>
          <li>
            ⬛ <strong>Shaded</strong> — that letter isn&rsquo;t in the word.
          </li>
          <li>Type on your keyboard or tap the on-screen keys.</li>
          <li>
            Play <strong>Daily</strong> for the shared challenge or <strong>Random</strong> to keep
            going.
          </li>
        </ul>
      </Modal>

      <Modal open={statsOpen} onClose={() => setStatsOpen(false)} title="Statistics">
        <p>
          <strong>Score:</strong> {stats.score}
        </p>
        <p>
          <strong>Played:</strong> {stats.played}
        </p>
        <p>
          <strong>Win %:</strong> {winPercent(stats)}
        </p>
        <p>
          <strong>Current streak:</strong> {stats.streak}
        </p>
        <p>
          <strong>Best streak:</strong> {stats.best}
        </p>
      </Modal>

      <WordlistDialog
        open={wordsOpen}
        onClose={() => setWordsOpen(false)}
        lists={wordlists.lists}
        activeId={wordlist.id}
        onSelect={wordlists.setActive}
        onImported={handleImportedList}
        onRemove={wordlists.removeList}
      />

      <AccountDialog
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        user={auth.user}
        onSignIn={auth.signInWithGoogle}
        onSignOut={auth.signOut}
        edition={edition}
        onLoadEdition={setEdition}
      />

      <Studio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        edition={edition}
        onChange={setEdition}
        onReset={resetEdition}
        lists={wordlists.lists}
        activeListId={wordlist.id}
        onSelectList={wordlists.setActive}
        onImportedList={handleImportedList}
        aiEnabled={Boolean(auth.user)}
      />

      <ResultDialog
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        onPlayAgain={() => startGame(state.mode)}
        state={state}
        entry={game.entry}
        stats={stats}
        title={title}
        challengeUrl={
          // Only when the recipient can resolve the same list: the built-in
          // list (any visitor has it) or a shared edition path (/e/<slug>).
          wordlist.id === "builtin" || window.location.pathname.startsWith("/e/")
            ? `${window.location.origin}${window.location.pathname}?p=${state.index}`
            : null
        }
      />

      <Confetti burst={confettiBurst} />
    </div>
  );
}
