import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../../src/chat/rate-limit.js";
import { logChat } from "../../src/chat/log.js";
import { createFakeD1 } from "./fake-d1.js";

const CONFIG = { shortWindowMinutes: 10, shortWindowMax: 6, longWindowHours: 12, longWindowMax: 12 };

describe("checkRateLimit", () => {
  it("allows requests under both limits", async () => {
    const db = createFakeD1();
    const now = new Date("2026-07-05T12:00:00.000Z");

    const result = await checkRateLimit(db, "1.2.3.4", now, CONFIG);

    expect(result).toEqual({ allowed: true });
  });

  it("blocks once the short window max is reached", async () => {
    const db = createFakeD1();
    const now = new Date("2026-07-05T12:00:00.000Z");

    for (let i = 0; i < 6; i++) {
      await logChat(
        db,
        { ip: "1.2.3.4", route: "thoughts", message: "hi", response: "hello", overLimit: false },
        now,
      );
    }

    const result = await checkRateLimit(db, "1.2.3.4", now, CONFIG);

    expect(result).toEqual({ allowed: false, reason: "short_window" });
  });

  it("blocks once the long window max is reached even if outside the short window", async () => {
    const db = createFakeD1();
    const now = new Date("2026-07-05T12:00:00.000Z");
    const oneHourAgo = new Date(now.getTime() - 60 * 60_000);

    for (let i = 0; i < 12; i++) {
      await logChat(
        db,
        { ip: "1.2.3.4", route: "thoughts", message: "hi", response: "hello", overLimit: false },
        oneHourAgo,
      );
    }

    const result = await checkRateLimit(db, "1.2.3.4", now, CONFIG);

    expect(result).toEqual({ allowed: false, reason: "long_window" });
  });

  it("does not count logged rate-limited attempts towards the limit", async () => {
    const db = createFakeD1();
    const now = new Date("2026-07-05T12:00:00.000Z");

    await logChat(
      db,
      { ip: "1.2.3.4", route: "rate_limited", message: "hi", response: "over limit", overLimit: true },
      now,
    );

    const result = await checkRateLimit(db, "1.2.3.4", now, CONFIG);

    expect(result).toEqual({ allowed: true });
  });

  it("tracks each IP independently", async () => {
    const db = createFakeD1();
    const now = new Date("2026-07-05T12:00:00.000Z");

    for (let i = 0; i < 6; i++) {
      await logChat(
        db,
        { ip: "1.2.3.4", route: "thoughts", message: "hi", response: "hello", overLimit: false },
        now,
      );
    }

    const result = await checkRateLimit(db, "5.6.7.8", now, CONFIG);

    expect(result).toEqual({ allowed: true });
  });
});
