/** WCAG contrast math + the Studio's "nudge to legible" fixer. */

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const t = hexToRgb(target);
  return rgbToHex([
    a[0] + (t[0] - a[0]) * amount,
    a[1] + (t[1] - a[1]) * amount,
    a[2] + (t[2] - a[2]) * amount,
  ]);
}

/**
 * Adjust `fg` toward black or white (whichever can reach further) until it
 * meets `target` contrast against `bg`. Returns fg unchanged if it already
 * complies.
 */
export function nudgeToContrast(fg: string, bg: string, target: number): string {
  if (contrastRatio(fg, bg) >= target) return fg;
  const pole = contrastRatio("#ffffff", bg) >= contrastRatio("#000000", bg) ? "#ffffff" : "#000000";
  for (let amount = 0.05; amount <= 1; amount += 0.05) {
    const candidate = mix(fg, pole, amount);
    if (contrastRatio(candidate, bg) >= target) return candidate;
  }
  return pole;
}

export interface ContrastCheck {
  /** Token keys involved, for display. */
  label: string;
  fgKey: string;
  bgKey: string;
  /** WCAG AA: 4.5 for body text, 3 for large/bold text and UI parts. */
  target: number;
}

/**
 * Repair a palette so every check passes. Foregrounds are nudged first; when
 * a shared foreground token was already fixed for an earlier pair (e.g. `fg`
 * is page text AND panel text), the background side is nudged instead so the
 * earlier guarantee is preserved. Two passes settle cascades.
 */
export function fixPalette<T extends Record<keyof T & string, string>>(colors: T): T {
  const next = { ...colors } as Record<string, string>;
  for (let pass = 0; pass < 2; pass += 1) {
    const claimed = new Set<string>();
    for (const check of CONTRAST_CHECKS) {
      const { fgKey, bgKey, target } = check;
      if (contrastRatio(next[fgKey], next[bgKey]) >= target) {
        claimed.add(fgKey);
        continue;
      }
      if (!claimed.has(fgKey)) {
        next[fgKey] = nudgeToContrast(next[fgKey], next[bgKey], target);
        claimed.add(fgKey);
      }
      if (contrastRatio(next[fgKey], next[bgKey]) < target) {
        next[bgKey] = nudgeToContrast(next[bgKey], next[fgKey], target);
      }
    }
  }
  return next as T;
}

/** The pairs that must stay legible for the board to be playable. */
export const CONTRAST_CHECKS: ContrastCheck[] = [
  { label: "Text on background", fgKey: "fg", bgKey: "bg", target: 4.5 },
  { label: "Muted text on background", fgKey: "muted", bgKey: "bg", target: 3 },
  { label: "Text on panels", fgKey: "fg", bgKey: "surface", target: 4.5 },
  { label: "Text on accent buttons", fgKey: "accentFg", bgKey: "accent", target: 4.5 },
  { label: "Letters on empty tiles", fgKey: "tileFg", bgKey: "tileBase", target: 3 },
  { label: "Letters on correct tiles", fgKey: "tileCorrectFg", bgKey: "tileCorrect", target: 3 },
  { label: "Letters on present tiles", fgKey: "tilePresentFg", bgKey: "tilePresent", target: 3 },
  { label: "Letters on absent tiles", fgKey: "tileFg", bgKey: "tileAbsent", target: 3 },
  { label: "Letters on keyboard keys", fgKey: "keyFg", bgKey: "keyBg", target: 3 },
];
