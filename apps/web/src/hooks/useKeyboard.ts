import { useEffect } from "react";

type KeyHandler = (letter: string) => void;
type VoidHandler = () => void;

export function useKeyboard(
  onKey: KeyHandler,
  onEnter: VoidHandler,
  onBackspace: VoidHandler,
  deps: unknown[],
) {
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.dataset?.keyboardCapture === "true") {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        onEnter();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        onBackspace();
      } else if (/^[A-Za-z]$/.test(event.key)) {
        onKey(event.key.toUpperCase());
      }
    }

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
