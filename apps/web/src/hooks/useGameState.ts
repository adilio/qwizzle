import { computeFeedback, newGame, submitGuess } from "../engine";
import type { GameState, LetterFeedback, LetterMark } from "../engine";
import { acronyms, words } from "../wordlists";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, WordItem, WordProvider } from "@qwizzle/providers";
import { dailySeed } from "../utils/dailySeed";
import { getItem, setItem } from "../utils/storage";

const KEY_PRIORITY: Record<LetterMark, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

const DEFAULT_STATS: GameStats = {
  played: 0,
  wins: 0,
  streak: 0,
  best: 0,
  score: 0,
};

export interface GameStats {
  played: number;
  wins: number;
  streak: number;
  best: number;
  score: number;
}

export type PuzzleMode = "daily" | "random";

interface RawWordItem {
  word: string;
  clue?: string;
  expansion?: string;
  definition?: string;
}

const RAW_DATASETS: Record<Category, RawWordItem[]> = {
  acronym: acronyms as RawWordItem[],
  vocab: words as RawWordItem[],
};

function normaliseWordItem(item: RawWordItem): WordItem {
  return {
    word: String(item.word ?? "").toUpperCase(),
    clue: item.clue,
    definition: item.definition ?? item.clue,
    expansion: item.expansion,
  };
}

function getDataset(category: Category): WordItem[] {
  return RAW_DATASETS[category].map(normaliseWordItem);
}

function calculateScoreIncrement(
  guessesUsed: number,
  maxGuesses: number,
  wordLength: number,
  didWin: boolean,
): number {
  if (!didWin) {
    return 0;
  }
  const efficiency = Math.max(0, maxGuesses - guessesUsed + 1);
  return efficiency * wordLength;
}

export interface GameResult {
  outcome: "win" | "lose";
  guessesUsed: number;
  maxGuesses: number;
  solution: WordItem;
  feedbackRows: LetterFeedback[][];
}

interface UseGameStateOptions {
  provider: WordProvider;
  category: Category;
  mode: PuzzleMode;
}

export interface UseGameStateResult {
  rows: string[];
  cursor: number;
  feedbackRows: LetterFeedback[][];
  keyState: Record<string, LetterMark | undefined>;
  message: string;
  messageTone: "neutral" | "success" | "error";
  definition?: string;
  expansion?: string;
  loading: boolean;
  error: string | null;
  animatingRow: number | null;
  invalidRow: number | null;
  targetLength: number;
  gameOver: boolean;
  stats: GameStats;
  result: GameResult | null;
  solution: WordItem | null;
  onChar: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => Promise<void>;
  reset: () => void;
  clearMessage: () => void;
}

export function useGameState({ provider, category, mode }: UseGameStateOptions): UseGameStateResult {
  const [rows, setRows] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [feedbackRows, setFeedbackRows] = useState<LetterFeedback[][]>([]);
  const [keyState, setKeyState] = useState<Record<string, LetterMark | undefined>>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [definition, setDefinition] = useState<string | undefined>();
  const [expansion, setExpansion] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatingRow, setAnimatingRow] = useState<number | null>(null);
  const [invalidRow, setInvalidRow] = useState<number | null>(null);
  const [targetLength, setTargetLength] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [stats, setStats] = useState<GameStats>(() => getItem("qwizzle:stats", DEFAULT_STATS));
  const [result, setResult] = useState<GameResult | null>(null);
  const [solution, setSolution] = useState<WordItem | null>(null);

  const gameRef = useRef<GameState | null>(null);

  const selectPuzzle = useCallback((): WordItem => {
    const dataset = getDataset(category);
    if (dataset.length === 0) {
      throw new Error("EMPTY_WORD_LIST");
    }

    if (mode === "daily") {
      const index = dailySeed(category, dataset.length);
      return dataset[index];
    }

    const randomIndex = Math.floor(Math.random() * dataset.length);
    return dataset[randomIndex];
  }, [category, mode]);

  const updateStats = useCallback((didWin: boolean) => {
    const game = gameRef.current;
    if (!game) {
      return;
    }
    const guessesUsed = game.guesses.length;
    setStats((prev) => {
      const next: GameStats = {
        played: prev.played + 1,
        wins: prev.wins + (didWin ? 1 : 0),
        streak: didWin ? prev.streak + 1 : 0,
        best: didWin ? Math.max(prev.best, prev.streak + 1) : prev.best,
        score: prev.score + calculateScoreIncrement(guessesUsed, game.maxGuesses, game.target.length, didWin),
      };
      setItem("qwizzle:stats", next);
      return next;
    });
  }, []);

  const initialise = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const item = selectPuzzle();
      const game = newGame(item.word, 6);
      gameRef.current = game;
      setSolution(item);
      setRows(Array(game.maxGuesses).fill(""));
      setCursor(0);
      setTargetLength(item.word.length);
      setFeedbackRows([]);
      setKeyState({});
      setMessage("");
      setMessageTone("neutral");
      setDefinition(item.definition);
      setExpansion(item.expansion);
      setAnimatingRow(null);
      setInvalidRow(null);
      setGameOver(false);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selectPuzzle]);

  useEffect(() => {
    void initialise();
  }, [initialise, provider]);

  const onChar = useCallback(
    (letter: string) => {
      if (gameOver) {
        return;
      }
      setRows((prev) => {
        const next = [...prev];
        const current = next[cursor] ?? "";
        if (current.length >= targetLength) {
          return prev;
        }
        next[cursor] = current + letter;
        return next;
      });
    },
    [cursor, gameOver, targetLength],
  );

  const onBackspace = useCallback(() => {
    if (gameOver) {
      return;
    }
    setRows((prev) => {
      const next = [...prev];
      const current = next[cursor] ?? "";
      if (!current) {
        return prev;
      }
      next[cursor] = current.slice(0, -1);
      return next;
    });
  }, [cursor, gameOver]);

  const onEnter = useCallback(async () => {
    const game = gameRef.current;
    if (!game || gameOver) {
      return;
    }

    const guess = rows[cursor] ?? "";
    if (guess.length !== targetLength) {
      setMessage("Not enough letters");
      setMessageTone("error");
      setInvalidRow(cursor);
      setTimeout(() => setInvalidRow(null), 500);
      return;
    }

    const valid = await provider.isValidGuess(guess, category);
    if (!valid) {
      setMessage("Not in list");
      setMessageTone("error");
      setInvalidRow(cursor);
      setTimeout(() => setInvalidRow(null), 500);
      return;
    }

    const shadow: GameState = {
      ...game,
      guesses: [...game.guesses],
    };

    const resultFromGuess = submitGuess(shadow, guess);
    const feedback = computeFeedback(guess, game.target);
    const updatedFeedbackRows = [...feedbackRows, feedback];
    gameRef.current = shadow;

    setFeedbackRows(updatedFeedbackRows);
    setKeyState((prev) => {
      const next = { ...prev } as Record<string, LetterMark | undefined>;
      feedback.forEach((cell) => {
        const existing = next[cell.letter];
        if (!existing || KEY_PRIORITY[cell.mark] > KEY_PRIORITY[existing]) {
          next[cell.letter] = cell.mark;
        }
      });
      return next;
    });

    setAnimatingRow(cursor);
    setTimeout(() => setAnimatingRow(null), 600 + 120 * targetLength);

    setCursor((prev) => Math.min(prev + 1, shadow.maxGuesses - 1));

    const guessesUsed = shadow.guesses.length;
    const didWin = resultFromGuess.isWin;
    const completed = didWin || guessesUsed >= shadow.maxGuesses;

    if (didWin) {
      setMessage("Nice!");
      setMessageTone("success");
    } else if (completed) {
      setMessage(`Answer: ${shadow.target}`);
      setMessageTone("error");
    } else {
      setMessage("");
      setMessageTone("neutral");
    }

    if (completed) {
      setGameOver(true);
      updateStats(didWin);
      if (solution) {
        setResult({
          outcome: didWin ? "win" : "lose",
          guessesUsed,
          maxGuesses: shadow.maxGuesses,
          solution,
          feedbackRows: updatedFeedbackRows,
        });
      }
    }
  }, [category, cursor, feedbackRows, gameOver, provider, rows, solution, targetLength, updateStats]);

  const reset = useCallback(() => {
    void initialise();
  }, [initialise]);

  const clearMessage = useCallback(() => {
    setMessage("");
    setMessageTone("neutral");
  }, []);

  return {
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
    gameOver,
    stats,
    result,
    solution,
    onChar,
    onBackspace,
    onEnter,
    reset,
    clearMessage,
  };
}
