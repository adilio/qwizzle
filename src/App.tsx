import { useEffect, useRef, useState } from "react";
import { appTitle } from "./brand";
import { winPercent } from "./engine";
import type { GameMode } from "./engine";
import { BUILTIN_WORDLIST } from "./providers/builtin";
import { useGame } from "./game/useGame";
import { useTheme } from "./theme/useTheme";
import { Board } from "./game/Board";
import { Keyboard } from "./game/Keyboard";
import { Modal } from "./game/Modal";
import { ResultDialog } from "./game/ResultDialog";
import { Scoreboard } from "./game/Scoreboard";
import { Confetti } from "./game/Confetti";

export default function App() {
  const wordlist = BUILTIN_WORDLIST;
  const game = useGame(wordlist);
  const { theme, toggle: toggleTheme } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState(0);
  const anyDialogOpen = helpOpen || statsOpen || resultOpen;
  const anyDialogOpenRef = useRef(anyDialogOpen);
  anyDialogOpenRef.current = anyDialogOpen;

  const title = appTitle();
  const { state, stats } = game;

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
          <span>Puzzle #{state.index + 1}</span>
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
        </div>
      </section>

      <section className="definition" aria-live="polite">
        <h2>Clue</h2>
        <p>{game.entry.definition ?? "No clue available — good luck!"}</p>
      </section>

      <div className="message" role="status" aria-live="polite" data-tone={game.message?.tone}>
        {game.message?.text}
      </div>

      <Board state={state} currentGuess={game.currentGuess} />

      <Keyboard
        keyStates={game.keyStates}
        onKey={game.type}
        onEnter={game.submit}
        onBackspace={game.backspace}
      />

      <Scoreboard stats={stats} />

      <footer className="footer">
        <div>Type with your keyboard or tap the keys. Enter submits, Backspace deletes.</div>
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

      <ResultDialog
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        onPlayAgain={() => startGame(state.mode)}
        state={state}
        entry={game.entry}
        stats={stats}
        title={title}
      />

      <Confetti burst={confettiBurst} />
    </div>
  );
}
