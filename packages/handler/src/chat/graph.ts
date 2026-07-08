import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
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

const ChatState = Annotation.Root({
  input: Annotation<string>(),
  ip: Annotation<string>(),
  route: Annotation<ChatRoute | undefined>(),
  overLimit: Annotation<boolean>(),
  answer: Annotation<string | undefined>(),
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
      try {
        return { answer: await deps.generateAnswer(state.input, state.route!) };
      } catch (error) {
        console.error("generateAnswer failed", error);
        return { answer: GENERATION_FAILED_MESSAGE[language] };
      }
    })
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
    .addEdge("generate", "log")
    .addEdge("log", END);

  return graph.compile();
}
