import { describe, expect, it } from "vitest";
import {
  InitArgsError,
  isValidHexColor,
  normalizeZennBaseUrl,
  parseIncludeList,
  resolveInitRun,
  THEME_PRESETS,
} from "../../src/init/options.js";
import type { IngestConfig } from "../../src/ingest/types.js";

const THEME = { accent: "#2563eb", surface: "#ffffff", text: "#111827" };
const ZENN = { articlesDir: "../zenn/articles", baseUrl: "https://zenn.dev/foo/articles" };

function run(argv: string[], previous?: IngestConfig, env: Record<string, string | undefined> = {}) {
  const result = resolveInitRun(argv, previous, env);
  if (!result) throw new Error("expected a run, got help");
  return result;
}

describe("resolveInitRun", () => {
  it("uses defaults for a fresh setup with no arguments", () => {
    expect(run([])).toEqual({
      dryRun: false,
      answers: {
        language: "ja",
        distDir: "dist",
        include: ["/**"],
        zenn: undefined,
        contactUrl: undefined,
        theme: undefined,
        geminiApiKey: undefined,
        apiRoutePath: "functions/api/chat.ts",
      },
    });
  });

  it("returns undefined for --help", () => {
    expect(resolveInitRun(["--help"], undefined, {})).toBeUndefined();
    expect(resolveInitRun(["-h"], undefined, {})).toBeUndefined();
  });

  it("keeps every previous value that isn't passed, and skips the API route on a re-run", () => {
    const previous: IngestConfig = { distDir: "out", include: ["/", "/works/**"], language: "en", theme: THEME, zenn: ZENN };
    const { answers } = run([], previous);
    expect(answers).toMatchObject({ language: "en", distDir: "out", include: ["/", "/works/**"], theme: THEME, zenn: ZENN });
    expect(answers.apiRoutePath).toBeUndefined();
  });

  it("overrides only the values that are passed", () => {
    const previous: IngestConfig = { distDir: "out", include: ["/**"], language: "ja", theme: THEME };
    const { answers } = run(["--lang", "en", "--include", "/, /about"], previous);
    expect(answers).toMatchObject({ language: "en", distDir: "out", include: ["/", "/about"], theme: THEME });
  });

  it("takes the Gemini API key only from GEMINI_API_KEY", () => {
    expect(run([], undefined, { GEMINI_API_KEY: " abc123 " }).answers.geminiApiKey).toBe("abc123");
    expect(run([], undefined, { GEMINI_API_KEY: "" }).answers.geminiApiKey).toBeUndefined();
  });

  it("sets dryRun with --dry-run", () => {
    expect(run(["--dry-run"]).dryRun).toBe(true);
  });

  describe("theme", () => {
    it("--theme auto drops a previous theme", () => {
      expect(run(["--theme", "auto"], { distDir: "dist", include: ["/**"], theme: THEME }).answers.theme).toBeUndefined();
    });

    it("--theme poimandres uses the preset colors", () => {
      expect(run(["--theme", "poimandres"]).answers.theme).toEqual(THEME_PRESETS.poimandres);
    });

    it("color flags imply --theme custom, and missing colors fall back to the previous theme", () => {
      expect(run(["--accent", "#d0679d"], { distDir: "dist", include: ["/**"], theme: THEME }).answers.theme).toEqual({
        ...THEME,
        accent: "#d0679d",
      });
    });

    it("--theme custom needs all three colors on a fresh setup", () => {
      expect(() => run(["--theme", "custom", "--accent", "#fff"])).toThrow(InitArgsError);
    });

    it("rejects invalid hex colors, unknown presets, and colors with a non-custom preset", () => {
      expect(() => run(["--accent", "red", "--surface", "#fff", "--text", "#000"])).toThrow(/hex color/);
      expect(() => run(["--theme", "dracula"])).toThrow(/auto, poimandres or custom/);
      expect(() => run(["--theme", "poimandres", "--accent", "#fff"])).toThrow(/only apply to --theme custom/);
    });
  });

  describe("zenn", () => {
    it("needs both --zenn-dir and --zenn-user on a fresh setup, and expands a bare username", () => {
      expect(run(["--zenn-dir", "../zenn/articles", "--zenn-user", "foo"]).answers.zenn).toEqual(ZENN);
      expect(() => run(["--zenn-dir", "../zenn/articles"])).toThrow(/both --zenn-dir and --zenn-user/);
    });

    it("updates one side from the previous config, and --no-zenn removes it", () => {
      const previous: IngestConfig = { distDir: "dist", include: ["/**"], zenn: ZENN };
      expect(run(["--zenn-dir", "../other"], previous).answers.zenn).toEqual({ ...ZENN, articlesDir: "../other" });
      expect(run(["--no-zenn"], previous).answers.zenn).toBeUndefined();
    });
  });

  describe("api route", () => {
    it("--api-route generates at the given path even on a re-run, and --no-api-route skips it", () => {
      const previous: IngestConfig = { distDir: "dist", include: ["/**"] };
      expect(run(["--api-route", "functions/chat.ts"], previous).answers.apiRoutePath).toBe("functions/chat.ts");
      expect(run(["--no-api-route"]).answers.apiRoutePath).toBeUndefined();
      expect(() => run(["--api-route", "a.ts", "--no-api-route"])).toThrow(InitArgsError);
    });
  });

  it("rejects unknown flags, positionals, and an unsupported language", () => {
    expect(() => run(["--color", "#fff"])).toThrow(InitArgsError);
    expect(() => run(["extra"])).toThrow(InitArgsError);
    expect(() => run(["--lang", "fr"])).toThrow(/--lang/);
  });
});

describe("isValidHexColor", () => {
  it("accepts 3- and 6-digit hex colors with #", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#2563EB")).toBe(true);
    expect(isValidHexColor("  #2563eb  ")).toBe(true);
  });

  it("rejects values without # or with invalid characters/length", () => {
    expect(isValidHexColor("2563eb")).toBe(false);
    expect(isValidHexColor("#25g3eb")).toBe(false);
    expect(isValidHexColor("#12345")).toBe(false);
  });
});

describe("parseIncludeList", () => {
  it("splits a comma-separated glob list, trims, and drops empty entries", () => {
    expect(parseIncludeList("/, /works/**,  /about ,,")).toEqual(["/", "/works/**", "/about"]);
  });
});

describe("normalizeZennBaseUrl", () => {
  it("expands a bare username and passes a full URL through", () => {
    expect(normalizeZennBaseUrl("  yktsnet ")).toBe("https://zenn.dev/yktsnet/articles");
    expect(normalizeZennBaseUrl("https://zenn.dev/foo/articles")).toBe("https://zenn.dev/foo/articles");
  });
});
