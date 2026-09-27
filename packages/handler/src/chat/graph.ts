import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { findAnswerFormatViolations, tidyAnswer } from "./answer/contract.js";
import type { AnswerViolation } from "./answer/contract.js";
import { toPlainAnswer } from "./answer/fallback.js";
import { buildCorrectionRequest } from "./prompt/correction.js";
import { classifyRoute } from "./route.js";
import type { ChatGraphDeps, ChatRoute, Language, RateLimitConfig, RateLimitReason } from "./types.js";
import { DEFAULT_LANGUAGE } from "./types.js";

const OVER_LIMIT_MESSAGE: Record<Language, (reason: RateLimitReason, config: RateLimitConfig) => string> = {
  ja: (reason, config) =>
    reason === "short_window"
      ? `${config.shortWindowMinutes}分間に${config.shortWindowMax}件までのご質問上限に達しました。少し時間を置いてから再度お試しください。お急ぎの場合はContactからお問い合わせください。`
      : `${config.longWindowHours}時間に${config.longWindowMax}件までのご質問上限に達しました。時間を置いてから再度お試しください。お急ぎの場合はContactからお問い合わせください。`,
  en: (reason, config) =>
    reason === "short_window"
      ? `You've reached the limit of ${config.shortWindowMax} questions per ${config.shortWindowMinutes} minutes. Please try again in a little while. If it's urgent, please contact us via the Contact page.`
      : `You've reached the limit of ${config.longWindowMax} questions per ${config.longWindowHours} hours. Please try again later. If it's urgent, please contact us via the Contact page.`,
};

const GENERATION_FAILED_MESSAGE: Record<Language, string> = {
  ja: "本日の受付上限に達したか、一時的な不具合が発生しています。恐れ入りますがContactからお問い合わせください。",
  en: "You may have reached today's limit, or a temporary issue has occurred. Please contact us via the Contact page.",
};

// 1回目の回答と、指摘して作り直させた回答の2回まで。無料枠の回数の上限があるので、それ以上は呼ばない
const MAX_ATTEMPTS = 2;

const ChatState = Annotation.Root({
  input: Annotation<string>(),
  ip: Annotation<string>(),
  route: Annotation<ChatRoute | undefined>(),
  overLimit: Annotation<boolean>(),
  answer: Annotation<string | undefined>(),
  attempt: Annotation<number>(),
  violations: Annotation<AnswerViolation[]>(),
});

export function buildChatGraph(deps: ChatGraphDeps) {
  const language = deps.language ?? DEFAULT_LANGUAGE;

  const graph = new StateGraph(ChatState)
    .addNode("input_guard", async (state) => {
      const result = await deps.checkRateLimit(state.ip);
      if (!result.allowed) {
        return {
          overLimit: true,
          answer: OVER_LIMIT_MESSAGE[language](result.reason!, deps.rateLimitConfig),
        };
      }
      return { overLimit: false };
    })
    .addNode("route_message", async (state) => ({ route: classifyRoute(state.input, language) }))
    .addNode("generate", async (state) => {
      const attempt = (state.attempt ?? 0) + 1;
      const correction =
        state.violations?.length && state.answer !== undefined
          ? { previousAnswer: state.answer, request: buildCorrectionRequest(state.violations, language) }
          : undefined;
      try {
        return { attempt, answer: await deps.generateAnswer(state.input, state.route!, correction) };
      } catch (error) {
        console.error("generateAnswer failed", error);
        return { attempt, answer: GENERATION_FAILED_MESSAGE[language] };
      }
    })
    .addNode("check_answer", async (state) => {
      const answer = tidyAnswer(state.answer ?? "");
      const violations = findAnswerFormatViolations(answer, deps.answerLinks ?? []);
      if (violations.length > 0 && deps.logAnswerViolation) {
        try {
          await deps.logAnswerViolation({
            route: state.route!,
            attempt: state.attempt,
            kinds: [...new Set(violations.map((violation) => violation.kind))],
            answer,
          });
        } catch (error) {
          // 記録に失敗しても（migration 未適用など）訪問者への回答は止めない
          console.error("logAnswerViolation failed", error);
        }
      }
      return { answer, violations };
    })
    .addNode("fallback", async (state) => ({ answer: toPlainAnswer(state.answer ?? "", deps.answerLinks), violations: [] }))
    .addNode("log", async (state) => {
      await deps.logChat({
        ip: state.ip,
        route: state.overLimit ? "rate_limited" : state.route!,
        message: state.input,
        response: state.answer ?? "",
        overLimit: state.overLimit,
      });
      return {};
    })
    .addEdge(START, "input_guard")
    .addConditionalEdges("input_guard", (state) => (state.overLimit ? "log" : "route_message"), {
      log: "log",
      route_message: "route_message",
    })
    .addEdge("route_message", "generate")
    .addEdge("generate", "check_answer")
    .addConditionalEdges(
      "check_answer",
      (state) => (state.violations.length === 0 ? "log" : state.attempt < MAX_ATTEMPTS ? "generate" : "fallback"),
      { log: "log", generate: "generate", fallback: "fallback" },
    )
    .addEdge("fallback", "log")
    .addEdge("log", END);

  return graph.compile();
}
