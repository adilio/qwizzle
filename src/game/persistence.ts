import { computeFeedback, utcDateKey, MAX_ATTEMPTS } from "../engine";
import type { GameMode, GameState } from "../engine";
import type { Wordlist } from "../providers/types";

export interface StoredGame {
  version: 1;
  wordlistId: string;
  mode: GameMode;
  index: number;
  dateKey: string | null;
  word: string;
  guesses: string[];
  hinted: boolean;
}

export function toStored(state: GameState): StoredGame {
  return {
    version: 1,
    wordlistId: state.wordlistId,
    mode: state.mode,
    index: state.index,
    dateKey: state.dateKey,
    word: state.word,
    guesses: state.guesses,
    hinted: state.hinted,
  };
}

/**
 * Rebuild a game from storage, or return null if it no longer applies:
 * different wordlist, stale daily, or a list edit moved the answer.
 * Feedback rows are recomputed rather than trusted from storage.
 */
export function restoreGame(
  raw: unknown,
  wordlist: Wordlist,
  today: Date = new Date(),
): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const stored = raw as Partial<StoredGame>;
  if (stored.version !== 1) return null;
  if (stored.wordlistId !== wordlist.id) return null;
  if (typeof stored.word !== "string" || !Array.isArray(stored.guesses)) return null;
  if (typeof stored.index !== "number") return null;
  const mode: GameMode = stored.mode === "random" ? "random" : "daily";
  if (mode === "daily" && stored.dateKey !== utcDateKey(today)) return null;
  if (wordlist.entries[stored.index]?.word !== stored.word) return null;

  const guesses = stored.guesses
    .filter((g): g is string => typeof g === "string")
    .slice(0, MAX_ATTEMPTS)
    .map((g) => g.toUpperCase())
    .filter((g) => g.length === stored.word!.length);
  const results = guesses.map((g) => computeFeedback(stored.word!, g));
  const won = results.some((row) => row.every((tile) => tile === "correct"));
  const lost = !won && guesses.length >= MAX_ATTEMPTS;

  return {
    wordlistId: wordlist.id,
    mode,
    index: stored.index,
    dateKey: mode === "daily" ? (stored.dateKey ?? null) : null,
    word: stored.word,
    guesses,
    results,
    maxAttempts: MAX_ATTEMPTS,
    status: won ? "won" : lost ? "lost" : "playing",
    hinted: Boolean(stored.hinted),
  };
}
