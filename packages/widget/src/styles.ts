// テーマ注入: 利用側サイトのグローバルCSSで
//   folio-agent-widget { --folio-agent-accent: #...; }
// のようにカスタムプロパティを指定するとShadow DOM内に継承されテーマが反映される。
// 決めるのは surface / text / accent の3色で足り、境界線・吹き出し・入力欄などは
// すべてこの3色から color-mix で導出する。未指定の場合はホスト配色（CSSシステムカラー）
// から導出し、サイトのライト/ダークいずれの配色にも自動で馴染む。
export const WIDGET_STYLES = `
  :host {
    all: initial;
    color: inherit;
    color-scheme: inherit;
    font-family: var(--folio-agent-font, inherit);

    --_surface: var(--folio-agent-surface, Canvas);
    --_text: var(--folio-agent-text, CanvasText);
    --_accent: var(--folio-agent-accent, var(--_text));
    --_accent-contrast: var(--folio-agent-accent-contrast, var(--_surface));
    --_muted: var(--folio-agent-muted, color-mix(in srgb, var(--_text) 62%, var(--_surface)));
    --_hair: color-mix(in srgb, var(--_text) 12%, transparent);
    --_glass: color-mix(in srgb, var(--_surface) 76%, transparent);
    --_glass-strong: color-mix(in srgb, var(--_surface) 94%, transparent);
    --_field: color-mix(in srgb, var(--_text) 5%, color-mix(in srgb, var(--_surface) 80%, transparent));
    --_chip: color-mix(in srgb, var(--_surface) 60%, transparent);
    --_focus: color-mix(in srgb, var(--_accent) 70%, var(--_text));
  }
  * {
    box-sizing: border-box;
  }
  button,
  textarea {
    font: inherit;
  }
  svg {
    display: block;
  }

  .toggle {
    position: fixed;
    right: 20px;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    z-index: 2147483000;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 46px;
    padding: 0 18px 0 14px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--_accent-contrast) 14%, transparent);
    background: color-mix(in srgb, var(--_accent) 88%, transparent);
    -webkit-backdrop-filter: blur(16px) saturate(1.6);
    backdrop-filter: blur(16px) saturate(1.6);
    color: var(--_accent-contrast);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(16, 20, 28, 0.22);
    transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease;
  }
  .toggle:hover {
    transform: translateY(-1px);
  }
  .toggle:active {
    transform: scale(0.97);
  }
  .toggle svg {
    width: 20px;
    height: 20px;
    flex: none;
  }
  .root.open .toggle {
    opacity: 0;
    transform: scale(0.85);
    pointer-events: none;
  }

  .panel {
    position: fixed;
    right: 20px;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    z-index: 2147483001;
    width: min(400px, calc(100vw - 40px));
    height: min(620px, calc(100dvh - 40px));
    display: flex;
    flex-direction: column;
    border-radius: 22px;
    border: 1px solid var(--_hair);
    background: var(--_glass);
    -webkit-backdrop-filter: blur(28px) saturate(1.8);
    backdrop-filter: blur(28px) saturate(1.8);
    box-shadow: 0 24px 64px rgba(16, 20, 28, 0.2), 0 2px 6px rgba(16, 20, 28, 0.08);
    color: var(--_text);
    overflow: hidden;
    transform-origin: calc(100% - 40px) calc(100% - 20px);
    opacity: 0;
    visibility: hidden;
    transform: translateY(10px) scale(0.9);
    transition:
      opacity 0.2s ease,
      transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1),
      visibility 0s linear 0.32s;
  }
  .root.open .panel {
    opacity: 1;
    visibility: visible;
    transform: none;
    transition:
      opacity 0.22s ease,
      transform 0.38s cubic-bezier(0.2, 0.9, 0.25, 1.05),
      visibility 0s;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 12px 12px 18px;
    border-bottom: 1px solid var(--_hair);
  }
  .titles {
    flex: 1;
    min-width: 0;
  }
  .heading {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.3;
  }
  .subheading {
    font-size: 12px;
    line-height: 1.4;
    color: var(--_muted);
  }
  .close {
    flex: none;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: color-mix(in srgb, var(--_text) 7%, transparent);
    color: var(--_text);
    cursor: pointer;
  }
  .close:hover {
    background: color-mix(in srgb, var(--_text) 12%, transparent);
  }
  .close svg {
    width: 16px;
    height: 16px;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 18px 18px 8px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-size: 15px;
    line-height: 1.7;
  }
  .message,
  .greeting {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    animation: fade-in 0.28s ease both;
  }
  .message.assistant,
  .greeting {
    align-self: stretch;
  }
  .message.user {
    align-self: flex-end;
    max-width: 85%;
    padding: 8px 14px;
    border-radius: 18px 18px 6px 18px;
    background: color-mix(in srgb, var(--_accent) 14%, var(--_surface));
    border: 1px solid color-mix(in srgb, var(--_accent) 28%, var(--_surface));
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: none; }
  }

  .suggestions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .suggestions button {
    padding: 7px 14px;
    border: 1px solid var(--_hair);
    border-radius: 999px;
    background: var(--_chip);
    color: var(--_text);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .suggestions button:hover {
    background: color-mix(in srgb, var(--_text) 8%, transparent);
  }

  .typing {
    display: inline-flex;
    gap: 5px;
    padding: 8px 0;
  }
  .typing span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--_muted);
    animation: typing-dot 1.1s ease-in-out infinite;
  }
  .typing span:nth-child(2) {
    animation-delay: 0.15s;
  }
  .typing span:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes typing-dot {
    0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
    40% { opacity: 1; transform: translateY(-3px); }
  }

  form {
    padding: 8px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  }
  .field {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 6px 6px 6px 14px;
    border: 1px solid var(--_hair);
    border-radius: 22px;
    background: var(--_field);
    transition: border-color 0.15s ease;
  }
  .field:focus-within {
    border-color: color-mix(in srgb, var(--_text) 32%, transparent);
  }
  textarea {
    flex: 1;
    min-width: 0;
    max-height: 144px;
    padding: 6px 0;
    border: 0;
    outline: 0;
    resize: none;
    background: transparent;
    color: var(--_text);
    /* 16px 未満だと iOS Safari がフォーカス時にページを拡大する */
    font-size: 16px;
    line-height: 1.5;
  }
  textarea::placeholder {
    color: var(--_muted);
  }
  .send {
    flex: none;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: var(--_accent);
    color: var(--_accent-contrast);
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .send:disabled {
    opacity: 0.25;
    cursor: default;
  }
  .send:not(:disabled):active {
    transform: scale(0.92);
  }
  .send svg {
    width: 18px;
    height: 18px;
  }
  .disclosure {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 1.5;
    text-align: center;
    color: var(--_muted);
  }
  .disclosure a {
    color: inherit;
  }

  .toggle:focus-visible,
  .close:focus-visible,
  .send:focus-visible,
  .suggestions button:focus-visible {
    outline: 2px solid var(--_focus);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    .toggle {
      right: 16px;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }
    /* 高さと上端は visualViewport から JS が流し込む。キーボード表示中も入力欄を見える位置に保つため */
    .panel {
      top: var(--vv-top, 0px);
      right: 0;
      bottom: auto;
      left: 0;
      width: 100%;
      height: var(--vv-height, 100dvh);
      border: 0;
      border-radius: 0;
      background: var(--_glass-strong);
      transform-origin: 50% 100%;
      transform: translateY(32px);
    }
    .header {
      padding-top: calc(12px + env(safe-area-inset-top, 0px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle,
    .panel,
    .root.open .panel {
      transform: none;
    }
    .panel {
      transition: opacity 0.15s linear, visibility 0s linear 0.15s;
    }
    .root.open .panel {
      transition: opacity 0.15s linear;
    }
    .message,
    .greeting,
    .typing span {
      animation: none;
    }
  }
`;
