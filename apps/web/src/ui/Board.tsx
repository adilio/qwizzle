import type { LetterFeedback } from "../engine";
import { forwardRef } from "react";

interface BoardProps {
  rows: string[];
  feedbackRows: LetterFeedback[][];
  cursor: number;
  targetLength: number;
  animatingRow: number | null;
  invalidRow: number | null;
}

export const Board = forwardRef<HTMLDivElement, BoardProps>(function Board(
  { rows, feedbackRows, cursor, targetLength, animatingRow, invalidRow },
  ref,
) {
  return (
    <section className="grid" role="grid" aria-label="Guess grid">
      {rows.map((row, rowIndex) => {
        const feedback = feedbackRows[rowIndex];
        const letters = row.split("");
        const isCurrentRow = rowIndex === cursor;
        const isAnimating = animatingRow === rowIndex;
        const isInvalid = invalidRow === rowIndex;

        const rowClass = ["grid__row"];
        if (isCurrentRow) {
          rowClass.push("active");
        }
        if (isAnimating) {
          rowClass.push("grid__row--animating");
        }
        if (isInvalid) {
          rowClass.push("grid__row--invalid");
        }

        return (
          <div
            key={rowIndex}
            className={rowClass.join(" ")}
            role="row"
            style={{ ["--cols" as const]: targetLength }}
          >
            {Array.from({ length: targetLength }).map((_, cellIndex) => {
              const letter = letters[cellIndex] ?? "";
              const cell = feedback?.[cellIndex];
              const mark = cell?.mark;

              const tileClass = ["t"];
              if (mark === "correct") {
                tileClass.push("t--correct");
              } else if (mark === "present") {
                tileClass.push("t--present");
              } else if (mark === "absent" && feedback) {
                tileClass.push("t--absent");
              }

              return (
                <div
                  key={cellIndex}
                  role="gridcell"
                  aria-label={cell ? `${cell.letter}, ${cell.mark}` : letter || "blank"}
                  className={tileClass.join(" ")}
                  ref={isCurrentRow && cellIndex === 0 ? ref : undefined}
                >
                  <span>{cell ? cell.letter : letter}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
});
