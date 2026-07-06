import { computeFeedback } from "./feedback";
import { dailyIndex, randomIndex, utcDateKey } from "./daily";
import type { GameMode, GameState, WordEntry } from "./types";
import { MAX_ATTEMPTS } from "./types";

export interface NewGameOptions {
  wordlistId: string;
  entries: WordEntry[];
  mode: GameMode;
  date?: Date;
  rng?: () => number;
  /** Play this exact puzzle (challenge links); ignored when out of range. */
  forcedIndex?: number;
}

export function newGame(options: NewGameOptions): GameState {
  const { wordlistId, entries, mode, date, rng, forcedIndex } = options;
  const index =
    forcedIndex !== undefined && forcedIndex >= 0 && forcedIndex < entries.length
      ? Math.floor(forcedIndex)
      : mode === "daily"
        ? dailyIndex(wordlistId, entries.length, date)
        : randomIndex(entries.length, rng);
  return {
    wordlistId,
    mode,
    index,
    dateKey: mode === "daily" ? utcDateKey(date) : null,
    word: entries[index].word,
    guesses: [],
    results: [],
    maxAttempts: MAX_ATTEMPTS,
    status: "playing",
    hinted: false,
  };
}

export type GuessRejection =
  | "game-over"
  | "wrong-length"
  | "invalid-chars";

export type SubmitResult =
  | { ok: true; state: GameState }
  | { ok: false; error: GuessRejection };

export function isValidGuess(guess: string, length: number): boolean {
  return guess.length === length && /^[A-Z0-9]+$/.test(guess);
}

/** Pure: returns a new state (or a rejection) — never mutates the input. */
export function submitGuess(state: GameState, rawGuess: string): SubmitResult {
  if (state.status !== "playing") return { ok: false, error: "game-over" };
  const guess = rawGuess.toUpperCase();
  if (guess.length !== state.word.length) return { ok: false, error: "wrong-length" };
  if (!isValidGuess(guess, state.word.length)) return { ok: false, error: "invalid-chars" };

  const feedback = computeFeedback(state.word, guess);
  const guesses = [...state.guesses, guess];
  const results = [...state.results, feedback];
  const won = feedback.every((tile) => tile === "correct");
  const lost = !won && guesses.length >= state.maxAttempts;

  return {
    ok: true,
    state: {
      ...state,
      guesses,
      results,
      status: won ? "won" : lost ? "lost" : "playing",
    },
  };
}
