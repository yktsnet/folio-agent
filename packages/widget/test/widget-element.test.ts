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
