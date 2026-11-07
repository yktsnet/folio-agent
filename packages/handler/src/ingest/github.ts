import { parse } from "node-html-parser";
import { createUrlMatcher } from "./glob.js";
import { readTextFile, scanDist } from "./scan-dist.js";
import type { IngestConfig, KnowledgePage } from "./types.js";

// リポではない github.com のトップレベルのパス。網羅はしない（取りこぼしは README 取得の 404 で warnings に出る）
const RESERVED_OWNERS = new Set([
  "about",
  "apps",
  "collections",
  "customer-stories",
  "enterprise",
  "events",
  "explore",
  "features",
  "login",
  "marketplace",
  "new",
  "notifications",
  "orgs",
  "pricing",
  "pulls",
  "issues",
  "search",
  "security",
  "settings",
  "signup",
  "site",
  "sponsors",
  "team",
  "topics",
  "trending",
]);

const NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Returns the canonical `https://github.com/<owner>/<repo>` for a repo link, or undefined. */
export function toGithubRepoUrl(href: string): string | undefined {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return undefined;

  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !rawRepo) return undefined;
  const repo = rawRepo.replace(/\.git$/, "");
  if (!NAME_PATTERN.test(owner) || !NAME_PATTERN.test(repo) || repo === "." || repo === "..") return undefined;
  if (RESERVED_OWNERS.has(owner.toLowerCase())) return undefined;
  return `https://github.com/${owner}/${repo}`;
}

/** Collects GitHub repo URLs linked from `<a href>` in the given HTML, without duplicates. */
export function collectGithubRepos(html: string): string[] {
  const repos = new Set<string>();
  for (const anchor of parse(html).querySelectorAll("a[href]")) {
    const repoUrl = toGithubRepoUrl(anchor.getAttribute("href") ?? "");
    if (repoUrl) repos.add(repoUrl);
  }
  return [...repos];
}

/** Fetches the default README of a repo and turns it into a knowledge page. Throws on failure. */
export async function fetchGithubReadme(repoUrl: string): Promise<KnowledgePage> {
  const slug = repoUrl.replace(/^https:\/\/github\.com\//, "");
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
    "User-Agent": "folio-agent-ingest",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com/repos/${slug}/readme`, { headers });
  if (!response.ok) {
    throw new Error(`failed to fetch README for ${slug}: HTTP ${response.status}`);
  }
  const text = (await response.text()).trim();
  return { url: repoUrl, source: "github", title: slug, text };
}

export interface GithubFetchResult {
  pages: KnowledgePage[];
  failures: { repoUrl: string; error: string }[];
}

/** Fetches READMEs for all repos sequentially, separating successes from failures. */
export async function fetchGithubReadmes(repoUrls: Iterable<string>): Promise<GithubFetchResult> {
  const result: GithubFetchResult = { pages: [], failures: [] };
  for (const repoUrl of repoUrls) {
    try {
      result.pages.push(await fetchGithubReadme(repoUrl));
    } catch (error) {
      result.failures.push({ repoUrl, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}

/** Collects repos linked from the included (non-excluded) pages of `config.distDir`. */
export async function collectGithubReposFromDist(config: IngestConfig): Promise<string[]> {
  const matchesUrl = createUrlMatcher(config);
  const repos = new Set<string>();
  for (const file of (await scanDist(config.distDir)).filter((f) => matchesUrl(f.urlPath))) {
    for (const repo of collectGithubRepos(await readTextFile(file.absolutePath))) repos.add(repo);
  }
  return [...repos];
}
