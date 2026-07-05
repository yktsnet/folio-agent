import { describe, expect, it } from "vitest";
import { estimateTokens } from "../../src/ingest/token-count.js";

describe("estimateTokens", () => {
  it("estimates roughly 1 token per 4 characters", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });

  it("rounds up for partial tokens", () => {
    expect(estimateTokens("abc")).toBe(1);
  });
});
