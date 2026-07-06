import { describe, expect, it } from "vitest";
import { classifyRoute } from "../../src/chat/route.js";

describe("classifyRoute", () => {
  it("routes inquiry-shaped messages to inquiry", () => {
    expect(classifyRoute("お仕事の依頼をしたいのですが")).toBe("inquiry");
    expect(classifyRoute("見積もりをお願いできますか")).toBe("inquiry");
  });

  it("routes works-shaped messages to works", () => {
    expect(classifyRoute("Worksについて教えてください")).toBe("works");
    expect(classifyRoute("order-system-ragの実績を教えて")).toBe("works");
  });

  it("defaults to thoughts", () => {
    expect(classifyRoute("あなたの考え方を教えてください")).toBe("thoughts");
  });

  describe("language: en", () => {
    it("routes inquiry-shaped messages to inquiry", () => {
      expect(classifyRoute("I'd like to hire you", "en")).toBe("inquiry");
      expect(classifyRoute("Could I get a quote for a project?", "en")).toBe("inquiry");
    });

    it("routes works-shaped messages to works", () => {
      expect(classifyRoute("Tell me about your works", "en")).toBe("works");
      expect(classifyRoute("Can you show me your portfolio?", "en")).toBe("works");
    });

    it("defaults to thoughts", () => {
      expect(classifyRoute("What do you think about good design?", "en")).toBe("thoughts");
    });
  });
});
