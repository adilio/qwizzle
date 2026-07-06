import type { GameState } from "./types";

/**
 * Wordle-style hard mode: every revealed hint must be reused. Green letters
 * must stay in place; yellow letters must appear somewhere in the guess.
 * Returns a human-readable violation, or null when the guess is allowed.
 */
export function hardModeViolation(state: GameState, rawGuess: string): string | null {
  const guess = rawGuess.toUpperCase();
  for (let row = 0; row < state.results.length; row += 1) {
    const previous = state.guesses[row];
    const result = state.results[row];

    for (let i = 0; i < result.length; i += 1) {
      if (result[i] === "correct" && guess[i] !== previous[i]) {
        return `Letter ${i + 1} must be ${previous[i]}`;
      }
    }

    // Every green/yellow letter from this row must appear in the guess,
    // counting duplicates.
    const required: Record<string, number> = {};
    for (let i = 0; i < result.length; i += 1) {
      if (result[i] === "correct" || result[i] === "present") {
        required[previous[i]] = (required[previous[i]] ?? 0) + 1;
      }
    }
    const available: Record<string, number> = {};
    for (const char of guess) {
      available[char] = (available[char] ?? 0) + 1;
    }
    for (const [char, count] of Object.entries(required)) {
      if ((available[char] ?? 0) < count) {
        return `Guess must contain ${char}`;
      }
    }
  }
  return null;
}
