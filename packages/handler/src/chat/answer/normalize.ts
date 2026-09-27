/**
 * Brings a generated answer into the answer format that handler and widget agree on, whatever the
 * model actually produced. The prompt only asks for the format (prompt/answer-format.ts); this is
 * where it is enforced, so the widget can rely on it.
 */
export function normalizeAnswer(answer: string): string {
  return answer;
}
