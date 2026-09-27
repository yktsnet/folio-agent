import { describe, expect, it } from "vitest";
import { buildCorrectionRequest } from "../../../src/chat/prompt/correction.js";

const VIOLATIONS = [
  { kind: "disallowed_link" as const, excerpt: "[Works](/)" },
  { kind: "bare_url" as const, excerpt: "https://zenn.dev/foo/a" },
  { kind: "markdown" as const, excerpt: "**実績**" },
];

describe("buildCorrectionRequest", () => {
  it("asks to keep the content and quotes each violation with what to do about it", () => {
    const request = buildCorrectionRequest(VIOLATIONS, "ja");
    expect(request).toContain("内容は変えずに");
    expect(request).toContain("ページ名で案内し");
    expect(request).toContain(": [Works](/)");
    expect(request).toContain(": https://zenn.dev/foo/a");
    expect(request).toContain(": **実績**");
  });

  it("writes the request in English with language en, without Japanese wording", () => {
    const request = buildCorrectionRequest(VIOLATIONS, "en");
    expect(request).toContain("Keep the content");
    expect(request).not.toMatch(/[ぁ-んァ-ヶ]/);
  });
});
