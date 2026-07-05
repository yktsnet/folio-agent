import { describe, expect, it } from "vitest";
import { createUrlMatcher } from "../../src/ingest/glob.js";

describe("createUrlMatcher", () => {
  it("includes matching paths", () => {
    const matches = createUrlMatcher({ include: ["/", "/works/**", "/about"] });
    expect(matches("/")).toBe(true);
    expect(matches("/works/foo")).toBe(true);
    expect(matches("/about")).toBe(true);
    expect(matches("/contact")).toBe(false);
  });

  it("excludes paths even if included", () => {
    const matches = createUrlMatcher({
      include: ["/works/**"],
      exclude: ["/works/draft-*"],
    });
    expect(matches("/works/order-system-rag")).toBe(true);
    expect(matches("/works/draft-foo")).toBe(false);
  });
});
