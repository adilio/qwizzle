import type { LetterFeedback } from "./types.js";

const EMOJI = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
} as const;

export function shareGrid(rows: LetterFeedback[][]): string {
  return rows
    .map((row) => row.map((cell) => EMOJI[cell.mark]).join(""))
    .join("\n");
}

export function shareText(
  mode: "acronym" | "vocab",
  rows: LetterFeedback[][],
  solvedIn?: number,
  url?: string,
): string {
  const headline = `Qwizzle ${mode} ${typeof solvedIn === "number" ? `${solvedIn}/6` : "X/6"}`;
  const body = shareGrid(rows);
  const suffix = url ? `\n${url}` : "";
  return `${headline}\n${body}${suffix}`;
}
