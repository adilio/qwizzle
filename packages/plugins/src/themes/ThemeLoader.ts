/**
 * Theme Loader
 * Dynamically loads and applies theme manifests
 */

import type { ThemeManifest, ThemeColors, ThemeSizing, ThemeTypography } from "../types";

export interface ThemeLoaderOptions {
  /**
   * ID of the element to inject CSS into (default: creates a style element)
   */
  targetElementId?: string;
  /**
   * Whether to use light or dark variant (if available)
   */
  prefersDark?: boolean;
}

export class ThemeLoader {
  private currentTheme: ThemeManifest | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private targetElementId?: string;
  private prefersDark: boolean;

  constructor(options: ThemeLoaderOptions = {}) {
    this.targetElementId = options.targetElementId;
    this.prefersDark = options.prefersDark ?? true;
  }

  /**
   * Load and apply a theme
   */
  loadTheme(theme: ThemeManifest): void {
    this.currentTheme = theme;
    this.applyTheme();
  }

  /**
   * Apply the current theme to the DOM
   */
  private applyTheme(): void {
    if (!this.currentTheme) {
      return;
    }

    const theme = this.currentTheme;
    const colors = this.prefersDark && theme.lightColors ? theme.colors : theme.colors;
    const lightColors = theme.lightColors;

    // Generate CSS
    const css = this.generateCSS(theme, colors, lightColors);

    // Inject CSS
    this.injectCSS(css);

    // Apply custom icon/logo if specified
    if (theme.icon) {
      this.applyIcon(theme.icon);
    }

    // Set data attribute for theme
    if (typeof document !== "undefined") {
      document.documentElement.dataset.customTheme = theme.id;
    }
  }

  /**
   * Generate CSS from theme manifest
   */
  private generateCSS(theme: ThemeManifest, colors: ThemeColors, lightColors?: ThemeColors): string {
    const lines: string[] = [];

    // Root variables (dark mode or default)
    lines.push(":root {");
    lines.push(`  color-scheme: ${lightColors ? "dark" : "light"};`);
    lines.push(...this.generateColorVariables(colors));

    if (theme.sizing) {
      lines.push(...this.generateSizingVariables(theme.sizing));
    }

    if (theme.typography) {
      lines.push(...this.generateTypographyVariables(theme.typography));
    }

    lines.push("}");

    // Light mode variables (if available)
    if (lightColors) {
      lines.push("");
      lines.push(":root[data-theme='light'] {");
      lines.push("  color-scheme: light;");
      lines.push(...this.generateColorVariables(lightColors));
      lines.push("}");
    }

    // Custom CSS
    if (theme.customCss) {
      lines.push("");
      lines.push(theme.customCss);
    }

    return lines.join("\n");
  }

  /**
   * Generate CSS variables for colors
   */
  private generateColorVariables(colors: ThemeColors): string[] {
    const vars: string[] = [];

    const colorMap: Record<string, keyof ThemeColors> = {
      "--bg": "bg",
      "--bg-glow": "bgGlow",
      "--fg": "fg",
      "--muted": "muted",
      "--accent": "accent",
      "--accent-fg": "accentFg",
      "--success": "success",
      "--danger": "danger",
      "--surface": "surface",
      "--surface-border": "surfaceBorder",
      "--t-base": "tBase",
      "--t-border": "tBorder",
      "--t-correct": "tCorrect",
      "--t-present": "tPresent",
      "--t-absent": "tAbsent",
      "--key-border": "keyBorder",
    };

    for (const [cssVar, colorKey] of Object.entries(colorMap)) {
      const value = colors[colorKey];
      if (value) {
        vars.push(`  ${cssVar}: ${value};`);
      }
    }

    return vars;
  }

  /**
   * Generate CSS variables for sizing
   */
  private generateSizingVariables(sizing: ThemeSizing): string[] {
    const vars: string[] = [];

    if (sizing.tile) {
      vars.push(`  --tile: ${sizing.tile};`);
    }
    if (sizing.gap) {
      vars.push(`  --gap: ${sizing.gap};`);
    }
    if (sizing.padding) {
      vars.push(`  --pad: ${sizing.padding};`);
    }
    if (sizing.borderRadius) {
      vars.push(`  --border-radius: ${sizing.borderRadius};`);
    }

    return vars;
  }

  /**
   * Generate CSS variables for typography
   */
  private generateTypographyVariables(typography: ThemeTypography): string[] {
    const vars: string[] = [];

    if (typography.primaryFont) {
      vars.push(`  --font-primary: ${typography.primaryFont};`);
      vars.push(`  font-family: var(--font-primary);`);
    }
    if (typography.secondaryFont) {
      vars.push(`  --font-secondary: ${typography.secondaryFont};`);
    }
    if (typography.monoFont) {
      vars.push(`  --font-mono: ${typography.monoFont};`);
    }
    if (typography.baseFontSize) {
      vars.push(`  font-size: ${typography.baseFontSize};`);
    }

    return vars;
  }

  /**
   * Inject CSS into the DOM
   */
  private injectCSS(css: string): void {
    if (typeof document === "undefined") {
      return;
    }

    // Create or get style element
    if (!this.styleElement) {
      if (this.targetElementId) {
        const existing = document.getElementById(this.targetElementId);
        if (existing instanceof HTMLStyleElement) {
          this.styleElement = existing;
        }
      }

      if (!this.styleElement) {
        this.styleElement = document.createElement("style");
        this.styleElement.id = this.targetElementId ?? "qwizzle-custom-theme";
        document.head.appendChild(this.styleElement);
      }
    }

    this.styleElement.textContent = css;
  }

  /**
   * Apply custom icon to the page
   */
  private applyIcon(iconUrl: string): void {
    if (typeof document === "undefined") {
      return;
    }

    // Update favicon
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = iconUrl;

    // Update apple-touch-icon
    let appleTouchIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!appleTouchIcon) {
      appleTouchIcon = document.createElement("link");
      appleTouchIcon.rel = "apple-touch-icon";
      document.head.appendChild(appleTouchIcon);
    }
    appleTouchIcon.href = iconUrl;
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeManifest | null {
    return this.currentTheme;
  }

  /**
   * Set color scheme preference
   */
  setPrefersDark(prefersDark: boolean): void {
    this.prefersDark = prefersDark;
    if (this.currentTheme) {
      this.applyTheme();
    }
  }

  /**
   * Remove the theme and clean up
   */
  unloadTheme(): void {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
    }

    if (typeof document !== "undefined") {
      delete document.documentElement.dataset.customTheme;
    }

    this.currentTheme = null;
  }

  /**
   * Load theme from URL
   */
  async loadThemeFromUrl(url: string): Promise<void> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load theme: ${response.status} ${response.statusText}`);
    }

    const theme = (await response.json()) as ThemeManifest;
    this.validateTheme(theme);
    this.loadTheme(theme);
  }

  /**
   * Validate theme manifest
   */
  private validateTheme(theme: unknown): asserts theme is ThemeManifest {
    if (typeof theme !== "object" || theme === null) {
      throw new Error("Theme must be an object");
    }

    const t = theme as Record<string, unknown>;

    if (typeof t.id !== "string" || !t.id) {
      throw new Error("Theme must have an 'id' field");
    }

    if (typeof t.name !== "string" || !t.name) {
      throw new Error("Theme must have a 'name' field");
    }

    if (typeof t.colors !== "object" || t.colors === null) {
      throw new Error("Theme must have a 'colors' object");
    }

    const colors = t.colors as Record<string, unknown>;
    if (typeof colors.bg !== "string" || typeof colors.fg !== "string" || typeof colors.accent !== "string") {
      throw new Error("Theme colors must have at least bg, fg, and accent");
    }
  }
}

/**
 * Create a theme loader
 */
export function createThemeLoader(options?: ThemeLoaderOptions): ThemeLoader {
  return new ThemeLoader(options);
}
