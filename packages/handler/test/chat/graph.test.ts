import { describe, expect, it, vi } from "vitest";
import { buildChatGraph } from "../../src/chat/graph.js";
import type { ChatGraphDeps } from "../../src/chat/types.js";

function makeDeps(overrides: Partial<ChatGraphDeps> = {}): ChatGraphDeps {
  return {
    checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    generateAnswer: vi.fn().mockResolvedValue("generated answer"),
    logChat: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("buildChatGraph", () => {
  it("routes, generates, and logs when under the rate limit", async () => {
    const deps = makeDeps();
    const graph = buildChatGraph(deps);

    const result = await graph.invoke({ input: "Worksについて教えて", ip: "1.2.3.4" });

    expect(result.route).toBe("works");
    expect(result.answer).toBe("generated answer");
    expect(deps.generateAnswer).toHaveBeenCalledWith("Worksについて教えて", "works");
    expect(deps.logChat).toHaveBeenCalledWith({
      ip: "1.2.3.4",
      route: "works",
      message: "Worksについて教えて",
      response: "generated answer",
      overLimit: false,
    });
  });

  it("falls back to a canned answer (never a raw error) when generation fails", async () => {
    const deps = makeDeps({ generateAnswer: vi.fn().mockRejectedValue(new Error("RESOURCE_EXHAUSTED")) });
    const graph = buildChatGraph(deps);

    const result = await graph.invoke({ input: "Worksについて教えて", ip: "1.2.3.4" });

    expect(result.answer).toMatch(/上限に達したか、一時的な不具合/);
    expect(deps.logChat).toHaveBeenCalledWith(
      expect.objectContaining({ response: expect.stringMatching(/上限に達したか/) }),
    );
  });

  it("short-circuits to a canned answer and skips generation when rate-limited", async () => {
    const deps = makeDeps({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: false, reason: "daily" }) });
    const graph = buildChatGraph(deps);

    const result = await graph.invoke({ input: "hi", ip: "1.2.3.4" });

    expect(result.overLimit).toBe(true);
    expect(result.answer).toMatch(/本日の上限/);
    expect(deps.generateAnswer).not.toHaveBeenCalled();
    expect(deps.logChat).toHaveBeenCalledWith(
      expect.objectContaining({ route: "rate_limited", overLimit: true }),
    );
  });

  describe("language: en", () => {
    it("routes an English message to inquiry and generates in English mode", async () => {
      const deps = makeDeps({ language: "en" });
      const graph = buildChatGraph(deps);

      const result = await graph.invoke({ input: "I'd like to hire you", ip: "1.2.3.4" });

      expect(result.route).toBe("inquiry");
      expect(deps.generateAnswer).toHaveBeenCalledWith("I'd like to hire you", "inquiry");
    });

    it("falls back to an English canned answer when generation fails", async () => {
      const deps = makeDeps({
        language: "en",
        generateAnswer: vi.fn().mockRejectedValue(new Error("RESOURCE_EXHAUSTED")),
      });
      const graph = buildChatGraph(deps);

      const result = await graph.invoke({ input: "tell me about your works", ip: "1.2.3.4" });

      expect(result.answer).toMatch(/today's limit/);
    });

    it("short-circuits to an English canned answer when rate-limited", async () => {
      const deps = makeDeps({
        language: "en",
        checkRateLimit: vi.fn().mockResolvedValue({ allowed: false, reason: "daily" }),
      });
      const graph = buildChatGraph(deps);

      const result = await graph.invoke({ input: "hi", ip: "1.2.3.4" });

      expect(result.overLimit).toBe(true);
      expect(result.answer).toMatch(/today's limit/);
      expect(deps.generateAnswer).not.toHaveBeenCalled();
    });
  });
});
