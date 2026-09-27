import { afterEach, describe, expect, it, vi } from "vitest";
import { defineFolioAgentWidget, FolioAgentWidgetElement } from "../src/widget-element.js";

defineFolioAgentWidget();

function mount(attrs: Record<string, string> = {}): FolioAgentWidgetElement {
  const el = document.createElement(FolioAgentWidgetElement.tagName) as FolioAgentWidgetElement;
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  document.body.appendChild(el);
  return el;
}

function shadow(el: FolioAgentWidgetElement): ShadowRoot {
  const root = el.shadowRoot;
  if (!root) throw new Error("expected shadow root");
  return root;
}

function open(root: ShadowRoot): void {
  root.querySelector<HTMLButtonElement>(".toggle")!.click();
}

function submit(root: ShadowRoot, text: string): void {
  root.querySelector<HTMLTextAreaElement>("textarea")!.value = text;
  root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("FolioAgentWidgetElement", () => {
  it("renders only a closed toggle button and makes no network call until clicked", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);

    const toggle = root.querySelector(".toggle");
    expect(toggle?.textContent).toBe("質問する");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelector(".panel")?.getAttribute("aria-hidden")).toBe("true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens with the toggle and closes with the close button or Escape", () => {
    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);
    const toggle = root.querySelector(".toggle")!;
    const panel = root.querySelector<HTMLElement>(".panel")!;

    open(root);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(panel.getAttribute("aria-hidden")).toBe("false");

    root.querySelector<HTMLButtonElement>(".close")!.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel.getAttribute("aria-hidden")).toBe("true");

    open(root);
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(panel.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the disclosure line with a policy link exactly once in the panel", () => {
    const el = mount({ endpoint: "/api/chat", "policy-href": "/data-policy" });
    const root = shadow(el);

    open(root);

    const disclosure = root.querySelector(".disclosure");
    expect(disclosure?.textContent).toContain("入力内容は品質改善のため記録されます");
    const link = disclosure?.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/data-policy");
    expect(link?.target).toBe("_blank");

    root.querySelector<HTMLButtonElement>(".close")!.click();
    open(root);
    expect(root.querySelectorAll(".disclosure")).toHaveLength(1);
  });

  it("shows the default greeting and suggestions, and lets attributes override or remove them", () => {
    const defaults = shadow(mount({ endpoint: "/api/chat" }));
    expect(defaults.querySelector(".greeting")?.textContent).toContain("制作実績");
    expect(defaults.querySelectorAll(".suggestions button")).toHaveLength(3);
    expect(defaults.querySelector(".heading")?.textContent).toBe("このサイトについて質問");

    const custom = shadow(
      mount({ endpoint: "/api/chat", heading: "山田に質問", greeting: "何でもどうぞ", suggestions: "経歴は？ | 料金は？" }),
    );
    expect(custom.querySelector(".heading")?.textContent).toBe("山田に質問");
    expect(custom.querySelector(".greeting")?.textContent).toBe("何でもどうぞ");
    expect([...custom.querySelectorAll(".suggestions button")].map((b) => b.textContent)).toEqual([
      "経歴は？",
      "料金は？",
    ]);

    const bare = shadow(mount({ endpoint: "/api/chat", greeting: "", suggestions: "" }));
    expect(bare.querySelector(".greeting")).toBeNull();
    expect(bare.querySelector(".suggestions")).toBeNull();
  });

  it("sends a message to the configured endpoint and renders the answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ answer: "こんにちは", route: "thoughts" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);
    open(root);
    submit(root, "Worksについて教えて");
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ message: "Worksについて教えて" }),
      }),
    );

    const messages = root.querySelectorAll(".message");
    expect(messages[0].textContent).toBe("Worksについて教えて");
    expect(messages[0].className).toContain("user");
    expect(messages[1].textContent).toBe("こんにちは");
    expect(messages[1].className).toContain("assistant");
  });

  it("sends a suggestion when clicked and removes the suggestions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ answer: "ok" }) });
    vi.stubGlobal("fetch", fetchMock);

    const el = mount({ endpoint: "/api/chat", suggestions: "経歴は？" });
    const root = shadow(el);
    open(root);
    root.querySelector<HTMLButtonElement>(".suggestions button")!.click();
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ body: JSON.stringify({ message: "経歴は？" }) }),
    );
    expect(root.querySelector(".suggestions")).toBeNull();
  });

  it("shows a typing indicator and disables sending until the answer arrives", async () => {
    let resolveFetch!: (value: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((resolve) => (resolveFetch = resolve))),
    );

    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);
    open(root);
    submit(root, "hi");

    const textarea = root.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "next";
    textarea.dispatchEvent(new Event("input"));
    expect(root.querySelector(".typing")).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".send")!.disabled).toBe(true);

    resolveFetch({ json: () => Promise.resolve({ answer: "done" }) });
    await flush();

    expect(root.querySelector(".typing")).toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".send")!.disabled).toBe(false);
  });

  it("shows the new-conversation button only after a message, and resets to the greeting and suggestions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: () => Promise.resolve({ answer: "ok" }) }));

    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);
    open(root);
    const reset = root.querySelector<HTMLButtonElement>(".reset")!;
    expect(reset.hidden).toBe(true);
    expect(reset.getAttribute("aria-label")).toBe("新しい会話");

    submit(root, "hi");
    await flush();
    expect(reset.hidden).toBe(false);

    reset.click();
    expect(root.querySelectorAll(".message")).toHaveLength(0);
    expect(root.querySelector(".greeting")).not.toBeNull();
    expect(root.querySelectorAll(".suggestions button")).toHaveLength(3);
    expect(reset.hidden).toBe(true);
  });

  it("drops an answer that arrives after the conversation was reset", async () => {
    let resolveFetch!: (value: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((resolve) => (resolveFetch = resolve))),
    );

    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);
    open(root);
    submit(root, "hi");
    root.querySelector<HTMLButtonElement>(".reset")!.click();
    expect(root.querySelector(".typing")).toBeNull();

    resolveFetch({ json: () => Promise.resolve({ answer: "late" }) });
    await flush();

    expect(root.querySelectorAll(".message")).toHaveLength(0);
    const textarea = root.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "next";
    textarea.dispatchEvent(new Event("input"));
    expect(root.querySelector<HTMLButtonElement>(".send")!.disabled).toBe(false);
  });

  it("renders [text](url) in answers as a link showing the text, not the URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ answer: "経緯は[請求書ツールを作り直した話](https://zenn.dev/foo/articles/bar)にまとめています。" }),
      }),
    );

    const root = shadow(mount({ endpoint: "/api/chat" }));
    open(root);
    submit(root, "hi");
    await flush();

    const answer = root.querySelector(".message.assistant")!;
    const link = answer.querySelector("a")!;
    expect(link.textContent).toBe("請求書ツールを作り直した話");
    expect(link.getAttribute("href")).toBe("https://zenn.dev/foo/articles/bar");
    expect(answer.textContent).toBe("経緯は請求書ツールを作り直した話にまとめています。");
  });

  it("turns bare http(s) URLs in answers into links, leaving the rest as text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            answer: "詳しくは https://zenn.dev/foo/articles/bar をどうぞ。Contact（https://example.com/contact）へ。<b>x</b> javascript:alert(1)",
          }),
      }),
    );

    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);
    open(root);
    submit(root, "https://example.com/in-question");
    await flush();

    const answer = root.querySelector(".message.assistant")!;
    const links = [...answer.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "https://zenn.dev/foo/articles/bar",
      "https://example.com/contact",
    ]);
    expect(links.every((a) => a.target === "_blank" && a.rel === "noopener noreferrer")).toBe(true);
    expect(answer.textContent).toContain("<b>x</b> javascript:alert(1)");
    expect(answer.querySelector("b")).toBeNull();
    expect(root.querySelector(".message.user a")).toBeNull();
  });

  it("opens same-origin links in the current tab and external links in a new tab", async () => {
    const sameOrigin = `${window.location.origin}/contact/`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ answer: `Contact は ${sameOrigin} 、記事は https://zenn.dev/foo です` }),
      }),
    );

    const root = shadow(mount({ endpoint: "/api/chat" }));
    open(root);
    submit(root, "hi");
    await flush();

    const [contact, zenn] = root.querySelectorAll<HTMLAnchorElement>(".message.assistant a");
    expect(contact.getAttribute("href")).toBe(sameOrigin);
    expect(contact.hasAttribute("target")).toBe(false);
    expect(zenn.target).toBe("_blank");
  });

  it("drops trailing ASCII punctuation from a linked URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ answer: "See https://example.com/a." }) }),
    );

    const root = shadow(mount({ endpoint: "/api/chat" }));
    open(root);
    submit(root, "hi");
    await flush();

    const answer = root.querySelector(".message.assistant")!;
    expect(answer.querySelector("a")?.getAttribute("href")).toBe("https://example.com/a");
    expect(answer.textContent).toBe("See https://example.com/a.");
  });

  it("shows the default subheading and lets the site replace it through the subheading slot", () => {
    const root = shadow(mount({ endpoint: "/api/chat" }));
    const slot = root.querySelector<HTMLSlotElement>(".subheading slot[name='subheading']")!;
    expect(slot.textContent).toBe("公開している情報をもとに AI が答えます");

    const el = document.createElement(FolioAgentWidgetElement.tagName);
    el.innerHTML = '<span slot="subheading">このサイトと <a href="https://zenn.dev/foo">Zenn</a> の記事をもとに答えます</span>';
    document.body.appendChild(el);
    const assigned = el.shadowRoot!.querySelector<HTMLSlotElement>("slot[name='subheading']")!.assignedElements();
    expect(assigned).toHaveLength(1);
    expect(assigned[0].querySelector("a")?.getAttribute("href")).toBe("https://zenn.dev/foo");
  });

  it("renders a friendly message when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);
    open(root);
    submit(root, "hi");
    await flush();

    const messages = root.querySelectorAll(".message.assistant");
    expect(messages[messages.length - 1].textContent).toMatch(/通信エラー/);
  });

  it("shows a config error and does not call fetch when endpoint is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const el = mount();
    const root = shadow(el);
    open(root);
    submit(root, "hi");
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    const messages = root.querySelectorAll(".message.assistant");
    expect(messages[messages.length - 1].textContent).toMatch(/endpoint属性/);
  });

  describe("lang=en", () => {
    it("renders English toggle, placeholder, submit label, and disclosure text", () => {
      const el = mount({ endpoint: "/api/chat", lang: "en", "policy-href": "/data-policy" });
      const root = shadow(el);

      expect(root.querySelector("textarea")?.placeholder).toBe("Type a question");
      expect(root.querySelector(".toggle")?.textContent).toBe("Ask");
      expect(root.querySelector(".send")?.getAttribute("aria-label")).toBe("Send");
      expect(root.querySelector(".close")?.getAttribute("aria-label")).toBe("Close");
      expect(root.querySelector(".reset")?.getAttribute("aria-label")).toBe("New conversation");

      open(root);
      const disclosure = root.querySelector(".disclosure");
      expect(disclosure?.textContent).toContain("Your input is logged for quality improvement.");
      expect(disclosure?.querySelector("a")?.textContent).toBe("About data usage");
    });

    it("shows an English config error when endpoint is missing", async () => {
      const el = mount({ lang: "en" });
      const root = shadow(el);
      open(root);
      submit(root, "hi");
      await flush();

      const messages = root.querySelectorAll(".message.assistant");
      expect(messages[messages.length - 1].textContent).toMatch(/endpoint attribute/);
    });

    it("shows an English network error message on fetch failure", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

      const el = mount({ endpoint: "/api/chat", lang: "en" });
      const root = shadow(el);
      open(root);
      submit(root, "hi");
      await flush();

      const messages = root.querySelectorAll(".message.assistant");
      expect(messages[messages.length - 1].textContent).toMatch(/network error/);
    });

    it("falls back to ja for an unrecognized lang attribute", () => {
      const el = mount({ endpoint: "/api/chat", lang: "fr" });
      const root = shadow(el);

      expect(root.querySelector("textarea")?.placeholder).toBe("質問を入力");
    });
  });
});
