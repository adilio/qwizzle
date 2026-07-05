import type { GameState, TileState } from "../engine";

const STATE_LABEL: Record<TileState, string> = {
  correct: "correct",
  present: "in the word, wrong spot",
  absent: "not in the word",
};

interface BoardProps {
  state: GameState;
  currentGuess: string;
}

export function Board({ state, currentGuess }: BoardProps) {
  const columns = state.word.length;
  const activeRow = state.status === "playing" ? state.guesses.length : -1;

  return (
    <section
      className="grid"
      role="grid"
      aria-label="Guess grid"
      style={{ ["--cols" as string]: String(columns) }}
    >
      {Array.from({ length: state.maxAttempts }, (_, row) => {
        const isActive = row === activeRow;
        const guess = isActive ? currentGuess : (state.guesses[row] ?? "");
        const result = state.results[row];
        return (
          <div
            key={row}
            className={`grid__row${isActive ? " grid__row--active" : ""}`}
            role="row"
          >
            {Array.from({ length: columns }, (_, col) => {
              const letter = guess[col] ?? "";
              const tileState = result?.[col];
              const label = letter
                ? tileState
                  ? `${letter}, ${STATE_LABEL[tileState]}`
                  : letter
                : "empty";
              return (
                <div
                  key={col}
                  className={`t${tileState ? ` t--${tileState}` : ""}`}
                  role="gridcell"
                  aria-label={label}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
