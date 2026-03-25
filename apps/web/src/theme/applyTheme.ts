const COLOR_MAP: Record<string, string> = {
  bg: "--bg",
  bgGlow: "--bg-glow",
  fg: "--fg",
  muted: "--muted",
  accent: "--accent",
  accentFg: "--accent-fg",
  success: "--success",
  danger: "--danger",
  surface: "--surface",
  surfaceBorder: "--surface-border",
  tBase: "--t-base",
  tBorder: "--t-border",
  tCorrect: "--t-correct",
  tPresent: "--t-present",
  tAbsent: "--t-absent",
  keyBorder: "--key-border",
};

export interface ThemeColors {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
  tCorrect: string;
  tPresent: string;
  tAbsent: string;
  [key: string]: string | undefined;
}

export interface CustomTheme {
  colors: ThemeColors;
  lightColors?: Partial<ThemeColors>;
}

function colorsToCSS(colors: Partial<ThemeColors>): string {
  return Object.entries(COLOR_MAP)
    .filter(([key]) => colors[key])
    .map(([key, cssVar]) => `  ${cssVar}: ${colors[key]};`)
    .join("\n");
}

export function applyTheme(theme: CustomTheme): void {
  let css = `:root {\n${colorsToCSS(theme.colors)}\n}`;

  if (theme.lightColors) {
    css += `\n:root[data-theme='light'] {\n${colorsToCSS(theme.lightColors)}\n}`;
  }

  let el = document.getElementById("qwizzle-custom-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "qwizzle-custom-theme";
    document.head.appendChild(el);
  }
  el.textContent = css;
}
