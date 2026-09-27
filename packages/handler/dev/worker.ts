import { collectAnswerLinks } from "../src/chat/answer/links.js";
import { createGeminiGenerator } from "../src/chat/gemini.js";
import { createChatHandler } from "../src/chat/handler.js";
import { formatKnowledge } from "../src/ingest/format.js";

const CONTACT_URL = "https://example.com/contact/";

// 実サイトの knowledge.json と同じ形。このサイトのページ（パス）と外部の記事（URL）を両方持たせ、
// 回答のリンクの扱い（サイト内は名前で案内、外部と Contact はリンク）を手元で確かめられるようにする
const SAMPLE_KNOWLEDGE = {
  pages: [
    {
      url: "/",
      title: "Works • example.com",
      text: "作者は「知識の規模でツールを選ぶ」ことを大事にしている。検索が要らない規模ならCAGを選ぶ。",
    },
    {
      url: "/works/folio-agent",
      title: "folio-agent • example.com",
      text: "folio-agentはポートフォリオ受付チャットボットをOSS化した実証プロジェクト。LangGraph.jsとCloudflare Workersで作られている。",
    },
    {
      url: "https://zenn.dev/example/articles/folio-agent",
      title: "検索を持たない受付チャットボットを作る",
      text: "folio-agent の制作の経緯。CAG を選んだ理由と、LLM の回答をコードで検査する仕組みを書いた。",
    },
  ],
};

interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const handle = createChatHandler({
      db: env.DB,
      answerLinks: collectAnswerLinks(SAMPLE_KNOWLEDGE, CONTACT_URL),
      generateAnswer: createGeminiGenerator({
        apiKey: env.GEMINI_API_KEY,
        knowledge: formatKnowledge(SAMPLE_KNOWLEDGE),
        contactUrl: CONTACT_URL,
      }),
    });
    return handle(request);
  },
};
