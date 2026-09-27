import { describe, expect, it, vi } from "vitest";
import { findAnswerFormatViolations } from "../../src/chat/answer/contract.js";
import { buildChatGraph } from "../../src/chat/graph.js";
import type { ChatGraphDeps } from "../../src/chat/types.js";

const RATE_LIMIT_CONFIG = { shortWindowMinutes: 10, shortWindowMax: 6, longWindowHours: 12, longWindowMax: 12 };

function makeDeps(overrides: Partial<ChatGraphDeps> = {}): ChatGraphDeps {
  return {
    checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    generateAnswer: vi.fn().mockResolvedValue("generated answer"),
    logChat: vi.fn().mockResolvedValue(undefined),
    rateLimitConfig: RATE_LIMIT_CONFIG,
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
    expect(deps.generateAnswer).toHaveBeenCalledWith("Worksについて教えて", "works", undefined);
    expect(deps.logChat).toHaveBeenCalledWith({
      ip: "1.2.3.4",
      route: "works",
      message: "Worksについて教えて",
      response: "generated answer",
      overLimit: false,
    });
  });

  it("returns a compliant answer as is, generating only once", async () => {
    const deps = makeDeps({ logAnswerViolation: vi.fn() });
    const graph = buildChatGraph(deps);

    const result = await graph.invoke({ input: "Worksについて教えて", ip: "1.2.3.4" });

    expect(result.answer).toBe("generated answer");
    expect(deps.generateAnswer).toHaveBeenCalledTimes(1);
    expect(deps.logAnswerViolation).not.toHaveBeenCalled();
  });

  it("points out a format violation and has the model correct it once", async () => {
    const generateAnswer = vi
      .fn()
      .mockResolvedValueOnce("詳細は [Works](/) にあります。")
      .mockResolvedValueOnce("詳細は Works ページにあります。");
    const deps = makeDeps({ generateAnswer, logAnswerViolation: vi.fn().mockResolvedValue(undefined) });
    const graph = buildChatGraph(deps);

    const result = await graph.invoke({ input: "Worksについて教えて", ip: "1.2.3.4" });

    expect(result.answer).toBe("詳細は Works ページにあります。");
    expect(generateAnswer).toHaveBeenCalledTimes(2);
    const correction = generateAnswer.mock.calls[1][2];
    expect(correction.previousAnswer).toBe("詳細は [Works](/) にあります。");
    expect(correction.request).toContain("[Works](/)");
    expect(deps.logAnswerViolation).toHaveBeenCalledWith({
      route: "works",
      attempt: 1,
      kinds: ["disallowed_link"],
      answer: "詳細は [Works](/) にあります。",
    });
    expect(deps.logChat).toHaveBeenCalledWith(expect.objectContaining({ response: "詳細は Works ページにあります。" }));
  });

  it("falls back to plain text when the corrected answer still breaks the format, without asking a third time", async () => {
    const generateAnswer = vi.fn().mockResolvedValue("**実績**は[About](https://example.com/about)です");
    const deps = makeDeps({
      generateAnswer,
      logAnswerViolation: vi.fn().mockResolvedValue(undefined),
      answerLinks: [{ url: "https://zenn.dev/foo/a", title: "記事" }],
    });
    const graph = buildChatGraph(deps);

    const result = await graph.invoke({ input: "Worksについて教えて", ip: "1.2.3.4" });

    expect(generateAnswer).toHaveBeenCalledTimes(2);
    expect(result.answer).toBe("実績はAboutです");
    expect(findAnswerFormatViolations(result.answer, deps.answerLinks!)).toEqual([]);
    expect(vi.mocked(deps.logAnswerViolation!).mock.calls.map(([entry]) => entry.attempt)).toEqual([1, 2]);
    expect(deps.logChat).toHaveBeenCalledWith(expect.objectContaining({ response: "実績はAboutです" }));
  });

  it("still answers when recording a violation fails", async () => {
    const deps = makeDeps({
      generateAnswer: vi.fn().mockResolvedValueOnce("[Works](/)").mockResolvedValueOnce("Works ページです"),
      logAnswerViolation: vi.fn().mockRejectedValue(new Error("no such table: answer_violations")),
    });
    const graph = buildChatGraph(deps);

    const result = await graph.invoke({ input: "Worksについて教えて", ip: "1.2.3.4" });

    expect(result.answer).toBe("Works ページです");
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
    const deps = makeDeps({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: false, reason: "long_window" }) });
    const graph = buildChatGraph(deps);

    const result = await graph.invoke({ input: "hi", ip: "1.2.3.4" });

    expect(result.overLimit).toBe(true);
    expect(result.answer).toMatch(/12時間に12件/);
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
      expect(deps.generateAnswer).toHaveBeenCalledWith("I'd like to hire you", "inquiry", undefined);
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
        checkRateLimit: vi.fn().mockResolvedValue({ allowed: false, reason: "long_window" }),
      });
      const graph = buildChatGraph(deps);

      const result = await graph.invoke({ input: "hi", ip: "1.2.3.4" });

      expect(result.overLimit).toBe(true);
      expect(result.answer).toMatch(/12 questions per 12 hours/);
      expect(deps.generateAnswer).not.toHaveBeenCalled();
    });
  });
});
