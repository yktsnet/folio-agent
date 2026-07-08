import { describe, expect, it, vi } from "vitest";
import { createChatHandler } from "../../src/chat/handler.js";
import { createFakeD1 } from "./fake-d1.js";

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("createChatHandler", () => {
  it("returns a generated answer for a valid message", async () => {
    const handle = createChatHandler({
      db: createFakeD1(),
      generateAnswer: vi.fn().mockResolvedValue("hello there"),
    });

    const response = await handle(request({ message: "Worksについて教えて" }, { "CF-Connecting-IP": "1.2.3.4" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ answer: "hello there", route: "works" });
  });

  it("rejects an empty message with 400", async () => {
    const handle = createChatHandler({ db: createFakeD1(), generateAnswer: vi.fn() });

    const response = await handle(request({ message: "   " }));

    expect(response.status).toBe(400);
  });

  it("rejects a non-JSON body with 400", async () => {
    const handle = createChatHandler({ db: createFakeD1(), generateAnswer: vi.fn() });

    const response = await handle(
      new Request("https://example.com/api/chat", { method: "POST", body: "not json" }),
    );

    expect(response.status).toBe(400);
  });

  it("enforces the rate limit across requests from the same IP", async () => {
    const db = createFakeD1();
    const handle = createChatHandler({
      db,
      generateAnswer: vi.fn().mockResolvedValue("ok"),
      rateLimitConfig: { shortWindowMinutes: 10, shortWindowMax: 1, longWindowHours: 12, longWindowMax: 10 },
    });

    const first = await handle(request({ message: "hi" }, { "CF-Connecting-IP": "9.9.9.9" }));
    const second = await handle(request({ message: "hi again" }, { "CF-Connecting-IP": "9.9.9.9" }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { route: string; answer: string };
    expect(secondBody.route).toBe("rate_limited");
    expect(secondBody.answer).toMatch(/上限/);
  });
});
