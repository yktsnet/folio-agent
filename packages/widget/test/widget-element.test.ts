import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

    expect(root.querySelector(".toggle")).not.toBeNull();
    expect(root.querySelector<HTMLElement>(".panel")?.hidden).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the disclosure line with a policy link only on first open", () => {
    const el = mount({ endpoint: "/api/chat", "policy-href": "/data-policy" });
    const root = shadow(el);

    root.querySelector<HTMLButtonElement>(".toggle")!.click();

    expect(root.querySelector<HTMLElement>(".panel")?.hidden).toBe(false);
    const disclosure = root.querySelector(".disclosure");
    expect(disclosure?.textContent).toContain("入力内容は品質改善のため記録されます");
    const link = disclosure?.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/data-policy");
    expect(link?.target).toBe("_blank");

    root.querySelector<HTMLButtonElement>(".toggle")!.click();
    root.querySelector<HTMLButtonElement>(".toggle")!.click();
    expect(root.querySelectorAll(".disclosure")).toHaveLength(1);
  });

  it("sends a message to the configured endpoint and renders the answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ answer: "こんにちは", route: "thoughts" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);
    root.querySelector<HTMLButtonElement>(".toggle")!.click();

    const input = root.querySelector<HTMLInputElement>("input")!;
    input.value = "Worksについて教えて";
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

    await Promise.resolve();
    await Promise.resolve();

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

  it("renders a friendly message when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const el = mount({ endpoint: "/api/chat" });
    const root = shadow(el);
    root.querySelector<HTMLButtonElement>(".toggle")!.click();

    const input = root.querySelector<HTMLInputElement>("input")!;
    input.value = "hi";
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

    await Promise.resolve();
    await Promise.resolve();

    const messages = root.querySelectorAll(".message.assistant");
    expect(messages[messages.length - 1].textContent).toMatch(/通信エラー/);
  });

  it("shows a config error and does not call fetch when endpoint is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const el = mount();
    const root = shadow(el);
    root.querySelector<HTMLButtonElement>(".toggle")!.click();

    const input = root.querySelector<HTMLInputElement>("input")!;
    input.value = "hi";
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
    const messages = root.querySelectorAll(".message.assistant");
    expect(messages[messages.length - 1].textContent).toMatch(/endpoint属性/);
  });

  describe("lang=en", () => {
    it("renders English placeholder, submit label, and disclosure text", () => {
      const el = mount({ endpoint: "/api/chat", lang: "en", "policy-href": "/data-policy" });
      const root = shadow(el);

      expect(root.querySelector<HTMLInputElement>("input")?.placeholder).toBe("Type a message");
      expect(root.querySelector<HTMLButtonElement>(".toggle")?.getAttribute("aria-label")).toBe("Open chat");
      expect(root.querySelector("form button[type='submit']")?.textContent).toBe("Send");

      root.querySelector<HTMLButtonElement>(".toggle")!.click();
      const disclosure = root.querySelector(".disclosure");
      expect(disclosure?.textContent).toContain("Your input is logged for quality improvement.");
      expect(disclosure?.querySelector("a")?.textContent).toBe("About data usage");
    });

    it("shows an English config error when endpoint is missing", async () => {
      const el = mount({ lang: "en" });
      const root = shadow(el);
      root.querySelector<HTMLButtonElement>(".toggle")!.click();

      const input = root.querySelector<HTMLInputElement>("input")!;
      input.value = "hi";
      root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

      await Promise.resolve();

      const messages = root.querySelectorAll(".message.assistant");
      expect(messages[messages.length - 1].textContent).toMatch(/endpoint attribute/);
    });

    it("shows an English network error message on fetch failure", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

      const el = mount({ endpoint: "/api/chat", lang: "en" });
      const root = shadow(el);
      root.querySelector<HTMLButtonElement>(".toggle")!.click();

      const input = root.querySelector<HTMLInputElement>("input")!;
      input.value = "hi";
      root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

      await Promise.resolve();
      await Promise.resolve();

      const messages = root.querySelectorAll(".message.assistant");
      expect(messages[messages.length - 1].textContent).toMatch(/network error/);
    });

    it("falls back to ja for an unrecognized lang attribute", () => {
      const el = mount({ endpoint: "/api/chat", lang: "fr" });
      const root = shadow(el);

      expect(root.querySelector<HTMLInputElement>("input")?.placeholder).toBe("メッセージを入力");
    });
  });
});
