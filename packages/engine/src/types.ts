export type LetterMark = "correct" | "present" | "absent";

export interface LetterFeedback {
  letter: string;
  mark: LetterMark;
}

export interface GuessResult {
  feedback: LetterFeedback[];
  isWin: boolean;
}

export interface GameState {
  target: string;
  guesses: string[];
  maxGuesses: number;
}
