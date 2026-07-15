import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as clack from "@clack/prompts";
import { buildApiRouteTemplate, buildThemeCss } from "../../src/init/writers.js";
import type { IngestConfig } from "../../src/ingest/types.js";
import { main, planDevVarsAndGitignore } from "../../src/init/cli.js";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  isCancel: vi.fn(() => false),
  select: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
  password: vi.fn(),
}));

const THEME = { accent: "#2563eb", surface: "#ffffff", text: "#111827" };

/** Queues the wizard answers a full run (no zenn) asks for, in the exact order `runWizard` calls them. */
function stubWizardAnswers(overrides: {
  contactUrl?: string;
  geminiApiKey?: string;
  apiRoutePath?: string;
}): void {
  vi.mocked(clack.select).mockResolvedValueOnce("ja");
  vi.mocked(clack.text)
    .mockResolvedValueOnce("dist") // distDir
    .mockResolvedValueOnce("/**") // include
    .mockResolvedValueOnce(overrides.contactUrl ?? "") // contactUrl
    .mockResolvedValueOnce(THEME.accent) // accent
    .mockResolvedValueOnce(THEME.surface) // surface
    .mockResolvedValueOnce(THEME.text) // text
    .mockResolvedValueOnce(overrides.apiRoutePath ?? "functions/api/chat.ts"); // apiRoutePath
  vi.mocked(clack.confirm)
    .mockResolvedValueOnce(false) // wantsZenn
    .mockResolvedValueOnce(true); // shouldWrite (confirm before writing)
  vi.mocked(clack.password).mockResolvedValueOnce(overrides.geminiApiKey ?? "");
}

describe("folio-agent-init main (E2E)", () => {
  let root: string;
  let originalCwd: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "folio-agent-init-cli-"));
    originalCwd = process.cwd();
    process.chdir(root);
    vi.clearAllMocks();
    vi.mocked(clack.isCancel).mockReturnValue(false);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  });

  it("writes config json, theme css, API route scaffold, .dev.vars and .gitignore for a fresh setup", async () => {
    stubWizardAnswers({ geminiApiKey: "abc123" });

    await main();

    const config = JSON.parse(await readFile("folio-agent.config.json", "utf-8"));
    expect(config).toEqual({
      distDir: "dist",
      include: ["/**"],
      language: "ja",
      theme: THEME,
    });

    const themeCss = await readFile("folio-agent.theme.css", "utf-8");
    expect(themeCss).toBe(buildThemeCss(THEME));

    const apiRoute = await readFile("functions/api/chat.ts", "utf-8");
    expect(apiRoute).toBe(
      buildApiRouteTemplate({ apiRoutePath: "functions/api/chat.ts", distDir: "dist", language: "ja" }),
    );

    const devVars = await readFile(".dev.vars", "utf-8");
    expect(devVars).toBe("GEMINI_API_KEY=abc123\n");

    const gitignore = await readFile(".gitignore", "utf-8");
    expect(gitignore).toBe(".dev.vars\n");

    const pkg = JSON.parse(await readFile("package.json", "utf-8"));
    expect(pkg.scripts.build).toBe("folio-agent-ingest folio-agent.config.json dist/knowledge.json");
  });

  it("preserves fields the wizard doesn't ask about from an existing config, and skips the API route scaffold when unanswered", async () => {
    const previous: IngestConfig = {
      distDir: "old-dist",
      include: ["/old/**"],
      exclude: ["/old/draft-*"],
      knowledgeDir: "knowledge",
      tokenWarningThreshold: 50000,
      language: "ja",
      theme: THEME,
    };
    await writeFile("folio-agent.config.json", JSON.stringify(previous, null, 2));

    stubWizardAnswers({ apiRoutePath: "" });

    await main();

    const config = JSON.parse(await readFile("folio-agent.config.json", "utf-8"));
    expect(config).toEqual({
      distDir: "dist",
      include: ["/**"],
      language: "ja",
      theme: THEME,
      exclude: ["/old/draft-*"],
      knowledgeDir: "knowledge",
      tokenWarningThreshold: 50000,
    });

    await expect(readFile("functions/api/chat.ts", "utf-8")).rejects.toThrow();
    await expect(readFile(".dev.vars", "utf-8")).rejects.toThrow();
  });
});

describe("planDevVarsAndGitignore", () => {
  it("still ensures .gitignore protects .dev.vars when the Gemini API key is skipped", () => {
    const plan = planDevVarsAndGitignore(undefined, "", "");
    expect(plan.nextDevVars).toBeUndefined();
    expect(plan.gitignoreResult).toEqual({ content: ".dev.vars\n", changed: true });
  });

  it("reports no gitignore change when .dev.vars is already protected and the key is skipped", () => {
    const plan = planDevVarsAndGitignore(undefined, "", "node_modules\n.dev.vars\n");
    expect(plan.nextDevVars).toBeUndefined();
    expect(plan.gitignoreResult).toEqual({ content: "node_modules\n.dev.vars\n", changed: false });
  });

  it("writes the key to .dev.vars and still ensures .gitignore protects it", () => {
    const plan = planDevVarsAndGitignore("abc123", "", "");
    expect(plan.nextDevVars).toBe("GEMINI_API_KEY=abc123\n");
    expect(plan.gitignoreResult).toEqual({ content: ".dev.vars\n", changed: true });
  });

  it("leaves .gitignore unchanged when the key is provided but it's already protected", () => {
    const plan = planDevVarsAndGitignore("abc123", "OTHER=1\n", "node_modules\n.dev.vars\n");
    expect(plan.nextDevVars).toBe("OTHER=1\nGEMINI_API_KEY=abc123\n");
    expect(plan.gitignoreResult).toEqual({ content: "node_modules\n.dev.vars\n", changed: false });
  });
});
