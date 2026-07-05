import { useState } from "react";
import { Modal } from "./Modal";
import { shareText, winPercent } from "../engine";
import type { GameState, Stats, WordEntry } from "../engine";
import { copyText, shareOrCopy } from "../lib/share";

const WIN_TITLES = [
  "You cracked it!",
  "Quiz whiz!",
  "Mission accomplished!",
  "Wordsmith supreme!",
  "Nailed the signal!",
  "Legendary solve!",
  "Puzzle vanquished!",
  "On a roll!",
];

interface ResultDialogProps {
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  state: GameState;
  entry: WordEntry;
  stats: Stats;
  title: string;
}

export function ResultDialog({
  open,
  onClose,
  onPlayAgain,
  state,
  entry,
  stats,
  title,
}: ResultDialogProps) {
  const [status, setStatus] = useState<{ text: string; tone: "info" | "success" | "error" } | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const won = state.status === "won";
  const attempts = state.guesses.length;
  const heading = won
    ? WIN_TITLES[(state.index + attempts) % WIN_TITLES.length]
    : "Good effort!";

  const buildText = () =>
    shareText({ title, state, stats, url: `${window.location.origin}${window.location.pathname}` });

  async function handleShare() {
    const text = buildText();
    const outcome = await shareOrCopy(text, title);
    if (outcome === "shared") setStatus({ text: "Shared successfully!", tone: "success" });
    else if (outcome === "copied") setStatus({ text: "Result copied to clipboard!", tone: "success" });
    else if (outcome === "cancelled") setStatus({ text: "Share cancelled.", tone: "info" });
    else {
      setFallbackText(text);
      setStatus({ text: "Copy the text below manually.", tone: "info" });
    }
  }

  async function handleCopy() {
    const text = buildText();
    const outcome = await copyText(text);
    if (outcome === "copied") setStatus({ text: "Result copied to clipboard!", tone: "success" });
    else {
      setFallbackText(text);
      setStatus({ text: "Copy the text below manually.", tone: "info" });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={heading}>
      <p>
        {won
          ? `Solved in ${attempts} ${attempts === 1 ? "try" : "tries"}.`
          : `The answer was ${state.word}.`}
      </p>
      {won && state.hinted && <p style={{ fontSize: "0.9em", opacity: 0.8 }}>(Hint used: −20 points)</p>}
      {won && stats.streak > 0 && (
        <p className="result__streak">
          {stats.streak >= 10 ? "🔥" : stats.streak >= 5 ? "⚡" : "⭐"} Streak: {stats.streak}!
          Keep it going!
        </p>
      )}
      <p>
        <strong>Word:</strong> {state.word}
      </p>
      {entry.expansion && (
        <p>
          <strong>Expansion:</strong> {entry.expansion}
        </p>
      )}
      {entry.definition && (
        <p>
          <strong>Definition:</strong> {entry.definition}
        </p>
      )}
      <p style={{ color: "var(--muted)", fontSize: "0.9em" }}>
        Score {stats.score} • Win {winPercent(stats)}% • Streak {stats.streak}
      </p>
      <div className="modal__actions">
        <button type="button" className="btn" onClick={handleShare}>
          Share
        </button>
        <button type="button" className="btn" onClick={handleCopy}>
          Copy
        </button>
        <button type="button" className="btn btn--accent" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
      {fallbackText !== null && (
        <textarea
          readOnly
          rows={5}
          value={fallbackText}
          style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
      {status && (
        <p className="modal__status" data-tone={status.tone} aria-live="polite">
          {status.text}
        </p>
      )}
    </Modal>
  );
}
