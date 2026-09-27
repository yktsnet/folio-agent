import { WIDGET_STYLES } from "./styles.js";
import type { ChatMessage, ChatResponseBody } from "./types.js";

type Language = "ja" | "en";

interface WidgetText {
  toggleLabel: string;
  headingText: string;
  subheadingText: string;
  closeLabel: string;
  resetLabel: string;
  greetingText: string;
  suggestions: string[];
  inputPlaceholder: string;
  submitLabel: string;
  typingLabel: string;
  disclosureText: string;
  policyLinkText: string;
  configErrorText: string;
  answerFallbackText: string;
  networkErrorText: string;
}

const WIDGET_TEXT: Record<Language, WidgetText> = {
  ja: {
    toggleLabel: "質問する",
    headingText: "このサイトについて質問",
    subheadingText: "公開している情報をもとに AI が答えます",
    closeLabel: "閉じる",
    resetLabel: "新しい会話",
    greetingText: "制作実績・記事の内容・仕事の依頼について答えます。",
    suggestions: ["どんな制作実績がありますか？", "どんな考え方で仕事をしていますか？", "仕事を依頼するには？"],
    inputPlaceholder: "質問を入力",
    submitLabel: "送信",
    typingLabel: "回答を作成中",
    disclosureText: "入力内容は品質改善のため記録されます。",
    policyLinkText: "利用データの扱い",
    configErrorText: "設定エラー: endpoint属性が指定されていません。",
    answerFallbackText: "回答を取得できませんでした。しばらくしてから再度お試しください。",
    networkErrorText: "通信エラーが発生しました。しばらくしてから再度お試しください。",
  },
  en: {
    toggleLabel: "Ask",
    headingText: "Ask about this site",
    subheadingText: "AI answers from what this site publishes",
    closeLabel: "Close",
    resetLabel: "New conversation",
    greetingText: "Ask about past work, articles, or how to request a project.",
    suggestions: ["What have you built?", "How do you approach your work?", "How can I request a project?"],
    inputPlaceholder: "Type a question",
    submitLabel: "Send",
    typingLabel: "Writing an answer",
    disclosureText: "Your input is logged for quality improvement.",
    policyLinkText: "About data usage",
    configErrorText: "Configuration error: the endpoint attribute is not set.",
    answerFallbackText: "Couldn't get an answer. Please try again later.",
    networkErrorText: "A network error occurred. Please try again later.",
  },
};

const CHAT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12.5c0 3.9-3.6 7-8 7-1.1 0-2.2-.2-3.1-.6L4.5 20l1.2-3.4C4.6 15.5 4 14 4 12.5c0-3.9 3.6-7 8-7s8 3.1 8 7Z"/><path d="M9 12.5h.01M12 12.5h.01M15 12.5h.01" stroke-width="2.4"/></svg>`;
const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const RESET_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h8"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const SEND_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>`;

const COMPACT_QUERY = "(max-width: 640px)";
const FINE_POINTER_QUERY = "(pointer: fine)";

function resolveLanguage(value: string | null): Language {
  return value === "en" ? "en" : "ja";
}

function matches(query: string): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

export class FolioAgentWidgetElement extends HTMLElement {
  static readonly tagName = "folio-agent-widget";

  #open = false;
  #pending = false;
  #messages: ChatMessage[] = [];
  #text: WidgetText = WIDGET_TEXT.ja;
  #rootEl?: HTMLElement;
  #toggleEl?: HTMLButtonElement;
  #panelEl?: HTMLElement;
  #closeEl?: HTMLButtonElement;
  #resetEl?: HTMLButtonElement;
  #messagesEl?: HTMLElement;
  #suggestionsEl?: HTMLElement;
  #typingEl?: HTMLElement;
  #inputEl?: HTMLTextAreaElement;
  #sendEl?: HTMLButtonElement;
  #scrollLocked = false;
  // 会話をやり直すたびに進める。やり直す前に送った質問の回答が遅れて届いても、描画しない
  #conversation = 0;
  #previousOverflow = "";

  readonly #onViewportChange = (): void => this.#syncViewport();

  connectedCallback(): void {
    if (this.shadowRoot) return;
    this.#text = WIDGET_TEXT[resolveLanguage(this.getAttribute("lang"))];

    const root = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = WIDGET_STYLES;
    root.appendChild(style);

    const wrapper = element("div", "root");
    wrapper.append(this.#buildToggle(), this.#buildPanel());
    root.appendChild(wrapper);
    this.#rootEl = wrapper;
  }

  disconnectedCallback(): void {
    this.#watchViewport(false);
    this.#lockScroll(false);
  }

  #buildToggle(): HTMLButtonElement {
    const toggle = element("button", "toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "panel");
    toggle.innerHTML = CHAT_ICON;
    const label = element("span");
    label.textContent = this.#text.toggleLabel;
    toggle.appendChild(label);
    toggle.addEventListener("click", () => this.#setOpen(true));
    this.#toggleEl = toggle;
    return toggle;
  }

  #buildPanel(): HTMLElement {
    const heading = this.getAttribute("heading") ?? this.#text.headingText;

    const panel = element("section", "panel");
    panel.id = "panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", heading);
    panel.setAttribute("aria-hidden", "true");
    panel.inert = true;
    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.#setOpen(false);
    });

    const header = element("header", "header");
    const titles = element("div", "titles");
    const headingEl = element("div", "heading");
    headingEl.textContent = heading;
    const subheading = element("div", "subheading");
    subheading.textContent = this.#text.subheadingText;
    titles.append(headingEl, subheading);
    const close = element("button", "close");
    close.type = "button";
    close.setAttribute("aria-label", this.#text.closeLabel);
    close.innerHTML = CLOSE_ICON;
    close.addEventListener("click", () => this.#setOpen(false));
    const reset = element("button", "reset");
    reset.type = "button";
    reset.hidden = true;
    reset.setAttribute("aria-label", this.#text.resetLabel);
    reset.title = this.#text.resetLabel;
    reset.innerHTML = RESET_ICON;
    reset.addEventListener("click", () => this.#resetConversation());
    header.append(titles, reset, close);

    const messages = element("div", "messages");
    messages.setAttribute("aria-live", "polite");
    panel.append(header, messages, this.#buildForm());

    this.#panelEl = panel;
    this.#closeEl = close;
    this.#resetEl = reset;
    this.#messagesEl = messages;
    this.#renderIntro();
    return panel;
  }

  #renderIntro(): void {
    if (!this.#messagesEl) return;
    const greeting = this.getAttribute("greeting") ?? this.#text.greetingText;
    if (greeting.trim()) {
      const greetingEl = element("div", "greeting");
      greetingEl.textContent = greeting;
      this.#messagesEl.appendChild(greetingEl);
    }
    const suggestions = this.#buildSuggestions();
    if (suggestions) this.#messagesEl.appendChild(suggestions);
  }

  #resetConversation(): void {
    if (!this.#messagesEl) return;
    this.#conversation += 1;
    this.#messages = [];
    this.#setPending(false);
    this.#messagesEl.replaceChildren();
    this.#suggestionsEl = undefined;
    this.#renderIntro();
    if (this.#resetEl) this.#resetEl.hidden = true;
    if (this.#inputEl) this.#inputEl.value = "";
    this.#syncInput();
    if (matches(FINE_POINTER_QUERY)) this.#inputEl?.focus();
    else this.#closeEl?.focus({ preventScroll: true });
  }

  #buildSuggestions(): HTMLElement | undefined {
    const attr = this.getAttribute("suggestions");
    const items = (attr === null ? this.#text.suggestions : attr.split("|"))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (items.length === 0) return undefined;

    const list = element("div", "suggestions");
    for (const item of items) {
      const button = element("button");
      button.type = "button";
      button.textContent = item;
      button.addEventListener("click", () => void this.#sendMessage(item));
      list.appendChild(button);
    }
    this.#suggestionsEl = list;
    return list;
  }

  #buildForm(): HTMLFormElement {
    const form = element("form");
    const field = element("div", "field");

    const input = element("textarea");
    input.rows = 1;
    input.placeholder = this.#text.inputPlaceholder;
    input.setAttribute("aria-label", this.#text.inputPlaceholder);
    input.setAttribute("enterkeyhint", "send");
    input.addEventListener("input", () => this.#syncInput());
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      form.requestSubmit();
    });

    const send = element("button", "send");
    send.type = "submit";
    send.disabled = true;
    send.setAttribute("aria-label", this.#text.submitLabel);
    send.innerHTML = SEND_ICON;

    field.append(input, send);
    form.append(field, this.#buildDisclosure());
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value;
      input.value = "";
      this.#syncInput();
      void this.#sendMessage(text);
    });

    this.#inputEl = input;
    this.#sendEl = send;
    return form;
  }

  #buildDisclosure(): HTMLElement {
    const disclosure = element("p", "disclosure");
    disclosure.append(this.#text.disclosureText);

    const policyHref = this.getAttribute("policy-href");
    if (policyHref) {
      disclosure.append(" ");
      const link = element("a");
      link.href = policyHref;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = this.#text.policyLinkText;
      disclosure.appendChild(link);
    }
    return disclosure;
  }

  #setOpen(open: boolean): void {
    if (this.#open === open || !this.#rootEl || !this.#panelEl || !this.#toggleEl) return;
    this.#open = open;

    this.#rootEl.classList.toggle("open", open);
    this.#toggleEl.setAttribute("aria-expanded", String(open));
    this.#toggleEl.inert = open;
    this.#panelEl.setAttribute("aria-hidden", String(!open));
    this.#panelEl.inert = !open;
    this.#watchViewport(open);
    this.#lockScroll(open && matches(COMPACT_QUERY));

    if (open) {
      // タッチ端末で開いた瞬間にキーボードを出すと、パネルの登場とキーボードの動きが重なる
      if (matches(FINE_POINTER_QUERY)) this.#inputEl?.focus();
      else this.#closeEl?.focus({ preventScroll: true });
    } else {
      this.#inputEl?.blur();
      this.#toggleEl.focus({ preventScroll: true });
    }
  }

  #watchViewport(on: boolean): void {
    const viewport = window.visualViewport;
    if (!viewport) return;
    if (on) {
      viewport.addEventListener("resize", this.#onViewportChange);
      viewport.addEventListener("scroll", this.#onViewportChange);
      this.#syncViewport();
    } else {
      viewport.removeEventListener("resize", this.#onViewportChange);
      viewport.removeEventListener("scroll", this.#onViewportChange);
    }
  }

  #syncViewport(): void {
    const viewport = window.visualViewport;
    if (!viewport || !this.#panelEl) return;
    this.#panelEl.style.setProperty("--vv-height", `${viewport.height}px`);
    this.#panelEl.style.setProperty("--vv-top", `${viewport.offsetTop}px`);
    this.#scrollToEnd();
  }

  // 全画面表示中に背後のページがスクロールすると、iOS でパネルごと画面外へずれる
  #lockScroll(lock: boolean): void {
    if (lock === this.#scrollLocked) return;
    const rootStyle = document.documentElement.style;
    if (lock) {
      this.#previousOverflow = rootStyle.overflow;
      rootStyle.overflow = "hidden";
    } else {
      rootStyle.overflow = this.#previousOverflow;
    }
    this.#scrollLocked = lock;
  }

  #syncInput(): void {
    const input = this.#inputEl;
    if (!input || !this.#sendEl) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    this.#sendEl.disabled = this.#pending || input.value.trim().length === 0;
  }

  #setPending(pending: boolean): void {
    this.#pending = pending;
    this.#syncInput();
    if (pending && this.#messagesEl) {
      const typing = element("div", "typing");
      typing.setAttribute("role", "status");
      typing.setAttribute("aria-label", this.#text.typingLabel);
      typing.append(element("span"), element("span"), element("span"));
      this.#messagesEl.appendChild(typing);
      this.#typingEl = typing;
      this.#scrollToEnd();
    } else {
      this.#typingEl?.remove();
      this.#typingEl = undefined;
    }
  }

  async #sendMessage(rawText: string): Promise<void> {
    const text = rawText.trim();
    if (!text || this.#pending) return;

    this.#suggestionsEl?.remove();
    this.#suggestionsEl = undefined;
    this.#appendMessage({ role: "user", text });

    const endpoint = this.getAttribute("endpoint");
    if (!endpoint) {
      this.#appendMessage({ role: "assistant", text: this.#text.configErrorText });
      return;
    }

    const conversation = this.#conversation;
    this.#setPending(true);
    let answer: string;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const body = (await response.json()) as ChatResponseBody;
      answer = body.answer ?? this.#text.answerFallbackText;
    } catch {
      answer = this.#text.networkErrorText;
    }
    if (conversation !== this.#conversation) return;
    this.#setPending(false);
    this.#appendMessage({ role: "assistant", text: answer });
  }

  #appendMessage(message: ChatMessage): void {
    this.#messages.push(message);
    if (this.#resetEl) this.#resetEl.hidden = false;
    if (!this.#messagesEl) return;

    const el = element("div", `message ${message.role}`);
    el.textContent = message.text;
    this.#messagesEl.appendChild(el);
    this.#scrollToEnd();
  }

  #scrollToEnd(): void {
    if (this.#messagesEl) this.#messagesEl.scrollTop = this.#messagesEl.scrollHeight;
  }
}

export function defineFolioAgentWidget(tagName: string = FolioAgentWidgetElement.tagName): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, FolioAgentWidgetElement);
  }
}
