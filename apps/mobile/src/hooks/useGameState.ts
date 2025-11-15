/**
 * Game State Hook for Mobile
 * Shared game logic using @qwizzle/engine
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { computeFeedback, newGame, submitGuess, type GameState, type LetterFeedback, type LetterMark } from "@qwizzle/engine";
import { acronyms } from "@qwizzle/wordlists/acronyms.json";

interface WordItem {
  word: string;
  expansion?: string;
  definition?: string;
}

interface GameStats {
  played: number;
  wins: number;
  streak: number;
  best: number;
  score: number;
}

const DEFAULT_STATS: GameStats = {
  played: 0,
  wins: 0,
  streak: 0,
  best: 0,
  score: 0,
};

const KEY_PRIORITY: Record<LetterMark, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

export function useGameState() {
  const [rows, setRows] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [feedbackRows, setFeedbackRows] = useState<LetterFeedback[][]>([]);
  const [keyState, setKeyState] = useState<Record<string, LetterMark | undefined>>({});
  const [message, setMessage] = useState("");
  const [definition, setDefinition] = useState<string | undefined>();
  const [expansion, setExpansion] = useState<string | undefined>();
  const [invalidRow, setInvalidRow] = useState<number | null>(null);
  const [targetLength, setTargetLength] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);

  const gameRef = useRef<GameState | null>(null);
  const wordsRef = useRef<WordItem[]>([]);

  const normalizeWord = (raw: unknown): WordItem => {
    const item = raw as { word: string; expansion?: string; definition?: string };
    return {
      word: item.word.toUpperCase(),
      expansion: item.expansion,
      definition: item.definition,
    };
  };

  const initialize = useCallback(() => {
    // Load word list
    wordsRef.current = (acronyms as unknown[]).map(normalizeWord);

    // Select random word
    const randomIndex = Math.floor(Math.random() * wordsRef.current.length);
    const selectedWord = wordsRef.current[randomIndex];

    // Initialize game
    const game = newGame(selectedWord.word, 6);
    gameRef.current = game;

    setRows(Array(game.maxGuesses).fill(""));
    setCursor(0);
    setTargetLength(selectedWord.word.length);
    setFeedbackRows([]);
    setKeyState({});
    setMessage("");
    setDefinition(selectedWord.definition);
    setExpansion(selectedWord.expansion);
    setInvalidRow(null);
    setGameOver(false);
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

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

  const onEnter = useCallback(() => {
    const game = gameRef.current;
    if (!game || gameOver) {
      return;
    }

    const guess = rows[cursor] ?? "";
    if (guess.length !== targetLength) {
      setMessage("Not enough letters");
      setInvalidRow(cursor);
      setTimeout(() => {
        setInvalidRow(null);
        setMessage("");
      }, 500);
      return;
    }

    // Validate guess
    const upperGuess = guess.toUpperCase();
    const isValid = wordsRef.current.some((item) => item.word === upperGuess);

    if (!isValid) {
      setMessage("Not in list");
      setInvalidRow(cursor);
      setTimeout(() => {
        setInvalidRow(null);
        setMessage("");
      }, 500);
      return;
    }

    // Submit guess
    const shadow: GameState = {
      ...game,
      guesses: [...game.guesses],
    };

    const result = submitGuess(shadow, guess);
    const feedback = computeFeedback(guess, game.target);
    const updatedFeedbackRows = [...feedbackRows, feedback];

    gameRef.current = shadow;
    setFeedbackRows(updatedFeedbackRows);

    // Update key state
    setKeyState((prev) => {
      const next = { ...prev };
      feedback.forEach((cell) => {
        const existing = next[cell.letter];
        if (!existing || KEY_PRIORITY[cell.mark] > KEY_PRIORITY[existing]) {
          next[cell.letter] = cell.mark;
        }
      });
      return next;
    });

    setCursor((prev) => Math.min(prev + 1, shadow.maxGuesses - 1));

    const guessesUsed = shadow.guesses.length;
    const didWin = result.isWin;
    const completed = didWin || guessesUsed >= shadow.maxGuesses;

    if (didWin) {
      setMessage("Nice!");
    } else if (completed) {
      setMessage(`Answer: ${shadow.target}`);
    } else {
      setMessage("");
    }

    if (completed) {
      setGameOver(true);
      setStats((prev) => ({
        played: prev.played + 1,
        wins: prev.wins + (didWin ? 1 : 0),
        streak: didWin ? prev.streak + 1 : 0,
        best: didWin ? Math.max(prev.best, prev.streak + 1) : prev.best,
        score: prev.score + (didWin ? (shadow.maxGuesses - guessesUsed + 1) * shadow.target.length : 0),
      }));
    }
  }, [cursor, feedbackRows, gameOver, rows, targetLength]);

  const reset = useCallback(() => {
    initialize();
  }, [initialize]);

  return {
    rows,
    cursor,
    feedbackRows,
    keyState,
    message,
    definition,
    expansion,
    invalidRow,
    targetLength,
    gameOver,
    stats,
    onChar,
    onBackspace,
    onEnter,
    reset,
  };
}
