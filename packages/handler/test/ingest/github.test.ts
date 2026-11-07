import { afterEach, describe, expect, it, vi } from "vitest";
import { collectGithubRepos, fetchGithubReadme } from "../../src/ingest/github.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("collectGithubRepos", () => {
  it("collects repo links without duplicates, normalizing sub-paths to the repo", () => {
    const html = `
      <a href="https://github.com/alice/foo">foo</a>
      <a href="https://github.com/alice/foo/tree/main/docs">docs</a>
      <a href="https://github.com/alice/foo.git">clone</a>
      <a href="https://github.com/bob/bar#readme">bar</a>`;

    expect(collectGithubRepos(html)).toEqual(["https://github.com/alice/foo", "https://github.com/bob/bar"]);
  });

  it("ignores profile links, reserved paths, and non-GitHub links", () => {
    const html = `
      <a href="https://github.com/alice">profile</a>
      <a href="https://github.com/sponsors/alice">sponsor</a>
      <a href="https://github.com/orgs/acme/repositories">org</a>
      <a href="https://gitlab.com/alice/foo">gitlab</a>
      <a href="https://example.com/github.com/alice/foo">other</a>
      <a href="/works/foo">relative</a>`;

    expect(collectGithubRepos(html)).toEqual([]);
  });
});

describe("fetchGithubReadme", () => {
  it("fetches the raw README and returns it as a github page", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const fetchMock = vi.fn(async () => new Response("# Foo\n\nREADME body\n"));
    vi.stubGlobal("fetch", fetchMock);

    const page = await fetchGithubReadme("https://github.com/alice/foo");

    expect(page).toEqual({
      url: "https://github.com/alice/foo",
      source: "github",
      title: "alice/foo",
      text: "# Foo\n\nREADME body",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/alice/foo/readme");
    const headers = init.headers as Record<string, string>;
    expect(headers.Accept).toBe("application/vnd.github.raw");
    expect(headers.Authorization).toBeUndefined();
  });

  it("sends an Authorization header when GITHUB_TOKEN is set", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const fetchMock = vi.fn(async () => new Response("body"));
    vi.stubGlobal("fetch", fetchMock);

    await fetchGithubReadme("https://github.com/alice/foo");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("throws when the README request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Not Found", { status: 404 })));

    await expect(fetchGithubReadme("https://github.com/alice/missing")).rejects.toThrow("HTTP 404");
  });
});
