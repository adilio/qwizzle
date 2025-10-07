export type Category = "acronym" | "vocab";

export interface WordItem {
  word: string;
  clue?: string;
  expansion?: string;
  definition?: string;
}

export interface WordProvider {
  getRandomWord(category: Category): Promise<WordItem>;
  isValidGuess(guess: string, category: Category): Promise<boolean>;
}
