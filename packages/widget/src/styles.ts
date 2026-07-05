// テーマ注入: 利用側サイトのグローバルCSSで
//   folio-agent-widget { --folio-agent-accent: #...; }
// のようにカスタムプロパティを指定するとShadow DOM内に継承されテーマが反映される。
// 未指定の場合は各プロパティのフォールバック値（現行デザイン）がそのまま使われる。
export const WIDGET_STYLES = `
  :host {
    all: initial;
    font-family: var(--folio-agent-font, system-ui, sans-serif);
  }
  .toggle {
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: var(--folio-agent-accent, #1f2937);
    color: var(--folio-agent-accent-contrast, #fff);
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
    background: var(--folio-agent-surface, #fff);
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
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--folio-agent-text, #111827);
  }
  .message.assistant {
    align-self: flex-start;
    background: var(--folio-agent-muted, #f3f4f6);
    border-radius: 8px;
    padding: 6px 10px;
  }
  .message.user {
    align-self: flex-end;
    background: var(--folio-agent-accent, #1f2937);
    color: var(--folio-agent-accent-contrast, #fff);
    border-radius: 8px;
    padding: 6px 10px;
  }
  .disclosure {
    font-size: 12px;
    color: var(--folio-agent-muted, #6b7280);
    padding: 0 0 4px;
  }
  .disclosure a {
    color: #2563eb;
  }
  form {
    display: flex;
    border-top: 1px solid #e5e7eb;
  }
  input {
    flex: 1;
    border: none;
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
    color: var(--folio-agent-accent, #1f2937);
    font-weight: 600;
  }
`;
