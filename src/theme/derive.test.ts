import { describe, expect, it } from "vitest";
import { medianCut, rgbToHexString } from "./quantize";
import { hexToHsl, hslToHex, pickAccent, themesFromAccent } from "./derive";
import { contrastRatio, CONTRAST_CHECKS } from "./contrast";

function pixels(colors: Array<[number, number, number, number]>, repeat: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < repeat; i += 1) {
    for (const c of colors) data.push(...c);
  }
  return data;
}

describe("medianCut", () => {
  it("finds the dominant colors of a synthetic image", () => {
    // 300 red pixels, 100 blue pixels.
    const data = [
      ...pixels([[255, 0, 0, 255]], 300),
      ...pixels([[0, 0, 255, 255]], 100),
    ];
    const palette = medianCut(new Uint8ClampedArray(data), 2).map(rgbToHexString);
    expect(palette[0]).toBe("#ff0000");
    expect(palette[1]).toBe("#0000ff");
  });

  it("skips transparent pixels and handles empty input", () => {
    expect(medianCut(new Uint8ClampedArray([255, 0, 0, 10]), 2)).toEqual([]);
    expect(medianCut(new Uint8ClampedArray([]), 4)).toEqual([]);
  });

  it("returns at most the requested count", () => {
    const data = pixels(
      [
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
        [255, 255, 0, 255],
        [255, 0, 255, 255],
      ],
      50,
    );
    expect(medianCut(new Uint8ClampedArray(data), 4).length).toBeLessThanOrEqual(4);
  });
});

describe("hsl round trip", () => {
  it("round-trips hues", () => {
    for (const hex of ["#0254ec", "#ff0000", "#00ff00", "#123456", "#fafafa"]) {
      const [h, s, l] = hexToHsl(hex);
      const back = hslToHex(h, s, l);
      // Allow off-by-one rounding per channel.
      const delta = [0, 2, 4].map((i) =>
        Math.abs(parseInt(hex.slice(1 + i, 3 + i), 16) - parseInt(back.slice(1 + i, 3 + i), 16)),
      );
      expect(Math.max(...delta)).toBeLessThanOrEqual(2);
    }
  });
});

describe("pickAccent", () => {
  it("prefers a vivid color over black/white/gray", () => {
    expect(pickAccent(["#ffffff", "#111111", "#0254ec", "#888888"])).toBe("#0254ec");
  });

  it("returns null for an all-neutral palette", () => {
    expect(pickAccent(["#ffffff", "#000000", "#777777"])).toBeNull();
    expect(pickAccent([])).toBeNull();
  });
});

describe("themesFromAccent", () => {
  it.each(["#0254ec", "#e11d48", "#0f766e", "#ffff00", "#c0ffee"])(
    "generates fully legible palettes from %s",
    (accent) => {
      const { dark, light } = themesFromAccent(accent);
      for (const palette of [dark, light]) {
        const colors = palette as unknown as Record<string, string>;
        for (const check of CONTRAST_CHECKS) {
          expect(
            contrastRatio(colors[check.fgKey], colors[check.bgKey]),
            `${check.label} for accent ${accent}`,
          ).toBeGreaterThanOrEqual(check.target);
        }
      }
      expect(dark.accent).toBe(accent);
    },
  );

  it("keeps semantic game colors from the defaults", () => {
    const { dark } = themesFromAccent("#e11d48");
    expect(dark.tileCorrect).toBe("#22c55e");
  });
});
