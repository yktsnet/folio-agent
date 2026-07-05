import picomatch from "picomatch";
import type { IngestConfig } from "./types.js";

export function createUrlMatcher(config: Pick<IngestConfig, "include" | "exclude">) {
  const isIncluded = picomatch(config.include);
  const isExcluded = config.exclude && config.exclude.length > 0 ? picomatch(config.exclude) : () => false;

  return (urlPath: string): boolean => isIncluded(urlPath) && !isExcluded(urlPath);
}
