import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyLoss,
  applyWin,
  createInitialStats,
  hardModeViolation,
  keyboardStates,
  newGame,
  submitGuess,
} from "../engine";
import type { GameMode, GameState, Stats, WordEntry } from "../engine";
import type { Wordlist } from "../providers/types";
import { loadJson, saveJson } from "../lib/storage";
import { restoreGame, toStored } from "./persistence";

const KEYS = {
  game: "qwizzle:game",
  stats: "qwizzle:stats",
  mode: "qwizzle:mode",
  hard: "qwizzle:hardmode",
};

export interface Message {
  text: string;
  tone: "info" | "error" | "success";
}

function loadStats(): Stats {
  const raw = loadJson<Stats>(KEYS.stats);
  if (!raw || raw.version !== 1) return createInitialStats();
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
  return {
    version: 1,
    played: n(raw.played),
    won: n(raw.won),
    streak: n(raw.streak),
    best: n(raw.best),
    score: n(raw.score),
    lastDailyKey: typeof raw.lastDailyKey === "string" ? raw.lastDailyKey : null,
  };
}

function loadMode(): GameMode {
  return loadJson<string>(KEYS.mode) === "random" ? "random" : "daily";
}

function initGame(wordlist: Wordlist, challengeIndex?: number): GameState {
  if (
    challengeIndex !== undefined &&
    challengeIndex >= 0 &&
    challengeIndex < wordlist.entries.length
  ) {
    return newGame({
      wordlistId: wordlist.id,
      entries: wordlist.entries,
      mode: "random",
      forcedIndex: challengeIndex,
    });
  }
  return (
    restoreGame(loadJson(KEYS.game), wordlist) ??
    newGame({ wordlistId: wordlist.id, entries: wordlist.entries, mode: loadMode() })
  );
}

export function useGame(wordlist: Wordlist, challengeIndex?: number) {
  const [state, setState] = useState<GameState>(() => initGame(wordlist, challengeIndex));
  const [hardMode, setHardModeState] = useState<boolean>(() => loadJson<boolean>(KEYS.hard) === true);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [justEnded, setJustEnded] = useState<"won" | "lost" | null>(null);
  const wordlistRef = useRef(wordlist.id);

  // Re-key the session when the active wordlist changes. A pending challenge
  // index applies once (a shared edition's list arrives async after boot).
  const challengeRef = useRef(challengeIndex);
  useEffect(() => {
    if (wordlistRef.current === wordlist.id) return;
    wordlistRef.current = wordlist.id;
    setState(initGame(wordlist, challengeRef.current));
    challengeRef.current = undefined;
    setCurrentGuess("");
    setMessage(null);
    setJustEnded(null);
  }, [wordlist]);

  const setHardMode = useCallback((on: boolean) => {
    setHardModeState(on);
    saveJson(KEYS.hard, on);
  }, []);

  useEffect(() => {
    saveJson(KEYS.game, toStored(state));
  }, [state]);

  useEffect(() => {
    saveJson(KEYS.stats, stats);
  }, [stats]);

  const entry: WordEntry = useMemo(() => {
    const candidate = wordlist.entries[state.index];
    return candidate?.word === state.word
      ? candidate
      : (wordlist.entries.find((e) => e.word === state.word) ?? { word: state.word });
  }, [wordlist, state.index, state.word]);

  const keyStates = useMemo(
    () => keyboardStates(state.guesses, state.results),
    [state.guesses, state.results],
  );

  const start = useCallback(
    (mode: GameMode) => {
      saveJson(KEYS.mode, mode);
      setState(newGame({ wordlistId: wordlist.id, entries: wordlist.entries, mode }));
      setCurrentGuess("");
      setMessage(null);
      setJustEnded(null);
    },
    [wordlist],
  );

  const type = useCallback(
    (letter: string) => {
      if (state.status !== "playing") return;
      setCurrentGuess((g) => (g.length >= state.word.length ? g : g + letter.toUpperCase()));
    },
    [state.status, state.word.length],
  );

  const backspace = useCallback(() => {
    if (state.status !== "playing") return;
    setCurrentGuess((g) => g.slice(0, -1));
  }, [state.status]);

  const submit = useCallback(() => {
    if (state.status !== "playing") {
      setJustEnded(state.status === "won" ? "won" : "lost");
      return;
    }
    if (hardMode && currentGuess.length === state.word.length) {
      const violation = hardModeViolation(state, currentGuess);
      if (violation) {
        setMessage({ text: `Hard mode: ${violation}`, tone: "error" });
        return;
      }
    }
    const result = submitGuess(state, currentGuess);
    if (!result.ok) {
      if (result.error === "wrong-length") setMessage({ text: "Not enough letters", tone: "error" });
      else if (result.error === "invalid-chars")
        setMessage({ text: "Letters and numbers only (A–Z, 0–9).", tone: "error" });
      return;
    }
    const next = result.state;
    setState(next);
    setCurrentGuess("");
    if (next.status === "won") {
      const attempts = next.guesses.length;
      setStats((s) => applyWin(s, next));
      setMessage({
        text: `Solved in ${attempts} ${attempts === 1 ? "try" : "tries"}!`,
        tone: "success",
      });
      setJustEnded("won");
    } else if (next.status === "lost") {
      setStats((s) => applyLoss(s, next));
      setMessage({ text: `Out of tries! The word was ${next.word}.`, tone: "error" });
      setJustEnded("lost");
    } else {
      setMessage(null);
    }
  }, [state, currentGuess, hardMode]);

  const hint = useCallback(() => {
    if (state.status !== "playing") return;
    setState((s) => ({ ...s, hinted: true }));
    setMessage({
      text: `First letter: ${state.word[0]} • Length: ${state.word.length}`,
      tone: "info",
    });
  }, [state.status, state.word]);

  const clearJustEnded = useCallback(() => setJustEnded(null), []);

  /** Adopt stats from another source (cloud sync). */
  const replaceStats = useCallback((next: Stats) => setStats(next), []);

  return {
    replaceStats,
    state,
    entry,
    currentGuess,
    message,
    stats,
    keyStates,
    start,
    type,
    backspace,
    submit,
    hint,
    hardMode,
    setHardMode,
    justEnded,
    clearJustEnded,
  };
}
