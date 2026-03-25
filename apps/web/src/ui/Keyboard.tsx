import type { LetterMark } from "../engine";

const KEY_ROWS: Array<Array<string>> = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

interface KeyboardProps {
  keyState: Record<string, LetterMark | undefined>;
  onChar: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

export function Keyboard({ keyState, onChar, onEnter, onBackspace }: KeyboardProps) {
  function handleKey(key: string) {
    if (key === "ENTER") {
      onEnter();
    } else if (key === "⌫") {
      onBackspace();
    } else {
      onChar(key);
    }
  }

  return (
    <section className="keyboard" aria-label="On-screen keyboard">
      {KEY_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard__row">
          {row.map((key) => {
            const state = key.length === 1 ? keyState[key] : undefined;
            const classNames = ["key"];
            if (key === "ENTER" || key === "⌫") {
              classNames.push("key--wide");
            }

            return (
              <button
                key={key}
                type="button"
                className={classNames.join(" ")}
                data-state={state ?? undefined}
                onClick={() => handleKey(key)}
              >
                {key === "ENTER" ? "Enter" : key === "⌫" ? "⌫" : key}
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}
