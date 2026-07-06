import { describe, expect, it } from "vitest";
import { isValidHexColor, parseIncludeList } from "../../src/init/questions.js";

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
