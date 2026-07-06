import { describe, expect, it } from "vitest";
import { defaultApiRoutePath, isValidHexColor, normalizeZennBaseUrl, parseIncludeList } from "../../src/init/questions.js";

describe("isValidHexColor", () => {
  it("accepts 3- and 6-digit hex colors with #", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#ffffff")).toBe(true);
    expect(isValidHexColor("#2563EB")).toBe(true);
    expect(isValidHexColor("  #2563eb  ")).toBe(true);
  });

  it("rejects values without # or with invalid characters/length", () => {
    expect(isValidHexColor("2563eb")).toBe(false);
    expect(isValidHexColor("#25g3eb")).toBe(false);
    expect(isValidHexColor("#12345")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("parseIncludeList", () => {
  it("splits a comma-separated glob list and trims whitespace", () => {
    expect(parseIncludeList("/, /works/**,  /about ")).toEqual(["/", "/works/**", "/about"]);
  });

  it("drops empty entries", () => {
    expect(parseIncludeList("/**,,")).toEqual(["/**"]);
  });

  it("returns a single-item array for a single glob", () => {
    expect(parseIncludeList("/**")).toEqual(["/**"]);
  });
});

describe("normalizeZennBaseUrl", () => {
  it("expands a bare username into the canonical Zenn articles URL", () => {
    expect(normalizeZennBaseUrl("yktsnet")).toBe("https://zenn.dev/yktsnet/articles");
  });

  it("trims whitespace before expanding a bare username", () => {
    expect(normalizeZennBaseUrl("  yktsnet  ")).toBe("https://zenn.dev/yktsnet/articles");
  });

  it("passes an already-qualified http(s) URL through unchanged (trimmed)", () => {
    expect(normalizeZennBaseUrl("https://zenn.dev/foo/articles")).toBe("https://zenn.dev/foo/articles");
    expect(normalizeZennBaseUrl("  http://example.com/articles  ")).toBe("http://example.com/articles");
  });
});

describe("defaultApiRoutePath", () => {
  it("defaults to the scaffold path for a fresh setup (no previous config)", () => {
    expect(defaultApiRoutePath(false)).toBe("functions/api/chat.ts");
  });

  it("defaults to undefined (don't generate) when a previous config exists", () => {
    expect(defaultApiRoutePath(true)).toBeUndefined();
  });
});
