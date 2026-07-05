import type { TileState } from "./types";

/**
 * Wordle-style feedback with correct duplicate handling: exact matches are
 * claimed first, then remaining target letters satisfy "present" marks
 * left-to-right. Ported from cyberdle's evaluateGuess and locked by tests.
 */
export function computeFeedback(target: string, guess: string): TileState[] {
  const t = [...target];
  const g = [...guess];
  const result: TileState[] = Array(t.length).fill("absent");
  const remaining: Record<string, number> = {};

  for (let i = 0; i < t.length; i += 1) {
    if (g[i] === t[i]) {
      result[i] = "correct";
    } else {
      remaining[t[i]] = (remaining[t[i]] ?? 0) + 1;
    }
  }

  for (let i = 0; i < t.length; i += 1) {
    if (result[i] === "correct") continue;
    const char = g[i];
    if (remaining[char]) {
      result[i] = "present";
      remaining[char] -= 1;
    }
  }

  return result;
}

/** Per-key coloring for the on-screen keyboard; best state wins. */
export function keyboardStates(
  guesses: string[],
  results: TileState[][],
): Map<string, TileState> {
  const priority: Record<TileState, number> = { correct: 3, present: 2, absent: 1 };
  const states = new Map<string, TileState>();
  results.forEach((row, rowIndex) => {
    const guess = guesses[rowIndex];
    if (!guess) return;
    row.forEach((state, i) => {
      const letter = guess[i];
      const previous = states.get(letter);
      if (!previous || priority[state] > priority[previous]) {
        states.set(letter, state);
      }
    });
  });
  return states;
}
