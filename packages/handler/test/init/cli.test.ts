import { describe, expect, it } from "vitest";
import { planDevVarsAndGitignore } from "../../src/init/cli.js";

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
