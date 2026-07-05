export type TileState = "correct" | "present" | "absent";

export type GameMode = "daily" | "random";

export interface WordEntry {
  word: string;
  definition?: string;
  expansion?: string;
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  /** Identifies the wordlist this puzzle was drawn from. */
  wordlistId: string;
  mode: GameMode;
  /** Index of the answer within the wordlist. */
  index: number;
  /** For daily games, the UTC date key (YYYY-MM-DD) the puzzle belongs to. */
  dateKey: string | null;
  word: string;
  guesses: string[];
  results: TileState[][];
  maxAttempts: number;
  status: GameStatus;
  hinted: boolean;
}

export const MAX_ATTEMPTS = 6;
