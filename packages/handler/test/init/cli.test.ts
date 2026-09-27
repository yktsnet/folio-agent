import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApiRouteTemplate, buildThemeCss } from "../../src/init/writers.js";
import type { IngestConfig } from "../../src/ingest/types.js";
import { main, planDevVarsAndGitignore } from "../../src/init/cli.js";

// The compiled bin entry point. Only present after `npm run build`; the
// bin-symlink regression test below is skipped when it's missing.
const distCliPath = join(import.meta.dirname, "../../dist/init/cli.js");

const THEME = { accent: "#2563eb", surface: "#ffffff", text: "#111827" };

describe("folio-agent-init main (E2E)", () => {
  let root: string;
  let originalCwd: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "folio-agent-init-cli-"));
    originalCwd = process.cwd();
    process.chdir(root);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
    process.exitCode = undefined;
    await rm(root, { recursive: true, force: true });
  });

  it("writes config json, API route scaffold, .dev.vars and .gitignore for a fresh setup, with no theme CSS by default", async () => {
    await main([], { GEMINI_API_KEY: "abc123" });

    const config = JSON.parse(await readFile("folio-agent.config.json", "utf-8"));
    expect(config).toEqual({ distDir: "dist", include: ["/**"], language: "ja" });

    expect(existsSync("folio-agent.theme.css")).toBe(false);

    const apiRoute = await readFile("functions/api/chat.ts", "utf-8");
    expect(apiRoute).toBe(
      buildApiRouteTemplate({ apiRoutePath: "functions/api/chat.ts", distDir: "dist", language: "ja" }),
    );

    expect(await readFile(".dev.vars", "utf-8")).toBe("GEMINI_API_KEY=abc123\n");
    expect(await readFile(".gitignore", "utf-8")).toBe(".dev.vars\n");

    const pkg = JSON.parse(await readFile("package.json", "utf-8"));
    expect(pkg.scripts.build).toBe("folio-agent-ingest folio-agent.config.json dist/knowledge.json");
  });

  it("writes the theme CSS for a theme preset, and removes it again with --theme auto", async () => {
    await main(["--theme", "custom", "--accent", THEME.accent, "--surface", THEME.surface, "--text", THEME.text], {});
    expect(await readFile("folio-agent.theme.css", "utf-8")).toBe(buildThemeCss(THEME));
    expect(JSON.parse(await readFile("folio-agent.config.json", "utf-8")).theme).toEqual(THEME);

    await main(["--theme", "auto"], {});
    expect(existsSync("folio-agent.theme.css")).toBe(false);
    expect(JSON.parse(await readFile("folio-agent.config.json", "utf-8")).theme).toBeUndefined();
  });

  it("keeps an existing config's values and unmanaged fields on a re-run, and skips the API route scaffold", async () => {
    const previous: IngestConfig = {
      distDir: "old-dist",
      include: ["/old/**"],
      exclude: ["/old/draft-*"],
      knowledgeDir: "knowledge",
      tokenWarningThreshold: 50000,
      zennSnapshotPath: "zenn-snapshot.json",
      language: "en",
      theme: THEME,
    };
    await writeFile("folio-agent.config.json", JSON.stringify(previous, null, 2));

    await main(["--include", "/, /about"], {});

    const config = JSON.parse(await readFile("folio-agent.config.json", "utf-8"));
    expect(config).toEqual({ ...previous, include: ["/", "/about"] });
    expect(await readFile("folio-agent.theme.css", "utf-8")).toBe(buildThemeCss(THEME));
    expect(existsSync("functions/api/chat.ts")).toBe(false);
    expect(existsSync(".dev.vars")).toBe(false);
  });

  it("writes nothing with --dry-run", async () => {
    await main(["--dry-run", "--theme", "poimandres"], { GEMINI_API_KEY: "abc123" });

    expect(existsSync("folio-agent.config.json")).toBe(false);
    expect(existsSync("folio-agent.theme.css")).toBe(false);
    expect(existsSync("functions/api/chat.ts")).toBe(false);
    expect(existsSync(".dev.vars")).toBe(false);
    expect(existsSync("package.json")).toBe(false);
  });

  it("sets process.exitCode to 1 and writes nothing on invalid arguments", async () => {
    await main(["--theme", "dracula"], {});

    expect(process.exitCode).toBe(1);
    expect(existsSync("folio-agent.config.json")).toBe(false);
  });
});

describe("planDevVarsAndGitignore", () => {
  it("still ensures .gitignore protects .dev.vars when GEMINI_API_KEY is not set", () => {
    const plan = planDevVarsAndGitignore(undefined, "", "");
    expect(plan.nextDevVars).toBeUndefined();
    expect(plan.gitignoreResult).toEqual({ content: ".dev.vars\n", changed: true });
  });

  it("reports no gitignore change when .dev.vars is already protected and the key is not set", () => {
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

describe.skipIf(!existsSync(distCliPath))("folio-agent-init CLI (bin symlink execution)", () => {
  // Importing main (as the tests above do) can never catch a regression in the "am I being run
  // directly?" guard, since import never triggers it. npm's node_modules/.bin/ entries are
  // symlinks to the real file, so this spawns the compiled CLI through a symlink — mirroring how
  // `folio-agent-init` actually gets invoked once installed. `--help` proves main() ran without
  // writing into the temp directory.
  it("runs main() and prints usage when invoked via a bin-style symlink", async () => {
    const root = await mkdtemp(join(tmpdir(), "folio-agent-init-cli-bin-"));
    try {
      const binDir = join(root, "bin");
      await mkdir(binDir, { recursive: true });
      const binPath = join(binDir, "folio-agent-init");
      await symlink(distCliPath, binPath);

      const result = execFileSync("node", [binPath, "--help"], {
        cwd: root,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      });

      expect(result).toContain("Usage: folio-agent-init");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
