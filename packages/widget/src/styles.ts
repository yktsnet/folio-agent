// テーマ注入: 利用側サイトのグローバルCSSで
//   folio-agent-widget { --folio-agent-accent: #...; }
// のようにカスタムプロパティを指定するとShadow DOM内に継承されテーマが反映される。
// 未指定の場合は各プロパティがホスト配色（CSSシステムカラー）から導出した値を使い、
// サイトのライト/ダークいずれの配色にも自動で馴染む。
export const WIDGET_STYLES = `
  :host {
    all: initial;
    color: inherit;
    color-scheme: inherit;
    font-family: var(--folio-agent-font, inherit);
  }
  .toggle {
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: var(--folio-agent-accent, CanvasText);
    color: var(--folio-agent-accent-contrast, Canvas);
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    z-index: 2147483000;
  }
  .panel {
    position: fixed;
    right: 20px;
    bottom: 88px;
    width: 320px;
    max-height: 420px;
    display: flex;
    flex-direction: column;
    background: var(--folio-agent-surface, Canvas);
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    z-index: 2147483000;
  }
  .panel[hidden] {
    display: none;
  }
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--folio-agent-text, CanvasText);
  }
  .message {
    white-space: pre-wrap;
  }
  .message.assistant {
    align-self: flex-start;
    background: color-mix(in srgb, CanvasText 8%, Canvas);
    border: 1px solid color-mix(in srgb, CanvasText 16%, Canvas);
    border-radius: 8px;
    padding: 10px 14px;
  }
  .message.user {
    align-self: flex-end;
    background: color-mix(in srgb, CanvasText 14%, Canvas);
    border: 1px solid color-mix(in srgb, CanvasText 24%, Canvas);
    border-radius: 8px;
    padding: 10px 14px;
  }
  .disclosure {
    font-size: 12px;
    color: var(--folio-agent-muted, color-mix(in srgb, CanvasText 55%, Canvas));
    padding: 0 0 4px;
  }
  .disclosure a {
    color: #2563eb;
  }
  form {
    display: flex;
    border-top: 1px solid color-mix(in srgb, CanvasText 16%, Canvas);
  }
  input {
    flex: 1;
    border: none;
    background: transparent;
    color: inherit;
    padding: 10px;
    font-size: 14px;
  }
  input:focus {
    outline: none;
  }
  button[type="submit"] {
    border: none;
    background: none;
    padding: 0 14px;
    cursor: pointer;
    color: var(--folio-agent-accent, CanvasText);
    font-weight: 600;
  }
`;
