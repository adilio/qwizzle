import { describe, expect, it } from "vitest";
import {
  applyLoss,
  applyWin,
  computeFeedback,
  createInitialStats,
  dailyIndex,
  hardModeViolation,
  hashString,
  isValidGuess,
  keyboardStates,
  mergeStats,
  newGame,
  randomIndex,
  shareGrid,
  shareText,
  submitGuess,
  utcDateKey,
  MAX_ATTEMPTS,
  type GameState,
  type WordEntry,
} from "./index";

const ENTRIES: WordEntry[] = [
  { word: "SIEM", definition: "Log aggregation platform" },
  { word: "CASB", definition: "Cloud access broker" },
  { word: "SOAR", definition: "Automated response" },
  { word: "MFA", definition: "More than one factor" },
  { word: "CNAPP", definition: "Cloud-native protection" },
];

function playing(word: string): GameState {
  return {
    wordlistId: "builtin",
    mode: "daily",
    index: 0,
    dateKey: "2026-07-05",
    word,
    guesses: [],
    results: [],
    maxAttempts: MAX_ATTEMPTS,
    status: "playing",
    hinted: false,
  };
}

describe("computeFeedback", () => {
  it("marks an exact match all correct", () => {
    expect(computeFeedback("SIEM", "SIEM")).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("marks letters not in the word absent", () => {
    expect(computeFeedback("SIEM", "XQZW")).toEqual([
      "absent",
      "absent",
      "absent",
      "absent",
    ]);
  });

  it("marks misplaced letters present", () => {
    expect(computeFeedback("SOAR", "ARSO")).toEqual([
      "present",
      "present",
      "present",
      "present",
    ]);
  });

  it("claims exact matches before present marks (duplicate letters)", () => {
    // Target ABBEY, guess BABES: first B present (one unclaimed B left),
    // A present, third-slot B and fourth-slot E exactly placed, S absent.
    expect(computeFeedback("ABBEY", "BABES")).toEqual([
      "present",
      "present",
      "correct",
      "correct",
      "absent",
    ]);
  });

  it("only marks as many duplicates present as the target holds", () => {
    // Target has one E; guess EEEE gets exactly one mark (the correct one).
    expect(computeFeedback("SIEM", "EEEE")).toEqual([
      "absent",
      "absent",
      "correct",
      "absent",
    ]);
    // Target ERASE (two Es), guess SPEED: only two E marks total.
    expect(computeFeedback("ERASE", "SPEED")).toEqual([
      "present",
      "absent",
      "present",
      "present",
      "absent",
    ]);
  });

  it("prefers the exact match even when it appears later in the guess", () => {
    // Target ABBEY, guess KAYAK: first A present, second A absent (only one A).
    expect(computeFeedback("ABBEY", "KAYAK")).toEqual([
      "absent",
      "present",
      "present",
      "absent",
      "absent",
    ]);
  });
});

describe("keyboardStates", () => {
  it("keeps the best state per letter across guesses", () => {
    const guesses = ["ARSO", "SOAR"];
    const results = [computeFeedback("SOAR", "ARSO"), computeFeedback("SOAR", "SOAR")];
    const states = keyboardStates(guesses, results);
    expect(states.get("S")).toBe("correct");
    expect(states.get("A")).toBe("correct");
  });

  it("does not downgrade correct to present or absent", () => {
    const guesses = ["SIEM", "MIST"];
    const results = [computeFeedback("SIEM", "SIEM"), computeFeedback("SIEM", "MIST")];
    const states = keyboardStates(guesses, results);
    expect(states.get("S")).toBe("correct");
    expect(states.get("M")).toBe("correct");
    expect(states.get("T")).toBe("absent");
  });
});

describe("daily seed", () => {
  const date = new Date(Date.UTC(2026, 6, 5, 12, 0, 0));

  it("formats the UTC date key", () => {
    expect(utcDateKey(date)).toBe("2026-07-05");
    // Just before midnight UTC is still the same day; just after flips.
    expect(utcDateKey(new Date(Date.UTC(2026, 6, 5, 23, 59, 59)))).toBe("2026-07-05");
    expect(utcDateKey(new Date(Date.UTC(2026, 6, 6, 0, 0, 1)))).toBe("2026-07-06");
  });

  it("hashes deterministically", () => {
    expect(hashString("builtin-2026-07-05")).toBe(hashString("builtin-2026-07-05"));
    expect(hashString("a")).not.toBe(hashString("b"));
  });

  it("is deterministic per wordlist per day and always in range", () => {
    const a = dailyIndex("builtin", ENTRIES.length, date);
    expect(dailyIndex("builtin", ENTRIES.length, date)).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(ENTRIES.length);
  });

  it("gives independent dailies to different wordlists and days", () => {
    // With a big modulus the hashes differ; verify against raw hashes so the
    // assertion doesn't depend on a lucky modulo collision.
    expect(hashString("listA-2026-07-05")).not.toBe(hashString("listB-2026-07-05"));
    expect(hashString("listA-2026-07-05")).not.toBe(hashString("listA-2026-07-06"));
  });

  it("throws on an empty list", () => {
    expect(() => dailyIndex("builtin", 0, date)).toThrow();
    expect(() => randomIndex(0)).toThrow();
  });

  it("randomIndex respects the injected rng and stays in range", () => {
    expect(randomIndex(5, () => 0)).toBe(0);
    expect(randomIndex(5, () => 0.999999)).toBe(4);
  });
});

describe("newGame", () => {
  it("creates a daily game with the deterministic pick and date key", () => {
    const date = new Date(Date.UTC(2026, 6, 5));
    const state = newGame({ wordlistId: "builtin", entries: ENTRIES, mode: "daily", date });
    expect(state.index).toBe(dailyIndex("builtin", ENTRIES.length, date));
    expect(state.word).toBe(ENTRIES[state.index].word);
    expect(state.dateKey).toBe("2026-07-05");
    expect(state.status).toBe("playing");
  });

  it("creates a random game with no date key", () => {
    const state = newGame({
      wordlistId: "builtin",
      entries: ENTRIES,
      mode: "random",
      rng: () => 0.5,
    });
    expect(state.dateKey).toBeNull();
    expect(state.index).toBe(2);
  });
});

describe("hard mode", () => {
  async function played(word: string, guesses: string[]): Promise<GameState> {
    let state = playing(word);
    for (const guess of guesses) {
      const r = submitGuess(state, guess);
      if (!r.ok) throw new Error("expected ok");
      state = r.state;
    }
    return state;
  }

  it("allows anything on the first guess", async () => {
    expect(hardModeViolation(playing("SIEM"), "XQZW")).toBeNull();
  });

  it("requires green letters to stay in place", async () => {
    // SIEM vs MIST: I correct at position 2.
    const state = await played("SIEM", ["MIST"]);
    expect(hardModeViolation(state, "SOAR")).toBe("Letter 2 must be I");
    expect(hardModeViolation(state, "SIEM")).toBeNull();
  });

  it("requires yellow letters to be reused somewhere", async () => {
    // SOAR vs ARSO: everything is present, nothing correct.
    const state = await played("SOAR", ["ARSO"]);
    expect(hardModeViolation(state, "XXXX")).toMatch(/must contain/);
    expect(hardModeViolation(state, "SOAR")).toBeNull();
    expect(hardModeViolation(state, "RASO")).toBeNull();
  });

  it("checks hints from every previous row, counting duplicates", async () => {
    // ERASE has two Es; SPEED reveals both (present at 3 and 4).
    const state = await played("ERASE", ["SPEED"]);
    expect(hardModeViolation(state, "SEIZE")).toBeNull();
    // Only one E — violates the two revealed Es.
    expect(hardModeViolation(state, "SABER")).toBe("Guess must contain E");
  });

  it("newGame honors a forced index for challenge links", () => {
    const state = newGame({
      wordlistId: "builtin",
      entries: ENTRIES,
      mode: "random",
      forcedIndex: 3,
    });
    expect(state.index).toBe(3);
    expect(state.word).toBe(ENTRIES[3].word);
    // Out-of-range forces fall back to a normal pick.
    const fallback = newGame({
      wordlistId: "builtin",
      entries: ENTRIES,
      mode: "random",
      rng: () => 0,
      forcedIndex: 99,
    });
    expect(fallback.index).toBe(0);
  });
});

describe("submitGuess", () => {
  it("rejects wrong length and invalid characters", () => {
    const state = playing("SIEM");
    expect(submitGuess(state, "SI")).toEqual({ ok: false, error: "wrong-length" });
    expect(submitGuess(state, "SI-M")).toEqual({ ok: false, error: "invalid-chars" });
  });

  it("accepts digits (acronyms like S3 exist)", () => {
    expect(isValidGuess("AB3C", 4)).toBe(true);
  });

  it("wins on a correct guess and stops accepting input", () => {
    const state = playing("SIEM");
    const result = submitGuess(state, "siem");
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.status).toBe("won");
    expect(result.state.guesses).toEqual(["SIEM"]);
    expect(submitGuess(result.state, "SIEM")).toEqual({ ok: false, error: "game-over" });
  });

  it("loses after max attempts and records all feedback rows", () => {
    let state = playing("SIEM");
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      const result = submitGuess(state, "MIST");
      if (!result.ok) throw new Error("expected ok");
      state = result.state;
    }
    expect(state.status).toBe("lost");
    expect(state.guesses).toHaveLength(MAX_ATTEMPTS);
    expect(state.results).toHaveLength(MAX_ATTEMPTS);
  });

  it("does not mutate the previous state", () => {
    const state = playing("SIEM");
    submitGuess(state, "MIST");
    expect(state.guesses).toEqual([]);
    expect(state.status).toBe("playing");
  });
});

describe("stats", () => {
  function wonState(attempts: number, hinted = false): GameState {
    let state = playing("SIEM");
    for (let i = 0; i < attempts - 1; i += 1) {
      const r = submitGuess(state, "MIST");
      if (!r.ok) throw new Error("expected ok");
      state = r.state;
    }
    const r = submitGuess(state, "SIEM");
    if (!r.ok) throw new Error("expected ok");
    return { ...r.state, hinted };
  }

  it("scores by attempt row", () => {
    expect(applyWin(createInitialStats(), wonState(1)).score).toBe(100);
    expect(applyWin(createInitialStats(), wonState(6)).score).toBe(10);
  });

  it("applies the hint penalty without going negative", () => {
    expect(applyWin(createInitialStats(), wonState(1, true)).score).toBe(80);
    expect(applyWin(createInitialStats(), wonState(6, true)).score).toBe(0);
  });

  it("tracks streaks and best across wins and losses", () => {
    let stats = createInitialStats();
    const win = { ...wonState(2), mode: "random" as const, dateKey: null };
    stats = applyWin(stats, win);
    stats = applyWin(stats, win);
    expect(stats.streak).toBe(2);
    expect(stats.best).toBe(2);
    stats = applyLoss(stats, { ...win, status: "lost" });
    expect(stats.streak).toBe(0);
    expect(stats.best).toBe(2);
    expect(stats.played).toBe(3);
    expect(stats.won).toBe(2);
  });

  it("counts a given daily only once per wordlist per day", () => {
    let stats = createInitialStats();
    const win = wonState(1);
    stats = applyWin(stats, win);
    const again = applyWin(stats, win);
    expect(again).toEqual(stats);
    // Same day, different wordlist still counts.
    const other = applyWin(stats, { ...win, wordlistId: "custom" });
    expect(other.played).toBe(2);
  });

  describe("mergeStats", () => {
    const base = createInitialStats();

    it("never loses progress when played counts are equal but fields diverge", () => {
      // The failure mode from the audit: two sessions, same played count,
      // different score/wins/streaks — a played-only comparison would let one
      // side clobber the other.
      const device = { ...base, played: 5, won: 4, streak: 2, best: 3, score: 320 };
      const cloud = { ...base, played: 5, won: 5, streak: 5, best: 5, score: 410 };
      const merged = mergeStats(device, cloud);
      expect(merged).toEqual({ ...base, played: 5, won: 5, streak: 5, best: 5, score: 410 });
    });

    it("is order-independent (both devices converge)", () => {
      const a = { ...base, played: 8, won: 6, streak: 0, best: 4, score: 500 };
      const b = { ...base, played: 7, won: 7, streak: 7, best: 7, score: 480 };
      expect(mergeStats(a, b)).toEqual(mergeStats(b, a));
    });

    it("keeps the later daily key so a synced daily is not double-counted", () => {
      const a = { ...base, lastDailyKey: "builtin-2026-07-10" };
      const b = { ...base, lastDailyKey: "builtin-2026-07-12" };
      expect(mergeStats(a, b).lastDailyKey).toBe("builtin-2026-07-12");
      expect(mergeStats(b, a).lastDailyKey).toBe("builtin-2026-07-12");
      expect(mergeStats(a, { ...base, lastDailyKey: null }).lastDailyKey).toBe(
        "builtin-2026-07-10",
      );
    });
  });
});

describe("share", () => {
  it("renders the emoji grid", () => {
    expect(
      shareGrid([
        ["correct", "present", "absent"],
        ["correct", "correct", "correct"],
      ]),
    ).toBe("🟩🟨⬛\n🟩🟩🟩");
  });

  it("builds a share text for a win", () => {
    const state = playing("SIEM");
    const r = submitGuess(state, "SIEM");
    if (!r.ok) throw new Error("expected ok");
    const text = shareText({
      title: "Qwizzle",
      state: r.state,
      stats: applyWin(createInitialStats(), r.state),
      url: "https://qwizzle.4dl.ca",
    });
    expect(text).toContain("Qwizzle 2026-07-05 1/6");
    expect(text).toContain("Solved in 1 try");
    expect(text).toContain("🟩🟩🟩🟩");
    expect(text).toContain("https://qwizzle.4dl.ca");
  });

  it("builds a share text for a loss with X and the answer", () => {
    let state: GameState = { ...playing("SIEM"), mode: "random", dateKey: null, index: 4 };
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      const r = submitGuess(state, "MIST");
      if (!r.ok) throw new Error("expected ok");
      state = r.state;
    }
    const text = shareText({
      title: "Qwizzle: Cyber Edition",
      state,
      stats: applyLoss(createInitialStats(), state),
      url: "https://qwizzle.4dl.ca",
    });
    expect(text).toContain("Qwizzle: Cyber Edition #5 X/6");
    expect(text).toContain("answer: SIEM");
  });

  it("returns empty while the game is in progress", () => {
    const text = shareText({
      title: "Qwizzle",
      state: playing("SIEM"),
      stats: createInitialStats(),
      url: "https://example.com",
    });
    expect(text).toBe("");
  });
});
