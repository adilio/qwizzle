import { fixPalette } from "./contrast";
import { DEFAULT_DARK, DEFAULT_LIGHT } from "./tokens";
import type { ThemeColors } from "./tokens";
import { hexToRgb, rgbToHex } from "./contrast";

/** h in [0,360), s/l in [0,1] */
export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgbToHex([(rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255]);
}

/**
 * Pick the color that best serves as a brand accent: vivid wins, with a
 * boost for how prominent the color was (its rank in the palette).
 */
export function pickAccent(palette: string[]): string | null {
  let best: string | null = null;
  let bestScore = -1;
  palette.forEach((hex, index) => {
    const [, s, l] = hexToHsl(hex);
    // Skip near-black/near-white/near-gray — those are backgrounds.
    const vividness = s * (1 - Math.abs(2 * l - 1));
    const prominence = 1 - index / Math.max(1, palette.length);
    const score = vividness * 0.75 + prominence * 0.25 * vividness;
    if (score > bestScore) {
      bestScore = score;
      best = hex;
    }
  });
  return bestScore > 0.03 ? best : null;
}

/**
 * Build dark + light palettes around an accent color. Semantic game colors
 * (correct green, present yellow) stay put; everything structural takes the
 * accent's hue. Output is passed through fixPalette so it is always legible.
 */
export function themesFromAccent(accent: string): { dark: ThemeColors; light: ThemeColors } {
  const [h, rawS] = hexToHsl(accent);
  const s = Math.min(0.85, Math.max(0.25, rawS));

  const dark: ThemeColors = {
    ...DEFAULT_DARK,
    bg: hslToHex(h, s, 0.07),
    fg: "#ffffff",
    muted: hslToHex(h, Math.min(0.6, s), 0.72),
    accent,
    accentFg: "#ffffff",
    surface: hslToHex(h, s, 0.14),
    surfaceBorder: hslToHex(h, s, 0.32),
    tileBase: hslToHex(h, s, 0.17),
    tileBorder: hslToHex(h, s, 0.38),
    tileFg: "#ffffff",
    tileAbsent: hslToHex(h, Math.min(0.5, s), 0.1),
    keyBg: hslToHex(h, s, 0.14),
    keyFg: "#ffffff",
    keyBorder: hslToHex(h, s, 0.38),
  };

  const light: ThemeColors = {
    ...DEFAULT_LIGHT,
    bg: "#ffffff",
    fg: hslToHex(h, Math.min(0.7, s), 0.14),
    muted: hslToHex(h, Math.min(0.65, s), 0.38),
    accent,
    accentFg: "#ffffff",
    surface: hslToHex(h, Math.min(0.6, s), 0.97),
    surfaceBorder: hslToHex(h, Math.min(0.6, s), 0.78),
    tileBase: "#ffffff",
    tileBorder: hslToHex(h, Math.min(0.6, s), 0.72),
    tileFg: hslToHex(h, Math.min(0.7, s), 0.14),
    tileAbsent: hslToHex(h, Math.min(0.4, s), 0.92),
    keyBg: hslToHex(h, Math.min(0.6, s), 0.96),
    keyFg: hslToHex(h, Math.min(0.7, s), 0.14),
    keyBorder: hslToHex(h, Math.min(0.6, s), 0.62),
  };

  return { dark: fixPalette(dark), light: fixPalette(light) };
}
