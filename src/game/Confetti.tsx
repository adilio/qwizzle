import { useEffect, useState } from "react";

interface Piece {
  left: string;
  dx: string;
  rot: string;
  dur: string;
  delay: string;
  color: string;
}

function readVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return value.trim() || fallback;
}

/** Bump `burst` to launch a shower; respects prefers-reduced-motion. */
export function Confetti({ burst }: { burst: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (burst === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = [
      readVar("--accent", "#7c5cff"),
      readVar("--t-correct", "#22c55e"),
      readVar("--t-present", "#eab308"),
      readVar("--fg", "#eeeaff"),
    ];
    setPieces(
      Array.from({ length: 140 }, () => ({
        left: `${Math.random() * 100}%`,
        dx: `${(Math.random() - 0.5) * 40}vw`,
        rot: `${Math.random() * 720 - 360}deg`,
        dur: `${1.2 + Math.random() * 0.6}s`,
        delay: `${Math.random() * 0.2}s`,
        color: colors[Math.floor(Math.random() * colors.length)],
      })),
    );
    const timeout = window.setTimeout(() => setPieces([]), 2000);
    return () => window.clearTimeout(timeout);
  }, [burst]);

  return (
    <div id="confetti" aria-hidden="true">
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            ["--dx" as string]: piece.dx,
            ["--rot" as string]: piece.rot,
            ["--dur" as string]: piece.dur,
            ["--delay" as string]: piece.delay,
          }}
        />
      ))}
    </div>
  );
}
