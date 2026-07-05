import { createChatHandler } from "../src/chat/handler.js";
import { createGeminiGenerator } from "../src/chat/gemini.js";

const SAMPLE_KNOWLEDGE = [
  "# / (トップページ)",
  "作者は「知識の規模でツールを選ぶ」ことを大事にしている。検索が要らない規模ならCAGを選ぶ。",
  "# /works/folio-agent",
  "folio-agentはポートフォリオ受付チャットボットをOSS化した実証プロジェクト。LangGraph.jsとCloudflare Workersで作られている。",
].join("\n\n");

interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const handle = createChatHandler({
      db: env.DB,
      generateAnswer: createGeminiGenerator({ apiKey: env.GEMINI_API_KEY, knowledge: SAMPLE_KNOWLEDGE }),
    });
    return handle(request);
  },
};
