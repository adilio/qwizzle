import { describe, expect, it } from "vitest";
import { computeFeedback, newGame, submitGuess } from "../../apps/web/src/engine";

describe("engine edge cases", () => {
  it("handles repeated letters correctly", () => {
    const feedback = computeFeedback("FLOOR", "ROBOT").map((cell) => cell.mark);
    expect(feedback).toEqual(["absent", "absent", "present", "correct", "present"]);
  });

  it("throws on wrong-length guess", () => {
    const game = newGame("HELLO", 6);
    expect(() => submitGuess(game, "HI")).toThrowError("WRONG_LENGTH");
  });
});
