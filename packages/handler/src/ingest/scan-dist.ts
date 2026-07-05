import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileToUrlPath } from "./file-to-url.js";

export interface ScannedFile {
  urlPath: string;
  absolutePath: string;
}

async function walk(dir: string, root: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, root)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export async function scanDist(distDir: string): Promise<ScannedFile[]> {
  const allFiles = await walk(distDir, distDir);
  return allFiles
    .filter((absolutePath) => absolutePath.endsWith(".html"))
    .map((absolutePath) => ({
      urlPath: fileToUrlPath(relative(distDir, absolutePath)),
      absolutePath,
    }));
}

export async function scanKnowledgeDir(knowledgeDir: string): Promise<ScannedFile[]> {
  const allFiles = await walk(knowledgeDir, knowledgeDir);
  return allFiles
    .filter((absolutePath) => absolutePath.endsWith(".md"))
    .map((absolutePath) => ({
      urlPath: fileToUrlPath(relative(knowledgeDir, absolutePath)),
      absolutePath,
    }));
}

export async function readTextFile(absolutePath: string): Promise<string> {
  return readFile(absolutePath, "utf-8");
}
