import { describe, expect, it } from "vitest";
import { BRAND, appTitle } from "./brand";

describe("appTitle", () => {
  it("is plain Qwizzle with no edition name", () => {
    expect(appTitle()).toBe(BRAND);
    expect(appTitle(null)).toBe(BRAND);
    expect(appTitle("")).toBe(BRAND);
    expect(appTitle("   ")).toBe(BRAND);
  });

  it("renders Qwizzle: X Edition with a name", () => {
    expect(appTitle("Cyber")).toBe("Qwizzle: Cyber Edition");
    expect(appTitle("  Cyber ")).toBe("Qwizzle: Cyber Edition");
  });
});
