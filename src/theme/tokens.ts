/** Every user-themable design token. Values are #rrggbb hex strings. */
export interface ThemeColors {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
  success: string;
  danger: string;
  surface: string;
  surfaceBorder: string;
  tileBase: string;
  tileBorder: string;
  tileFg: string;
  tileCorrect: string;
  tileCorrectFg: string;
  tilePresent: string;
  tilePresentFg: string;
  tileAbsent: string;
  keyBg: string;
  keyFg: string;
  keyBorder: string;
}

export const TOKEN_KEYS = [
  "bg",
  "fg",
  "muted",
  "accent",
  "accentFg",
  "success",
  "danger",
  "surface",
  "surfaceBorder",
  "tileBase",
  "tileBorder",
  "tileFg",
  "tileCorrect",
  "tileCorrectFg",
  "tilePresent",
  "tilePresentFg",
  "tileAbsent",
  "keyBg",
  "keyFg",
  "keyBorder",
] as const satisfies readonly (keyof ThemeColors)[];

const CSS_VARS: Record<keyof ThemeColors, string> = {
  bg: "--bg",
  fg: "--fg",
  muted: "--muted",
  accent: "--accent",
  accentFg: "--accent-fg",
  success: "--success",
  danger: "--danger",
  surface: "--surface",
  surfaceBorder: "--surface-border",
  tileBase: "--t-base",
  tileBorder: "--t-border",
  tileFg: "--t-fg",
  tileCorrect: "--t-correct",
  tileCorrectFg: "--t-correct-fg",
  tilePresent: "--t-present",
  tilePresentFg: "--t-present-fg",
  tileAbsent: "--t-absent",
  keyBg: "--key-bg",
  keyFg: "--key-fg",
  keyBorder: "--key-border",
};

/** Human labels + grouping for the Studio editor. */
export const TOKEN_GROUPS: Array<{
  group: string;
  tokens: Array<{ key: keyof ThemeColors; label: string }>;
}> = [
  {
    group: "Page",
    tokens: [
      { key: "bg", label: "Background" },
      { key: "fg", label: "Text" },
      { key: "muted", label: "Muted text" },
    ],
  },
  {
    group: "Accent",
    tokens: [
      { key: "accent", label: "Accent" },
      { key: "accentFg", label: "Text on accent" },
      { key: "success", label: "Success" },
      { key: "danger", label: "Error" },
    ],
  },
  {
    group: "Panels",
    tokens: [
      { key: "surface", label: "Panel" },
      { key: "surfaceBorder", label: "Panel border" },
    ],
  },
  {
    group: "Tiles",
    tokens: [
      { key: "tileBase", label: "Empty tile" },
      { key: "tileBorder", label: "Tile border" },
      { key: "tileFg", label: "Tile letters" },
      { key: "tileCorrect", label: "Correct tile" },
      { key: "tileCorrectFg", label: "Text on correct" },
      { key: "tilePresent", label: "Present tile" },
      { key: "tilePresentFg", label: "Text on present" },
      { key: "tileAbsent", label: "Absent tile" },
    ],
  },
  {
    group: "Keyboard",
    tokens: [
      { key: "keyBg", label: "Key" },
      { key: "keyFg", label: "Key letters" },
      { key: "keyBorder", label: "Key border" },
    ],
  },
];

/** Defaults mirror src/index.css (the Wiz-brand palette). */
export const DEFAULT_DARK: ThemeColors = {
  bg: "#010b2e",
  fg: "#ffffff",
  muted: "#97bbff",
  accent: "#0254ec",
  accentFg: "#ffffff",
  success: "#22c55e",
  danger: "#ff9bbe",
  surface: "#081a4d",
  surfaceBorder: "#173aaa",
  tileBase: "#0a1e57",
  tileBorder: "#2748b8",
  tileFg: "#ffffff",
  tileCorrect: "#22c55e",
  tileCorrectFg: "#01123f",
  tilePresent: "#ffff00",
  tilePresentFg: "#01123f",
  tileAbsent: "#050f33",
  keyBg: "#081a4d",
  keyFg: "#ffffff",
  keyBorder: "#2748b8",
};

export const DEFAULT_LIGHT: ThemeColors = {
  bg: "#ffffff",
  fg: "#01123f",
  muted: "#173aaa",
  accent: "#0254ec",
  accentFg: "#ffffff",
  success: "#16a34a",
  danger: "#c2185b",
  surface: "#f3f7ff",
  surfaceBorder: "#97bbff",
  tileBase: "#ffffff",
  tileBorder: "#97bbff",
  tileFg: "#01123f",
  tileCorrect: "#16a34a",
  tileCorrectFg: "#ffffff",
  tilePresent: "#ffe000",
  tilePresentFg: "#01123f",
  tileAbsent: "#e2eafb",
  keyBg: "#f3f7ff",
  keyFg: "#01123f",
  keyBorder: "#6197ff",
};

export function sanitizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return null;
}

/** Merge unknown input onto a default palette, keeping only valid hexes. */
export function sanitizeColors(raw: unknown, defaults: ThemeColors): ThemeColors {
  const result = { ...defaults };
  if (raw && typeof raw === "object") {
    for (const key of TOKEN_KEYS) {
      const hex = sanitizeHex((raw as Record<string, unknown>)[key]);
      if (hex) result[key] = hex;
    }
  }
  return result;
}

/** Build the CSS custom-property map for a palette (incl. derived glow). */
export function themeCssVars(colors: ThemeColors): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of TOKEN_KEYS) {
    vars[CSS_VARS[key]] = colors[key];
  }
  const r = parseInt(colors.accent.slice(1, 3), 16);
  const g = parseInt(colors.accent.slice(3, 5), 16);
  const b = parseInt(colors.accent.slice(5, 7), 16);
  vars["--bg-glow"] = `rgba(${r}, ${g}, ${b}, 0.18)`;
  return vars;
}

/** Apply a palette as inline overrides on the document root. */
export function applyTheme(colors: ThemeColors, root: HTMLElement = document.documentElement) {
  for (const [name, value] of Object.entries(themeCssVars(colors))) {
    root.style.setProperty(name, value);
  }
}
