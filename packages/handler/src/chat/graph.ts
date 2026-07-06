import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { classifyRoute } from "./route.js";
import type { ChatGraphDeps, ChatRoute, Language } from "./types.js";
import { DEFAULT_LANGUAGE } from "./types.js";

const RATE_LIMIT_REASON_TEXT: Record<Language, { daily: string; shortWindow: string }> = {
  ja: { daily: "本日の上限", shortWindow: "直近の質問数の上限" },
  en: { daily: "today's limit", shortWindow: "the recent question limit" },
};

const OVER_LIMIT_MESSAGE: Record<Language, (reasonText: string) => string> = {
  ja: (reasonText) => `${reasonText}に達しました。お急ぎの場合はContactからお問い合わせください。`,
  en: (reasonText) => `You've reached ${reasonText}. If it's urgent, please contact us via the Contact page.`,
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
        const reasonText = result.reason === "daily" ? RATE_LIMIT_REASON_TEXT[language].daily : RATE_LIMIT_REASON_TEXT[language].shortWindow;
        return {
          overLimit: true,
          answer: OVER_LIMIT_MESSAGE[language](reasonText),
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
