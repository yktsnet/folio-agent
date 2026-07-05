import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { classifyRoute } from "./route.js";
import type { ChatGraphDeps, ChatRoute } from "./types.js";

const GENERATION_FAILED_MESSAGE =
  "本日の受付上限に達したか、一時的な不具合が発生しています。恐れ入りますがContactからお問い合わせください。";

const ChatState = Annotation.Root({
  input: Annotation<string>(),
  ip: Annotation<string>(),
  route: Annotation<ChatRoute | undefined>(),
  overLimit: Annotation<boolean>(),
  answer: Annotation<string | undefined>(),
});

export function buildChatGraph(deps: ChatGraphDeps) {
  const graph = new StateGraph(ChatState)
    .addNode("input_guard", async (state) => {
      const result = await deps.checkRateLimit(state.ip);
      if (!result.allowed) {
        const reasonText = result.reason === "daily" ? "本日の上限" : "直近の質問数の上限";
        return {
          overLimit: true,
          answer: `${reasonText}に達しました。お急ぎの場合はContactからお問い合わせください。`,
        };
      }
      return { overLimit: false };
    })
    .addNode("route_message", async (state) => ({ route: classifyRoute(state.input) }))
    .addNode("generate", async (state) => {
      try {
        return { answer: await deps.generateAnswer(state.input, state.route!) };
      } catch (error) {
        console.error("generateAnswer failed", error);
        return { answer: GENERATION_FAILED_MESSAGE };
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
