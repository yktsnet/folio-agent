import { describe, expect, it } from "vitest";
import {
  appendIngestToBuildScript,
  buildApiRouteTemplate,
  buildConfigJson,
  buildKnowledgeImportPath,
  buildThemeCss,
  deriveEndpointPath,
  ensureGitignoreEntry,
  resolveThemeCssPath,
  upsertDevVar,
} from "../../src/init/writers.js";
import type { WizardAnswers } from "../../src/init/questions.js";
import type { IngestConfig } from "../../src/ingest/types.js";

const THEME = { accent: "#2563eb", surface: "#ffffff", text: "#111827" };

function makeAnswers(overrides: Partial<WizardAnswers> = {}): WizardAnswers {
  return {
    language: "ja",
    distDir: "dist",
    include: ["/**"],
    theme: THEME,
    apiRoutePath: "functions/api/chat.ts",
    ...overrides,
  };
}

describe("buildConfigJson", () => {
  it("builds a fresh config from answers when there is no previous config", () => {
    const config = buildConfigJson(makeAnswers());
    expect(config).toEqual({
      distDir: "dist",
      include: ["/**"],
      language: "ja",
      theme: THEME,
    });
  });

  it("includes zenn only when answered", () => {
    const config = buildConfigJson(
      makeAnswers({ zenn: { articlesDir: "../zenn-content/articles", baseUrl: "https://zenn.dev/foo/articles" } }),
    );
    expect(config.zenn).toEqual({ articlesDir: "../zenn-content/articles", baseUrl: "https://zenn.dev/foo/articles" });
  });

  it("preserves fields the wizard never asks about, from the previous config", () => {
    const previous: IngestConfig = {
      distDir: "old-dist",
      include: ["/old/**"],
      exclude: ["/old/draft-*"],
      knowledgeDir: "knowledge",
      tokenWarningThreshold: 50000,
    };
    const config = buildConfigJson(makeAnswers(), previous);
    expect(config.exclude).toEqual(["/old/draft-*"]);
    expect(config.knowledgeDir).toBe("knowledge");
    expect(config.tokenWarningThreshold).toBe(50000);
    // answers still win for fields the wizard does ask about
    expect(config.distDir).toBe("dist");
    expect(config.include).toEqual(["/**"]);
  });

  it("drops zenn when the previous config had it but the answers don't", () => {
    const previous: IngestConfig = {
      distDir: "dist",
      include: ["/**"],
      zenn: { articlesDir: "../zenn-content/articles", baseUrl: "https://zenn.dev/foo/articles" },
    };
    const config = buildConfigJson(makeAnswers(), previous);
    expect(config.zenn).toBeUndefined();
  });
});

describe("buildThemeCss", () => {
  it("writes the three custom properties on the folio-agent-widget selector", () => {
    const css = buildThemeCss(THEME);
    expect(css).toContain("folio-agent-widget {");
    expect(css).toContain("--folio-agent-accent: #2563eb;");
    expect(css).toContain("--folio-agent-surface: #ffffff;");
    expect(css).toContain("--folio-agent-text: #111827;");
  });
});

describe("buildKnowledgeImportPath", () => {
  it("computes a relative path from the API route directory to <distDir>/knowledge.json", () => {
    expect(buildKnowledgeImportPath("functions/api/chat.ts", "dist")).toBe("../../dist/knowledge.json");
    expect(buildKnowledgeImportPath("functions/chat.ts", "dist")).toBe("../dist/knowledge.json");
  });
});

describe("deriveEndpointPath", () => {
  it("strips the functions/ prefix and file extension", () => {
    expect(deriveEndpointPath("functions/api/chat.ts")).toBe("/api/chat");
    expect(deriveEndpointPath("functions/chat.tsx")).toBe("/chat");
  });
});

describe("buildApiRouteTemplate", () => {
  it("wires up createChatHandler with the knowledge import and no optional fields", () => {
    const output = buildApiRouteTemplate({ apiRoutePath: "functions/api/chat.ts", distDir: "dist", language: "ja" });
    expect(output).toContain('import knowledgeDoc from "../../dist/knowledge.json";');
    expect(output).toContain("export const onRequestPost: PagesFunction<Env> = async (context) => {");
    expect(output).not.toContain("language:");
    expect(output).not.toContain("contactUrl:");
  });

  it("includes language when it isn't the default", () => {
    const output = buildApiRouteTemplate({ apiRoutePath: "functions/api/chat.ts", distDir: "dist", language: "en" });
    expect(output).toContain('language: "en",');
  });

  it("includes contactUrl when provided", () => {
    const output = buildApiRouteTemplate({
      apiRoutePath: "functions/api/chat.ts",
      distDir: "dist",
      language: "ja",
      contactUrl: "https://example.com/contact",
    });
    expect(output).toContain('contactUrl: "https://example.com/contact",');
  });
});

describe("appendIngestToBuildScript", () => {
  const configPath = "folio-agent.config.json";
  const outputPath = "dist/knowledge.json";
  const ingestCommand = `folio-agent-ingest ${configPath} ${outputPath}`;

  it("appends the ingest command when there is no existing build script", () => {
    expect(appendIngestToBuildScript(undefined, configPath, outputPath)).toBe(ingestCommand);
  });

  it("appends with && when a build script already exists", () => {
    expect(appendIngestToBuildScript("astro build", configPath, outputPath)).toBe(`astro build && ${ingestCommand}`);
  });

  it("leaves the script unchanged when it already includes the ingest command", () => {
    const script = `astro build && ${ingestCommand}`;
    expect(appendIngestToBuildScript(script, configPath, outputPath)).toBe(script);
  });
});

describe("upsertDevVar", () => {
  it("adds the key when the file is empty", () => {
    expect(upsertDevVar("", "GEMINI_API_KEY", "abc123")).toBe("GEMINI_API_KEY=abc123\n");
  });

  it("appends the key when other vars already exist", () => {
    expect(upsertDevVar("OTHER=1\n", "GEMINI_API_KEY", "abc123")).toBe("OTHER=1\nGEMINI_API_KEY=abc123\n");
  });

  it("replaces the value in place when the key already exists", () => {
    expect(upsertDevVar("GEMINI_API_KEY=old\nOTHER=1\n", "GEMINI_API_KEY", "new")).toBe("GEMINI_API_KEY=new\nOTHER=1\n");
  });
});

describe("ensureGitignoreEntry", () => {
  it("appends the entry when the file is empty", () => {
    expect(ensureGitignoreEntry("", ".dev.vars")).toEqual({ content: ".dev.vars\n", changed: true });
  });

  it("appends the entry after existing lines", () => {
    expect(ensureGitignoreEntry("node_modules\n", ".dev.vars")).toEqual({
      content: "node_modules\n.dev.vars\n",
      changed: true,
    });
  });

  it("reports no change when a line already starts with the entry", () => {
    expect(ensureGitignoreEntry("node_modules\n.dev.vars\n", ".dev.vars")).toEqual({
      content: "node_modules\n.dev.vars\n",
      changed: false,
    });
  });

  it("treats a line-start match as sufficient, without interpreting wider patterns", () => {
    expect(ensureGitignoreEntry(".dev.vars.local\n", ".dev.vars")).toEqual({
      content: ".dev.vars.local\n",
      changed: false,
    });
  });
});

describe("resolveThemeCssPath", () => {
  it("writes to public/ when it exists and neither location has a file yet", () => {
    expect(resolveThemeCssPath(true, false, false)).toBe("public/folio-agent.theme.css");
  });

  it("writes to the root when public/ doesn't exist and neither location has a file yet", () => {
    expect(resolveThemeCssPath(false, false, false)).toBe("folio-agent.theme.css");
  });

  it("reuses the existing public/ file even if public/ itself is reported absent", () => {
    expect(resolveThemeCssPath(false, true, false)).toBe("public/folio-agent.theme.css");
  });

  it("reuses the existing root file even when public/ now exists", () => {
    expect(resolveThemeCssPath(true, false, true)).toBe("folio-agent.theme.css");
  });
});
