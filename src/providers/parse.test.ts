import { describe, expect, it } from "vitest";
import {
  ImportError,
  normalizeEntries,
  parseCsv,
  parseJson,
  parsePaste,
  splitCsvLine,
} from "./parse";
import { parseGistUrl } from "./remote";

describe("normalizeEntries", () => {
  it("uppercases words and maps clue to definition", () => {
    const { entries } = normalizeEntries([
      { word: "soc", definition: "Ops center" },
      { word: "ioc", clue: "Forensic breadcrumb", expansion: "Indicator of Compromise" },
    ]);
    expect(entries).toEqual([
      { word: "SOC", definition: "Ops center" },
      { word: "IOC", definition: "Forensic breadcrumb", expansion: "Indicator of Compromise" },
    ]);
  });

  it("accepts bare strings and cyberdle-style {w,e,d} rows", () => {
    const { entries } = normalizeEntries(["mfa", { w: "SIEM", e: "Security…", d: "Logs" }]);
    expect(entries[0]).toEqual({ word: "MFA" });
    expect(entries[1].word).toBe("SIEM");
    expect(entries[1].definition).toBe("Logs");
  });

  it("skips invalid rows with warnings and dedupes", () => {
    const { entries, warnings } = normalizeEntries([
      { word: "SOC" },
      { word: "SOC" },
      { word: "A" },
      { word: "HAS SPACE" },
      { word: "WAYTOOLONGFORAWORD" },
      { definition: "no word" },
      42,
    ]);
    expect(entries).toEqual([{ word: "SOC" }]);
    expect(warnings).toHaveLength(6);
  });

  it("throws when nothing valid remains", () => {
    expect(() => normalizeEntries([{ word: "!" }])).toThrow(ImportError);
    expect(() => normalizeEntries([])).toThrow(ImportError);
  });
});

describe("parseJson", () => {
  it("accepts a bare array, {words}, and {data} shapes", () => {
    expect(parseJson('[{"word":"SOC"}]').entries).toHaveLength(1);
    expect(parseJson('{"words":[{"word":"SOC"}]}').entries).toHaveLength(1);
    expect(parseJson('{"data":["SOC","IOC"]}').entries).toHaveLength(2);
  });

  it("rejects malformed JSON and wrong shapes", () => {
    expect(() => parseJson("not json")).toThrow(ImportError);
    expect(() => parseJson('{"nope":1}')).toThrow(ImportError);
  });
});

describe("splitCsvLine", () => {
  it("handles quoted fields with commas and escaped quotes", () => {
    expect(splitCsvLine('SOC,"Ops, the center","He said ""hi"""')).toEqual([
      "SOC",
      "Ops, the center",
      'He said "hi"',
    ]);
  });
});

describe("parseCsv", () => {
  it("reads a headered CSV in any column order", () => {
    const { entries } = parseCsv("definition,word\nOps center,SOC\nBreadcrumb,IOC");
    expect(entries).toEqual([
      { word: "SOC", definition: "Ops center" },
      { word: "IOC", definition: "Breadcrumb" },
    ]);
  });

  it("assumes word,definition,expansion without a header", () => {
    const { entries } = parseCsv("SOC,Ops center,Security Operations Center");
    expect(entries[0]).toEqual({
      word: "SOC",
      definition: "Ops center",
      expansion: "Security Operations Center",
    });
  });

  it("throws on empty input", () => {
    expect(() => parseCsv("  \n ")).toThrow(ImportError);
  });
});

describe("parsePaste", () => {
  it("auto-detects WORD=Definition lines", () => {
    const { entries } = parsePaste("SOC=Ops center\nIOC=Forensic breadcrumb");
    expect(entries).toEqual([
      { word: "SOC", definition: "Ops center" },
      { word: "IOC", definition: "Forensic breadcrumb" },
    ]);
  });

  it("auto-detects comma lines and pasted JSON", () => {
    expect(parsePaste("SOC,Ops center").entries[0].definition).toBe("Ops center");
    expect(parsePaste('["SOC","IOC"]').entries).toHaveLength(2);
  });

  it("accepts plain word-per-line lists", () => {
    expect(parsePaste("SOC\nIOC\nMFA").entries).toHaveLength(3);
  });

  it("throws on empty paste", () => {
    expect(() => parsePaste("   ")).toThrow(ImportError);
  });
});

describe("parseGistUrl", () => {
  it("extracts the id from a gist page URL", () => {
    expect(parseGistUrl("https://gist.github.com/adilio/0a1b2c3d4e5f67890123456789abcdef")).toEqual(
      { id: "0a1b2c3d4e5f67890123456789abcdef" },
    );
  });

  it("passes through raw gist URLs", () => {
    const raw =
      "https://gist.githubusercontent.com/adilio/0a1b2c3d/raw/9f8e/words.json";
    expect(parseGistUrl(raw)).toEqual({ id: "0a1b2c3d", rawUrl: raw });
  });

  it("rejects non-gist URLs", () => {
    expect(() => parseGistUrl("https://github.com/adilio/qwizzle")).toThrow(ImportError);
    expect(() => parseGistUrl("nope")).toThrow(ImportError);
  });
});
