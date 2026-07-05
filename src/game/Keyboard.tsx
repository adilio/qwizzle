import type { TileState } from "../engine";

const LAYOUT = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

interface KeyboardProps {
  keyStates: Map<string, TileState>;
  onKey: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

export function Keyboard({ keyStates, onKey, onEnter, onBackspace }: KeyboardProps) {
  return (
    <section className="keyboard" aria-label="On-screen keyboard">
      {LAYOUT.map((row, i) => (
        <div key={i} className="keyboard__row">
          {row.map((key) => {
            if (key === "ENTER") {
              return (
                <button key={key} type="button" className="key key--wide" onClick={onEnter}>
                  Enter
                </button>
              );
            }
            if (key === "BACK") {
              return (
                <button
                  key={key}
                  type="button"
                  className="key key--wide"
                  aria-label="Backspace"
                  onClick={onBackspace}
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                className="key"
                data-state={keyStates.get(key)}
                onClick={() => onKey(key)}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}
