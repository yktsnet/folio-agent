export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ChatResponseBody {
  answer?: string;
  route?: string;
}
