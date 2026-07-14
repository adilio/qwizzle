import { describe, expect, it } from "vitest";
import {
  defaultEdition,
  exportEditionJson,
  parseEdition,
  sanitizeEditionName,
  wordlistFromRef,
  wordlistRefFor,
} from "./edition";
import { ImportError } from "../providers/parse";
import { DEFAULT_DARK } from "../theme/tokens";
import type { Wordlist } from "../providers/types";

describe("edition export/import round-trip", () => {
  it("round-trips the default edition", () => {
    const edition = defaultEdition();
    const parsed = parseEdition(exportEditionJson(edition));
    expect(parsed).toEqual(edition);
  });

  it("round-trips a customized edition with an embedded wordlist", () => {
    const list: Wordlist = {
      id: "habc",
      name: "Fruit",
      sourceType: "paste",
      entries: [{ word: "MANGO", definition: "A fruit" }],
    };
    const edition = {
      ...defaultEdition(),
      editionName: "Fruit",
      theme: {
        colors: { ...DEFAULT_DARK, accent: "#ff0000" },
        lightColors: defaultEdition().theme.lightColors,
      },
      wordlist: wordlistRefFor(list),
    };
    const parsed = parseEdition(exportEditionJson(edition));
    expect(parsed.editionName).toBe("Fruit");
    expect(parsed.theme.colors.accent).toBe("#ff0000");
    expect(parsed.wordlist.entries).toEqual(list.entries);
    expect(wordlistFromRef(parsed.wordlist)?.entries[0].word).toBe("MANGO");
  });

  it("keeps url lists by reference without embedding entries", () => {
    const list: Wordlist = {
      id: "u1",
      name: "Remote",
      sourceType: "url",
      entries: [{ word: "SOC" }],
    };
    const ref = wordlistRefFor(list, "https://example.com/w.json");
    expect(ref.entries).toBeUndefined();
    expect(ref.source_url).toBe("https://example.com/w.json");
  });

  it("carries a url list's own sourceUrl into the ref without a caller-supplied URL", () => {
    // This is the path the Studio actually takes: wordlistRefFor(list) with no
    // second argument. The list's imported origin must survive into the ref.
    const list: Wordlist = {
      id: "u2",
      name: "Remote",
      sourceType: "url",
      entries: [{ word: "SOC" }],
      sourceUrl: "https://example.com/imported.csv",
    };
    const ref = wordlistRefFor(list);
    expect(ref.source_url).toBe("https://example.com/imported.csv");
    expect(ref.entries).toBeUndefined();
  });

  it("carries a gist list's origin the same way", () => {
    const list: Wordlist = {
      id: "gabc",
      name: "Gist list",
      sourceType: "gist",
      entries: [{ word: "IOC" }],
      sourceUrl: "https://gist.github.com/adilio/abc123",
    };
    const ref = wordlistRefFor(list);
    expect(ref.source_url).toBe("https://gist.github.com/adilio/abc123");
  });

  it("round-trips source_url through export/parse and back onto the wordlist", () => {
    const edition = {
      ...defaultEdition(),
      wordlist: {
        source_type: "url" as const,
        name: "Remote",
        source_url: "https://example.com/w.json",
        entries: [{ word: "SOC" }],
      },
    };
    const parsed = parseEdition(exportEditionJson(edition));
    expect(parsed.wordlist.source_url).toBe("https://example.com/w.json");
    const rebuilt = wordlistFromRef(parsed.wordlist);
    expect(rebuilt?.sourceUrl).toBe("https://example.com/w.json");
  });

  it("rejects files that are not editions", () => {
    expect(() => parseEdition("junk")).toThrow(ImportError);
    expect(() => parseEdition("{}")).toThrow(ImportError);
    expect(() => parseEdition(JSON.stringify({ brand: "Other", version: 1 }))).toThrow(
      ImportError,
    );
  });

  it("sanitizes bad colors and names instead of failing", () => {
    const edition = defaultEdition();
    const tampered = {
      ...edition,
      editionName: "  A   very\n long   name that keeps going and going and going yes  ",
      theme: { colors: { ...edition.theme.colors, bg: "javascript:alert(1)" } },
    };
    const parsed = parseEdition(JSON.stringify(tampered));
    expect(parsed.theme.colors.bg).toBe(DEFAULT_DARK.bg);
    expect(parsed.editionName.length).toBeLessThanOrEqual(40);
    expect(parsed.editionName).toContain("A very long name");
  });
});

describe("sanitizeEditionName", () => {
  it("collapses whitespace and bounds length", () => {
    expect(sanitizeEditionName("  Cyber   Edition  ")).toBe("Cyber Edition");
    expect(sanitizeEditionName(12)).toBe("");
    expect(sanitizeEditionName("x".repeat(100))).toHaveLength(40);
  });
});
