import type { GameState } from "./types";

/** Points for solving on attempt 1..6; a used hint costs 20. */
export const SCORE_TABLE = [100, 80, 60, 40, 20, 10];
export const HINT_PENALTY = 20;

export interface Stats {
  version: 1;
  played: number;
  won: number;
  streak: number;
  best: number;
  score: number;
  /** `${wordlistId}-${dateKey}` of the last counted daily, to dedupe replays. */
  lastDailyKey: string | null;
}

export function createInitialStats(): Stats {
  return { version: 1, played: 0, won: 0, streak: 0, best: 0, score: 0, lastDailyKey: null };
}

export function scoreFor(attempt: number): number {
  return SCORE_TABLE[attempt - 1] ?? 0;
}

function dailyKey(state: GameState): string | null {
  return state.mode === "daily" && state.dateKey
    ? `${state.wordlistId}-${state.dateKey}`
    : null;
}

export function applyWin(stats: Stats, state: GameState): Stats {
  const key = dailyKey(state);
  if (key && stats.lastDailyKey === key) return { ...stats };
  const attempts = state.guesses.length;
  const gained = Math.max(0, scoreFor(attempts) - (state.hinted ? HINT_PENALTY : 0));
  return {
    version: 1,
    played: stats.played + 1,
    won: stats.won + 1,
    streak: stats.streak + 1,
    best: Math.max(stats.best, stats.streak + 1),
    score: stats.score + gained,
    lastDailyKey: key ?? stats.lastDailyKey,
  };
}

export function applyLoss(stats: Stats, state: GameState): Stats {
  const key = dailyKey(state);
  if (key && stats.lastDailyKey === key) return { ...stats };
  return {
    version: 1,
    played: stats.played + 1,
    won: stats.won,
    streak: 0,
    best: stats.best,
    score: stats.score,
    lastDailyKey: key ?? stats.lastDailyKey,
  };
}

export function winPercent(stats: Stats): number {
  return stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);
}
