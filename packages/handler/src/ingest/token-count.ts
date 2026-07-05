const CHARS_PER_TOKEN_ESTIMATE = 4;

export const DEFAULT_TOKEN_WARNING_THRESHOLD = 100_000;

/** Rough token estimate (chars / 4), good enough for a build-time budget warning. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}
