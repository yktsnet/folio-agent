import { describe, expect, it } from "vitest";
import { fileToUrlPath } from "../../src/ingest/file-to-url.js";

describe("fileToUrlPath", () => {
  it("maps root index to /", () => {
    expect(fileToUrlPath("index.html")).toBe("/");
  });

  it("maps nested index to its directory", () => {
    expect(fileToUrlPath("works/foo/index.html")).toBe("/works/foo");
  });

  it("maps a plain page to its path", () => {
    expect(fileToUrlPath("about.html")).toBe("/about");
  });

  it("does not falsely strip filenames ending in 'index'", () => {
    expect(fileToUrlPath("myindex.html")).toBe("/myindex");
  });

  it("maps markdown files the same way", () => {
    expect(fileToUrlPath("works/order-system-rag.md")).toBe("/works/order-system-rag");
  });
});
