## PR記録: feat: widgetの吹き出し背景をカスタムプロパティ優先のcolor-mixに変更
issue: 07 (07_widget-theming-robustness.md)
PR: https://github.com/yktsnet/folio-agent/pull/15
Merged: 636b8dc1c06fc346e2f204d1a6605fc4ed4c3bbd

## 変更内容

現在、`.message.assistant` / `.message.user` の吹き出し背景色は `Canvas` と `CanvasText` の `color-mix` に固定でブレンドされていた。ホスト側（導入サイト）が `color-scheme` を明示的に変更せず、クラス名（`.dark`）のみで `--folio-agent-text` 等をダークテーマ値に流し込んだ場合、吹き出し背景がライトモードの明るい色のままとなり、白文字とバッティングして視認できなくなる問題があった。

これを防ぐため、`packages/widget/src/styles.ts` の吹き出し背景・境界線の `color-mix` を、カスタムプロパティ（`--folio-agent-text` / `--folio-agent-surface`）優先・未指定時はシステムカラー（`CanvasText` / `Canvas`）へフォールバックする形に変更した。

```css
.message.assistant {
  background: color-mix(in srgb, var(--folio-agent-text, CanvasText) 8%, var(--folio-agent-surface, Canvas));
  border: 1px solid color-mix(in srgb, var(--folio-agent-text, CanvasText) 16%, var(--folio-agent-surface, Canvas));
}
.message.user {
  background: color-mix(in srgb, var(--folio-agent-text, CanvasText) 14%, var(--folio-agent-surface, Canvas));
  border: 1px solid color-mix(in srgb, var(--folio-agent-text, CanvasText) 24%, var(--folio-agent-surface, Canvas));
}
```

### Issueの「対象」フィールドからの逸脱について

Issueの対象は `packages/widget/src/styles.ts` のみだったが、`packages/widget/test/styles.test.ts` の既存テスト（`derives bubble background/border via color-mix instead of the muted token`）が「var()でラップしない生のCanvasText」を厳密にアサートしており、仕様変更後は必然的に失敗する。Issueの確認項目に `npm run test` が明記されているため、この既存テストを新仕様（var()優先のcolor-mix）に合わせて更新した。振る舞いの期待値を新仕様に追従させただけで、テストの検証意図（ミュートトークンを吹き出し背景に使わないこと）は変えていない。

## 静的確認結果

- `npm run typecheck`: 成功（エラーなし）
- `npm run test`: 63 tests passed（13 test files）。widgetのstyles.test.tsを含め全て成功
- `git diff --name-only HEAD~1`:
  ```
  packages/widget/src/styles.ts
  packages/widget/test/styles.test.ts
  ```
- コード読解: `WIDGET_STYLES` の呼び出し元は `packages/widget/src/widget-element.ts` の1箇所のみで、`style.textContent = WIDGET_STYLES` として文字列をそのまま注入している。今回の変更はCSS文字列の内容のみでインターフェース変更を伴わないため、caller側の修正は不要。

## 検証手順

- ロジック検証は静的解析（typecheck/test）で完結しており、実行系の確認は不要
- 目視でのテーマ確認をしたい場合は、`packages/handler/dev/README.md` の手順でdevハーネスを起動し、ホスト側に `.dark` クラス相当のカスタムプロパティ（`--folio-agent-text: #fff` など、`color-scheme` は変更しない）を注入した状態で吹き出しの文字が視認できることを確認する
