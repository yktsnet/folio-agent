import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { createGeminiGenerator } = await import("../../src/chat/gemini.js");

beforeEach(() => {
  generateContent.mockReset().mockResolvedValue({ text: "answer" });
});

describe("createGeminiGenerator", () => {
  it("sends the visitor's message alone on the first attempt", async () => {
    const generate = createGeminiGenerator({ apiKey: "k", knowledge: "K" });
    await generate("質問", "works");
    expect(generateContent.mock.calls[0][0].contents).toBe("質問");
  });

  it("sends the question, the previous answer and the correction request as a conversation when correcting", async () => {
    const generate = createGeminiGenerator({ apiKey: "k", knowledge: "K" });
    await generate("質問", "works", { previousAnswer: "[Works](/)", request: "直してください" });
    expect(generateContent.mock.calls[0][0].contents).toEqual([
      { role: "user", parts: [{ text: "質問" }] },
      { role: "model", parts: [{ text: "[Works](/)" }] },
      { role: "user", parts: [{ text: "直してください" }] },
    ]);
  });
});
