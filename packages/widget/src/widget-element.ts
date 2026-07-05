import { WIDGET_STYLES } from "./styles.js";
import type { ChatMessage, ChatResponseBody } from "./types.js";

const DISCLOSURE_TEXT = "入力内容は品質改善のため記録されます。";

export class FolioAgentWidgetElement extends HTMLElement {
  static readonly tagName = "folio-agent-widget";

  #open = false;
  #hasShownDisclosure = false;
  #messages: ChatMessage[] = [];
  #panelEl?: HTMLElement;
  #messagesEl?: HTMLElement;
  #inputEl?: HTMLInputElement;

  connectedCallback(): void {
    const root = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = WIDGET_STYLES;
    root.appendChild(style);

    const toggle = document.createElement("button");
    toggle.className = "toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "チャットを開く");
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
    input.placeholder = "メッセージを入力";
    input.autocomplete = "off";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "送信";
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
    disclosure.append(`${DISCLOSURE_TEXT} `);

    const policyHref = this.getAttribute("policy-href");
    if (policyHref) {
      const link = document.createElement("a");
      link.href = policyHref;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "利用データの扱いについて";
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
      this.#appendMessage({ role: "assistant", text: "設定エラー: endpoint属性が指定されていません。" });
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
        text: body.answer ?? "回答を取得できませんでした。しばらくしてから再度お試しください。",
      });
    } catch {
      this.#appendMessage({
        role: "assistant",
        text: "通信エラーが発生しました。しばらくしてから再度お試しください。",
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
