import { describe, expect, it } from "vitest";
import { restoreGame, toStored } from "./persistence";
import { newGame, submitGuess } from "../engine";
import type { Wordlist } from "../providers/types";

const LIST: Wordlist = {
  id: "builtin",
  name: "Test",
  sourceType: "builtin",
  entries: [{ word: "SIEM" }, { word: "CASB" }, { word: "SOAR" }],
};

const TODAY = new Date(Date.UTC(2026, 6, 5));

describe("restoreGame", () => {
  it("round-trips an in-progress daily game and recomputes results", () => {
    const game = newGame({ wordlistId: "builtin", entries: LIST.entries, mode: "daily", date: TODAY });
    const r = submitGuess(game, "MIST".slice(0, game.word.length).padEnd(game.word.length, "X"));
    const played = r.ok ? r.state : game;
    const restored = restoreGame(toStored(played), LIST, TODAY);
    expect(restored).not.toBeNull();
    expect(restored!.word).toBe(played.word);
    expect(restored!.guesses).toEqual(played.guesses);
    expect(restored!.results).toEqual(played.results);
    expect(restored!.status).toBe(played.status);
  });

  it("restores a finished game as finished", () => {
    const game = newGame({ wordlistId: "builtin", entries: LIST.entries, mode: "daily", date: TODAY });
    const r = submitGuess(game, game.word);
    if (!r.ok) throw new Error("expected ok");
    const restored = restoreGame(toStored(r.state), LIST, TODAY);
    expect(restored!.status).toBe("won");
  });

  it("discards a daily from a previous day", () => {
    const game = newGame({ wordlistId: "builtin", entries: LIST.entries, mode: "daily", date: TODAY });
    const restored = restoreGame(toStored(game), LIST, new Date(Date.UTC(2026, 6, 6)));
    expect(restored).toBeNull();
  });

  it("keeps a random game across days", () => {
    const game = newGame({ wordlistId: "builtin", entries: LIST.entries, mode: "random", rng: () => 0 });
    const restored = restoreGame(toStored(game), LIST, new Date(Date.UTC(2027, 0, 1)));
    expect(restored).not.toBeNull();
    expect(restored!.mode).toBe("random");
  });

  it("discards when the wordlist id differs or the answer moved", () => {
    const game = newGame({ wordlistId: "builtin", entries: LIST.entries, mode: "random", rng: () => 0 });
    expect(restoreGame(toStored(game), { ...LIST, id: "other" }, TODAY)).toBeNull();
    const edited: Wordlist = { ...LIST, entries: [{ word: "XXXX" }, ...LIST.entries.slice(1)] };
    const gameAt0 = { ...game, index: 0, word: "SIEM" };
    expect(restoreGame(toStored(gameAt0), edited, TODAY)).toBeNull();
  });

  it("rejects malformed storage", () => {
    expect(restoreGame(null, LIST)).toBeNull();
    expect(restoreGame("junk", LIST)).toBeNull();
    expect(restoreGame({ version: 2 }, LIST)).toBeNull();
    expect(restoreGame({ version: 1, wordlistId: "builtin", word: 5 }, LIST)).toBeNull();
  });
});
