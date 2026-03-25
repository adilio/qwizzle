import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import confetti from "canvas-confetti";
import { shareText } from "../engine";
import { Board } from "../ui/Board";
import { Keyboard } from "../ui/Keyboard";
import { useKeyboard } from "../hooks/useKeyboard";
import { useGameState } from "../hooks/useGameState";
import type { PuzzleMode } from "../hooks/useGameState";
import { useWordProvider } from "@qwizzle/providers";
import { useTheme } from "../theme/theme";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  statusMessage?: string | null;
  statusTone?: "success" | "error";
}

function Modal({ open, title, onClose, children, actions, statusMessage, statusTone }: ModalProps) {
  if (!open) {
    return null;
  }
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal">
        <header className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {actions ? <div className="modal__actions">{actions}</div> : null}
        {statusMessage ? (
          <div
            className={`modal__status${statusTone === "error" ? " modal__status--error" : " modal__status--success"}`}
            role="status"
            aria-live="polite"
          >
            {statusMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function GameScreen() {
  const provider = useWordProvider();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<PuzzleMode>("daily");
  const [hintRevealed, setHintRevealed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const keyCaptureRef = useRef<HTMLInputElement>(null);
  const modeEffectGuard = useRef(true);

  const {
    rows,
    cursor,
    feedbackRows,
    keyState,
    message,
    messageTone,
    definition,
    expansion,
    loading,
    error,
    animatingRow,
    invalidRow,
    targetLength,
    stats,
    result,
    solution,
    onChar,
    onEnter,
    onBackspace,
    reset,
    clearMessage,
  } = useGameState({ provider, category: "acronym", mode });

  useKeyboard(onChar, onEnter, onBackspace, [onChar, onEnter, onBackspace]);

  const shouldCaptureKeyboard = !showHelp && !showStats && !showResult;

  const focusKeyCapture = useCallback(() => {
    if (!shouldCaptureKeyboard) {
      return;
    }
    keyCaptureRef.current?.focus({ preventScroll: true });
  }, [shouldCaptureKeyboard]);

  const handleKeyCaptureKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (showHelp || showStats || showResult) {
        return;
      }
      const { key } = event;
      if (key === "Enter") {
        event.preventDefault();
        onEnter();
        event.currentTarget.value = "";
        return;
      }
      if (key === "Backspace") {
        event.preventDefault();
        onBackspace();
        event.currentTarget.value = "";
        return;
      }
      if (/^[a-zA-Z]$/.test(key)) {
        event.preventDefault();
        onChar(key.toUpperCase());
        event.currentTarget.value = "";
      }
    },
    [onBackspace, onChar, onEnter, showHelp, showResult, showStats],
  );

  const handlePlayAreaPointerDown = useCallback(() => {
    focusKeyCapture();
  }, [focusKeyCapture]);

  useEffect(() => {
    if (cursor > 0 && focusRef.current) {
      focusRef.current.focus();
    }
  }, [cursor]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timeout = window.setTimeout(() => {
      clearMessage();
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [message, clearMessage]);

  useEffect(() => {
    if (modeEffectGuard.current) {
      modeEffectGuard.current = false;
      return;
    }
    setHintRevealed(false);
    clearMessage();
    reset();
  }, [mode, clearMessage, reset]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const seen = window.localStorage.getItem("qwizzle:seen-help");
    if (!seen) {
      setShowHelp(true);
    }
  }, []);

  useEffect(() => {
    if (!result) {
      setShowResult(false);
      setShareStatus(null);
      return;
    }
    setShowResult(true);
    if (result.outcome === "win") {
      const defaults = { origin: { y: 0.6 } } as const;
      confetti({
        ...defaults,
        particleCount: 240,
        spread: 95,
        startVelocity: 55,
        scalar: 1.1,
      });
      confetti({
        ...defaults,
        particleCount: 180,
        spread: 120,
        startVelocity: 45,
        scalar: 1.2,
        decay: 0.9,
      });
      confetti({
        origin: { y: 0.3 },
        particleCount: 140,
        spread: 110,
        startVelocity: 60,
        scalar: 1.15,
      });
    }
  }, [result]);

  useEffect(() => {
    if (shouldCaptureKeyboard) {
      focusKeyCapture();
    } else {
      keyCaptureRef.current?.blur();
    }
  }, [focusKeyCapture, shouldCaptureKeyboard]);

  const puzzleDate = useMemo(() => new Date().toLocaleDateString(undefined, { dateStyle: "medium" }), []);

  const statusLabel = loading
    ? "Loading puzzle…"
    : error
      ? "Could not load puzzle"
      : mode === "daily"
        ? `Daily puzzle`
        : "Random puzzle";

  const showExpansion = hintRevealed || result?.outcome === "win";

  const closeHelp = () => {
    setShowHelp(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("qwizzle:seen-help", "true");
    }
  };

  const handleShare = async () => {
    if (!result) {
      return;
    }
    const solvedIn = result.outcome === "win" ? result.guessesUsed : undefined;
    const shareMessage = shareText("acronym", result.feedbackRows, solvedIn, window.location.origin);
    try {
      if (navigator.share) {
        await navigator.share({ text: shareMessage });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareMessage);
      } else {
        throw new Error("Share not supported");
      }
      setShareStatus({ tone: "success", message: "Shared!" });
    } catch (err) {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareMessage);
          setShareStatus({ tone: "success", message: "Copied to clipboard" });
        } else {
          throw err;
        }
      } catch (copyError) {
        setShareStatus({ tone: "error", message: "Unable to share. Copy manually." });
      }
    }
  };

  const handlePlayAgain = useCallback(() => {
    setShowResult(false);
    setShareStatus(null);
    setHintRevealed(false);
    clearMessage();
    reset();
  }, [clearMessage, reset]);

  useEffect(() => {
    if (!showResult) {
      return undefined;
    }
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handlePlayAgain();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showResult, handlePlayAgain]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="title">
          <h1>
            <span aria-hidden="true" role="img">
              🔐
            </span>
            Qwizzle
          </h1>
          <p>The Word/Acronym Guessing Game</p>
        </div>
        <nav className="actions" aria-label="Primary">
          <button type="button" className="btn btn--ghost" onClick={() => setShowHelp(true)}>
            Help
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setShowStats(true)}>
            Stats
          </button>
          <button type="button" className="btn" onClick={toggleTheme}>
            {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </button>
        </nav>
      </header>

      <section className="controls">
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => {
            setHintRevealed(false);
            clearMessage();
            reset();
          }}
        >
          Play
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setHintRevealed(true)}
          disabled={showExpansion}
        >
          Hint
        </button>
        <div className="controls__meta" role="status" aria-live="polite">
          <span>{statusLabel}</span>
          {mode === "daily" ? <span>{puzzleDate}</span> : null}
          <span className="streak-pill">Streak: {stats.streak}</span>
        </div>
        <div className="mode-toggle" role="radiogroup" aria-label="Puzzle mode">
          {(["daily", "random"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="chip"
              data-active={mode === value}
              onClick={() => setMode(value)}
            >
              {value === "daily" ? "Daily" : "Random"}
            </button>
          ))}
        </div>
      </section>

      <section className="definition" aria-live="polite">
        <h2>Definition</h2>
        <p>{definition ?? "Loading definition…"}</p>
        {showExpansion && expansion ? (
          <p>
            <strong>Expansion:</strong> {expansion}
          </p>
        ) : null}
      </section>

      <p className="message" role="status" aria-live="polite" data-tone={messageTone}>
        {message}
      </p>

      <input
        ref={keyCaptureRef}
        id="key-capture"
        type="text"
        aria-hidden="true"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        data-keyboard-capture="true"
        onKeyDown={handleKeyCaptureKeyDown}
      />

      {loading ? (
        <p role="status">Fetching puzzle…</p>
      ) : error ? (
        <div role="alert">
          <p>Could not load the puzzle.</p>
          <button type="button" className="btn btn--accent" onClick={reset}>
            Retry
          </button>
        </div>
      ) : (
        <div className="play-area" onPointerDown={handlePlayAreaPointerDown}>
          <Board
            ref={focusRef}
            rows={rows}
            feedbackRows={feedbackRows}
            cursor={cursor}
            targetLength={targetLength}
            animatingRow={animatingRow}
            invalidRow={invalidRow}
          />
          <Keyboard keyState={keyState} onChar={onChar} onEnter={onEnter} onBackspace={onBackspace} />
        </div>
      )}

      <section className="scoreboard" aria-label="Stats">
        <div className="score">
          <span className="score__label">Score</span>
          <span className="score__value">{stats.score}</span>
        </div>
        <div className="score">
          <span className="score__label">Played</span>
          <span className="score__value">{stats.played}</span>
        </div>
        <div className="score">
          <span className="score__label">Wins</span>
          <span className="score__value">{stats.wins}</span>
        </div>
        <div className="score">
          <span className="score__label">Streak</span>
          <span className="score__value">{stats.streak}</span>
        </div>
        <div className="score">
          <span className="score__label">Best</span>
          <span className="score__value">{stats.best}</span>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__instructions">Type on your keyboard or tap the on-screen keys. You get six shots!</div>
        <div className="footer__attribution">
          <div>
            <a className="footer__link" href="https://github.com/adilio/qwizzle" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </div>
          <div>
            Made with 💜 in 🇨🇦 by
            {" "}
            <a className="footer__link" href="https://github.com/adilio" target="_blank" rel="noopener noreferrer">
              Adil Leghari
            </a>
          </div>
        </div>
      </footer>

      <Modal open={showHelp} title="How to play" onClose={closeHelp}>
        <p>Welcome to Qwizzle! Crack the word or cybersecurity acronym hiding behind today&rsquo;s clue.</p>
        <ul className="instruction-list">
          <li>🟩 <strong>Green</strong> — right letter, right spot.</li>
          <li>🟨 <strong>Yellow</strong> — it&rsquo;s in the word, just move it.</li>
          <li>⬛ <strong>Shaded</strong> — that letter isn&rsquo;t part of the answer.</li>
          <li>Type on your keyboard or tap the on-screen keys. You get six shots!</li>
          <li>Play <strong>Daily</strong> for the shared challenge or <strong>Random</strong> to keep practicing.</li>
        </ul>
      </Modal>

      <Modal open={showStats} title="Statistics" onClose={() => setShowStats(false)}>
        <div className="stats-grid">
          <div>
            <strong>Played:</strong> {stats.played}
          </div>
          <div>
            <strong>Wins:</strong> {stats.wins}
          </div>
          <div>
            <strong>Win %:</strong> {stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}
          </div>
          <div>
            <strong>Current streak:</strong> {stats.streak}
          </div>
          <div>
            <strong>Best streak:</strong> {stats.best}
          </div>
          <div>
            <strong>Score:</strong> {stats.score}
          </div>
        </div>
      </Modal>

      <Modal
        open={showResult && !!result}
        title={result?.outcome === "win" ? "Nice work!" : "Good effort!"}
        onClose={() => setShowResult(false)}
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={handleShare}>
              Share
            </button>
            <button type="button" className="btn btn--accent" onClick={handlePlayAgain}>
              Play again
            </button>
          </>
        }
        statusMessage={shareStatus?.message ?? null}
        statusTone={shareStatus?.tone ?? undefined}
      >
        <p>
          <strong>Acronym:</strong> {solution?.word ?? ""}
        </p>
        {solution?.expansion ? (
          <p>
            <strong>Expansion:</strong> {solution.expansion}
          </p>
        ) : null}
        {solution?.definition ? (
          <p>
            <strong>Definition:</strong> {solution.definition}
          </p>
        ) : null}
        <p>
          <strong>Outcome:</strong> {result?.outcome === "win" ? `Solved in ${result.guessesUsed}/${result.maxGuesses}` : "Come back tomorrow!"}
        </p>
      </Modal>
    </div>
  );
}
