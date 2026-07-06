import { WIDGET_STYLES } from "./styles.js";
import type { ChatMessage, ChatResponseBody } from "./types.js";

type Language = "ja" | "en";

interface WidgetText {
  toggleAriaLabel: string;
  inputPlaceholder: string;
  submitLabel: string;
  disclosureText: string;
  policyLinkText: string;
  configErrorText: string;
  answerFallbackText: string;
  networkErrorText: string;
}

const WIDGET_TEXT: Record<Language, WidgetText> = {
  ja: {
    toggleAriaLabel: "チャットを開く",
    inputPlaceholder: "メッセージを入力",
    submitLabel: "送信",
    disclosureText: "入力内容は品質改善のため記録されます。",
    policyLinkText: "利用データの扱いについて",
    configErrorText: "設定エラー: endpoint属性が指定されていません。",
    answerFallbackText: "回答を取得できませんでした。しばらくしてから再度お試しください。",
    networkErrorText: "通信エラーが発生しました。しばらくしてから再度お試しください。",
  },
  en: {
    toggleAriaLabel: "Open chat",
    inputPlaceholder: "Type a message",
    submitLabel: "Send",
    disclosureText: "Your input is logged for quality improvement.",
    policyLinkText: "About data usage",
    configErrorText: "Configuration error: the endpoint attribute is not set.",
    answerFallbackText: "Couldn't get an answer. Please try again later.",
    networkErrorText: "A network error occurred. Please try again later.",
  },
};

function resolveLanguage(value: string | null): Language {
  return value === "en" ? "en" : "ja";
}

export class FolioAgentWidgetElement extends HTMLElement {
  static readonly tagName = "folio-agent-widget";

  #open = false;
  #hasShownDisclosure = false;
  #messages: ChatMessage[] = [];
  #panelEl?: HTMLElement;
  #messagesEl?: HTMLElement;
  #inputEl?: HTMLInputElement;
  #text: WidgetText = WIDGET_TEXT.ja;

  connectedCallback(): void {
    this.#text = WIDGET_TEXT[resolveLanguage(this.getAttribute("lang"))];

    const root = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = WIDGET_STYLES;
    root.appendChild(style);

    const toggle = document.createElement("button");
    toggle.className = "toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", this.#text.toggleAriaLabel);
    toggle.textContent = "💬";
    toggle.addEventListener("click", () => this.#togglePanel());
    root.appendChild(toggle);

    const panel = document.createElement("div");
    panel.className = "panel";
    panel.hidden = true;

    const messages = document.createElement("div");
    messages.className = "messages";
    panel.appendChild(messages);

    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = this.#text.inputPlaceholder;
    input.autocomplete = "off";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = this.#text.submitLabel;
    form.appendChild(input);
    form.appendChild(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value;
      input.value = "";
      void this.#sendMessage(text);
    });
    panel.appendChild(form);

    root.appendChild(panel);

    this.#panelEl = panel;
    this.#messagesEl = messages;
    this.#inputEl = input;
  }

  #togglePanel(): void {
    this.#open = !this.#open;
    if (!this.#panelEl) return;
    this.#panelEl.hidden = !this.#open;

    if (this.#open && !this.#hasShownDisclosure) {
      this.#hasShownDisclosure = true;
      this.#renderDisclosure();
    }
    if (this.#open) {
      this.#inputEl?.focus();
    }
  }

  #renderDisclosure(): void {
    if (!this.#messagesEl) return;
    const disclosure = document.createElement("div");
    disclosure.className = "disclosure";
    disclosure.append(`${this.#text.disclosureText} `);

    const policyHref = this.getAttribute("policy-href");
    if (policyHref) {
      const link = document.createElement("a");
      link.href = policyHref;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = this.#text.policyLinkText;
      disclosure.appendChild(link);
    }

    this.#messagesEl.appendChild(disclosure);
  }

  async #sendMessage(rawText: string): Promise<void> {
    const text = rawText.trim();
    if (!text) return;

    this.#appendMessage({ role: "user", text });

    const endpoint = this.getAttribute("endpoint");
    if (!endpoint) {
      this.#appendMessage({ role: "assistant", text: this.#text.configErrorText });
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const body = (await response.json()) as ChatResponseBody;
      this.#appendMessage({
        role: "assistant",
        text: body.answer ?? this.#text.answerFallbackText,
      });
    } catch {
      this.#appendMessage({
        role: "assistant",
        text: this.#text.networkErrorText,
      });
    }
  }

  #appendMessage(message: ChatMessage): void {
    this.#messages.push(message);
    if (!this.#messagesEl) return;

    const el = document.createElement("div");
    el.className = `message ${message.role}`;
    el.textContent = message.text;
    this.#messagesEl.appendChild(el);
    this.#messagesEl.scrollTop = this.#messagesEl.scrollHeight;
  }
}

export function defineFolioAgentWidget(tagName: string = FolioAgentWidgetElement.tagName): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, FolioAgentWidgetElement);
  }
}
