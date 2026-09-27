import type { ChatRoute, Language } from "../types.js";
import { DEFAULT_LANGUAGE } from "../types.js";
import { ANSWER_FORMAT } from "./answer-format.js";
import { GROUNDING } from "./grounding.js";
import { PERSONA } from "./persona.js";
import { buildInquiryInstruction, ROUTE_INSTRUCTIONS } from "./routes.js";

const KNOWLEDGE_LABEL: Record<Language, string> = {
  ja: "---- 知識 ----",
  en: "---- Knowledge ----",
};

export function buildSystemPrompt(
  knowledge: string,
  route: Exclude<ChatRoute, "rate_limited">,
  contactUrl?: string,
  language: Language = DEFAULT_LANGUAGE,
): string {
  const routeInstruction = route === "inquiry" ? buildInquiryInstruction(language, contactUrl) : ROUTE_INSTRUCTIONS[language][route];
  return [PERSONA[language], GROUNDING[language], ANSWER_FORMAT[language], routeInstruction, KNOWLEDGE_LABEL[language], knowledge].join("\n\n");
}
