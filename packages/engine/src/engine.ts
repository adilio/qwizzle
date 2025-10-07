import type { GameState, GuessResult, LetterFeedback } from "./types.js";

export function newGame(target: string, maxGuesses = 6): GameState {
  if (!target) {
    throw new Error("TARGET_REQUIRED");
  }
  return {
    target: target.toUpperCase(),
    guesses: [],
    maxGuesses,
  };
}

export function computeFeedback(guess: string, target: string): LetterFeedback[] {
  const upperGuess = guess.toUpperCase();
  const upperTarget = target.toUpperCase();
  const letters = upperGuess.split("");
  const pool = upperTarget.split("");

  const feedback: LetterFeedback[] = letters.map((letter) => ({
    letter,
    mark: "absent",
  }));

  // First pass: mark exact matches.
  feedback.forEach((cell, index) => {
    if (cell.letter === pool[index]) {
      cell.mark = "correct";
      pool[index] = "*";
    }
  });

  // Second pass: mark present letters.
  feedback.forEach((cell) => {
    if (cell.mark === "correct") {
      return;
    }
    const poolIndex = pool.indexOf(cell.letter);
    if (poolIndex !== -1) {
      cell.mark = "present";
      pool[poolIndex] = "*";
    }
  });

  return feedback;
}

export function submitGuess(state: GameState, guess: string): GuessResult {
  const normalisedGuess = guess.toUpperCase();
  if (normalisedGuess.length !== state.target.length) {
    throw new Error("WRONG_LENGTH");
  }

  const feedback = computeFeedback(normalisedGuess, state.target);
  state.guesses.push(normalisedGuess);

  return {
    feedback,
    isWin: normalisedGuess === state.target,
  };
}
