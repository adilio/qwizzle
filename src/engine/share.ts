import type { GameState, TileState } from "./types";
import type { Stats } from "./stats";
import { winPercent } from "./stats";

const TILE_EMOJI: Record<TileState, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
};

export function shareGrid(results: TileState[][]): string {
  return results.map((row) => row.map((state) => TILE_EMOJI[state]).join("")).join("\n");
}

export interface ShareTextOptions {
  /** Full title, e.g. `Qwizzle` or `Qwizzle: Cyber Edition`. */
  title: string;
  state: GameState;
  stats: Stats;
  url: string;
}

export function shareText({ title, state, stats, url }: ShareTextOptions): string {
  if (state.status === "playing") return "";
  const attempts = state.guesses.length;
  const won = state.status === "won";
  const label = state.mode === "daily" && state.dateKey ? state.dateKey : `#${state.index + 1}`;
  const hintSuffix = state.hinted && won ? " • Hint used" : "";
  const lines = [
    `${title} ${label} ${won ? attempts : "X"}/${state.maxAttempts}${hintSuffix}`,
    won
      ? `Solved in ${attempts} ${attempts === 1 ? "try" : "tries"}`
      : `Missed it — answer: ${state.word}`,
    `Score ${stats.score} • Win ${winPercent(stats)}% • Streak ${stats.streak}`,
    shareGrid(state.results),
    "",
    `Your turn! Play at: ${url}`,
  ];
  return lines.join("\n");
}
