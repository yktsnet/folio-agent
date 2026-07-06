## widgetのテーマ変数対応と視認性の堅牢化
id: 07
branch-slug: feat/widget-theming-robustness
github_issue: 16
status: close
type: feat
対象: packages/widget/src/styles.ts
内容: 吹き出し背景のブレンド元をシステムカラー固定からカスタムプロパティ（--folio-agent-*）優先に変更し、ホスト側のcolor-schemeとズレがあっても文字が視認できるようにする。
確認: npm run typecheck / npm run test

---

### 背景と課題

現在、`.message.assistant` や `.message.user` の吹き出し背景色は `Canvas` と `CanvasText` の `color-mix` に依存しています。
しかし、ホスト側（導入サイト）が `color-scheme` プロパティを明示的にダークモード（`color-scheme: dark`）に変更せず、クラス名（`.dark`）のみでダークテーマの文字色（`--folio-agent-text: #fff` など）を流し込んだ場合、吹き出し背景がライトモードの明るい色のままになり、白い文字とバッティングして文字が見えなくなります。

これを防ぐため、吹き出しの背景・境界線の計算において、カスタムプロパティを優先してブレンドするように変更します。

### 仕様詳細

#### 変更対象のCSS設計

`packages/widget/src/styles.ts` の吹き出しスタイルを以下のように変更します。

```css
.message.assistant {
  /* --folio-agent-text と --folio-agent-surface を優先し、未指定時はシステムカラーへフォールバック */
  background: color-mix(in srgb, var(--folio-agent-text, CanvasText) 8%, var(--folio-agent-surface, Canvas));
  border: 1px solid color-mix(in srgb, var(--folio-agent-text, CanvasText) 16%, var(--folio-agent-surface, Canvas));
}
.message.user {
  background: color-mix(in srgb, var(--folio-agent-text, CanvasText) 14%, var(--folio-agent-surface, Canvas));
  border: 1px solid color-mix(in srgb, var(--folio-agent-text, CanvasText) 24%, var(--folio-agent-surface, Canvas));
}
```

これにより、利用側が独自にカスタムプロパティ（例: `--folio-agent-text` や `--folio-agent-surface`）を指定している場合、吹き出しの背景色も自動的にそのテーマに沿った明るさでブレンドされ、視認性のバグが発生しなくなります。
