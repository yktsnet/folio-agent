import { sep } from "node:path";

/**
 * Maps a file path relative to a content root (dist/ or knowledge/) to the
 * URL path it represents, e.g. "works/foo/index.html" -> "/works/foo",
 * "about.html" -> "/about", "index.html" -> "/".
 */
export function fileToUrlPath(relPath: string): string {
  const posixPath = relPath.split(sep).join("/");
  const withoutExt = posixPath.replace(/\.[^/.]+$/, "");
  const withoutIndex = withoutExt.replace(/(^|\/)index$/, "");
  const urlPath = `/${withoutIndex}`.replace(/\/+/g, "/");
  return urlPath === "" ? "/" : urlPath;
}
