# @folio-agent/widget

ポートフォリオ受付チャットボットのフロントエンド Web Component。クリックされるまで沈黙し、フレームワーク非依存（Shadow DOM）で導入先の CSS と衝突しない。

`@folio-agent/handler` とセットで使う。詳細（アーキテクチャ・設計判断・利用手順全体）はリポジトリの [README](https://github.com/yktsnet/folio-agent#readme) を参照。

## Usage

```bash
npm install @folio-agent/widget
```

```html
<folio-agent-widget endpoint="/api/chat" policy-href="/data-policy"></folio-agent-widget>
<script type="module">
  import { defineFolioAgentWidget } from "@folio-agent/widget";
  defineFolioAgentWidget();
</script>
```

配色・フォントは CSS カスタムプロパティ6トークン（`--folio-agent-surface` / `text` / `muted` / `accent` / `accent-contrast` / `font`）で上書きできる。未指定時はホストの配色に合わせる。変える場合も `surface` / `text` / `accent` の3色で足り、残りはこの3色から導出する。

UI 文言は `lang="en"` 属性で英語に切り替えられる（未指定は日本語）。パネルの見出し・案内文・質問候補は `heading` / `greeting` / `suggestions`（`|` 区切り）属性で差し替えられる。ヘッダ2行目（何をもとに答えるか）は `slot="subheading"` の要素で差し替えられ、リンクも書ける。

回答はプレーンテキストで描き、handler が返す `[表示する文字](URL)` だけをその文字のリンクにする（HTML は解釈しない）。同じサイト内は同じタブ、外部は新しいタブで開く。
