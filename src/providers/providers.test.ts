import { describe, expect, it, vi } from "vitest";

vi.mock("./remote", () => ({
  fetchText: vi.fn(async () => JSON.stringify([{ word: "SOC", definition: "Ops center" }])),
  fetchGist: vi.fn(async () => ({
    text: JSON.stringify([{ word: "IOC", definition: "Indicator" }]),
    hint: "words.json",
  })),
  parseGistUrl: vi.fn(() => ({ id: "abc123def456" })),
}));

import { gistProvider, urlProvider, pasteProvider } from "./providers";

describe("provider source provenance", () => {
  it("urlProvider stamps the imported URL on the wordlist", async () => {
    const { wordlist } = await urlProvider("https://example.com/words.json").load();
    expect(wordlist.sourceType).toBe("url");
    expect(wordlist.sourceUrl).toBe("https://example.com/words.json");
    expect(wordlist.entries[0].word).toBe("SOC");
  });

  it("gistProvider stamps the gist URL on the wordlist", async () => {
    const { wordlist } = await gistProvider("https://gist.github.com/adilio/abc123def456").load();
    expect(wordlist.sourceType).toBe("gist");
    expect(wordlist.sourceUrl).toBe("https://gist.github.com/adilio/abc123def456");
    expect(wordlist.entries[0].word).toBe("IOC");
  });

  it("pasted lists carry no sourceUrl (entries are embedded instead)", async () => {
    const { wordlist } = await pasteProvider("SOC=Security Operations Center").load();
    expect(wordlist.sourceUrl).toBeUndefined();
  });
});
