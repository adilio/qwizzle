import { describe, expect, it } from "vitest";
import { contrastRatio, fixPalette, nudgeToContrast, relativeLuminance } from "./contrast";
import { sanitizeColors, sanitizeHex, themeCssVars, DEFAULT_DARK, DEFAULT_LIGHT } from "./tokens";
import { CONTRAST_CHECKS } from "./contrast";

describe("contrast math", () => {
  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#0254ec", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#0254ec"),
      6,
    );
  });
});

describe("nudgeToContrast", () => {
  it("returns the color unchanged when already legible", () => {
    expect(nudgeToContrast("#000000", "#ffffff", 4.5)).toBe("#000000");
  });

  it("nudges an unreadable pair to the target ratio", () => {
    const fixed = nudgeToContrast("#888888", "#999999", 4.5);
    expect(contrastRatio(fixed, "#999999")).toBeGreaterThanOrEqual(4.5);
  });

  it("nudges toward white on dark backgrounds and black on light", () => {
    const onDark = nudgeToContrast("#333333", "#111111", 4.5);
    expect(relativeLuminance(onDark)).toBeGreaterThan(relativeLuminance("#333333"));
    const onLight = nudgeToContrast("#dddddd", "#eeeeee", 4.5);
    expect(relativeLuminance(onLight)).toBeLessThan(relativeLuminance("#dddddd"));
  });
});

describe("fixPalette", () => {
  function failures(palette: typeof DEFAULT_DARK) {
    const colors = palette as unknown as Record<string, string>;
    return CONTRAST_CHECKS.filter(
      (c) => contrastRatio(colors[c.fgKey], colors[c.bgKey]) < c.target,
    );
  }

  it("leaves a compliant palette untouched", () => {
    expect(fixPalette({ ...DEFAULT_DARK })).toEqual(DEFAULT_DARK);
  });

  it("repairs a light background pasted onto the dark theme", () => {
    const broken = { ...DEFAULT_DARK, bg: "#eeeeee" };
    expect(failures(broken).length).toBeGreaterThan(0);
    expect(failures(fixPalette(broken))).toEqual([]);
  });

  it("repairs an all-one-color palette", () => {
    const broken = Object.fromEntries(
      Object.keys(DEFAULT_DARK).map((k) => [k, "#777777"]),
    ) as unknown as typeof DEFAULT_DARK;
    expect(failures(fixPalette(broken))).toEqual([]);
  });

  it("repairs clashing tile colors", () => {
    const broken = {
      ...DEFAULT_LIGHT,
      tilePresent: "#ffffff",
      tilePresentFg: "#ffffee",
      tileCorrect: "#111111",
      tileCorrectFg: "#000000",
    };
    expect(failures(fixPalette(broken))).toEqual([]);
  });
});

describe("default palettes", () => {
  it.each(CONTRAST_CHECKS)("dark theme passes: $label", ({ fgKey, bgKey, target }) => {
    const colors = DEFAULT_DARK as unknown as Record<string, string>;
    expect(contrastRatio(colors[fgKey], colors[bgKey])).toBeGreaterThanOrEqual(target);
  });

  it.each(CONTRAST_CHECKS)("light theme passes: $label", ({ fgKey, bgKey, target }) => {
    const colors = DEFAULT_LIGHT as unknown as Record<string, string>;
    expect(contrastRatio(colors[fgKey], colors[bgKey])).toBeGreaterThanOrEqual(target);
  });
});

describe("token sanitizing", () => {
  it("accepts 6- and 3-digit hex, rejects junk", () => {
    expect(sanitizeHex("#A1B2C3")).toBe("#a1b2c3");
    expect(sanitizeHex("#abc")).toBe("#aabbcc");
    expect(sanitizeHex("red")).toBeNull();
    expect(sanitizeHex("#12345")).toBeNull();
    expect(sanitizeHex(42)).toBeNull();
  });

  it("merges only valid entries onto defaults", () => {
    const merged = sanitizeColors({ bg: "#123456", fg: "nope", extra: "#ffffff" }, DEFAULT_DARK);
    expect(merged.bg).toBe("#123456");
    expect(merged.fg).toBe(DEFAULT_DARK.fg);
  });

  it("emits a css var per token plus the derived glow", () => {
    const vars = themeCssVars(DEFAULT_DARK);
    expect(vars["--accent"]).toBe("#0254ec");
    expect(vars["--bg-glow"]).toBe("rgba(2, 84, 236, 0.18)");
    expect(Object.keys(vars)).toHaveLength(21);
  });
});
