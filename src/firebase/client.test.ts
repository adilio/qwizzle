import { describe, expect, it } from "vitest";
import { wordlistSlug } from "./client";

// wordlistSlug is load-bearing: it is the document id for a saved wordlist, and
// it is the only thing enforcing what the Postgres `wordlists_user_name_idx`
// unique index used to enforce — that re-importing a list replaces it rather
// than piling up duplicates. Firestore has no unique indexes, so if this stops
// being deterministic, users silently accumulate copies.
describe("wordlistSlug", () => {
  it("is stable for the same name", () => {
    expect(wordlistSlug("Movie Quotes")).toBe(wordlistSlug("Movie Quotes"));
  });

  it("lowercases and dashes so re-importing overwrites", () => {
    expect(wordlistSlug("Movie Quotes")).toBe("movie-quotes");
    expect(wordlistSlug("movie quotes")).toBe("movie-quotes");
  });

  it("collapses runs of punctuation and trims the edges", () => {
    expect(wordlistSlug("  Hello --- World!!  ")).toBe("hello-world");
  });

  it("never returns an empty id", () => {
    // Firestore rejects an empty document id, so a name made entirely of
    // punctuation still has to produce something legal.
    expect(wordlistSlug("!!!")).toBe("list");
    expect(wordlistSlug("")).toBe("list");
    expect(wordlistSlug("   ")).toBe("list");
  });

  it("stays well inside Firestore's document id limit", () => {
    expect(wordlistSlug("x".repeat(500))).toHaveLength(80);
  });

  it("does not leave a trailing dash after truncation", () => {
    // Slicing first and trimming second matters: "aaa...a bbb" cut at 80 could
    // otherwise end on the dash that replaced the space.
    const slug = wordlistSlug(`${"a".repeat(79)} tail`);
    expect(slug.endsWith("-")).toBe(false);
  });
});
