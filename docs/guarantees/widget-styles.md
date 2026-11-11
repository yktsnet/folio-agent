# widget-styles

## テーマのトークンと既定値

| 保証 | 対応テスト |
|---|---|
| `WIDGET_STYLES` はテーマのトークン（`--folio-agent-surface`・`text`・`muted`・`accent`・`accent-contrast`・`font`）を `var()` とフォールバックの値で参照する | `references %s via var() with a fallback` / `no longer hardcodes the themed colors without a var() fallback` |
| `WIDGET_STYLES` は `:host` にホストの `color`・`color-scheme` を継承させる | `makes :host adopt the host's color and color-scheme so system colors adapt` |
| `WIDGET_STYLES` は surface・text の既定値を CSS のシステムカラー（`Canvas`・`CanvasText`）から取る | `derives surface and text defaults from CSS system colors, and accent from text` |
| `WIDGET_STYLES` は accent の既定値を text から、accent-contrast の既定値を surface から取る | `derives surface and text defaults from CSS system colors, and accent from text` |

## 発言と入力欄の見た目

| 保証 | 対応テスト |
|---|---|
| `WIDGET_STYLES` はメッセージの改行を保つ | `preserves newlines in message bubbles` |
| `WIDGET_STYLES` はユーザーの発言の吹き出しの背景と枠線を、accent と surface の `color-mix` から作る | `derives the user bubble from accent and surface via color-mix, and gives assistant text no fill` |
| `WIDGET_STYLES` は AI の回答に塗りを付けない | `derives the user bubble from accent and surface via color-mix, and gives assistant text no fill` |
| `WIDGET_STYLES` は muted を開示文言とヘッダの2行目の補助テキストに使い、吹き出しには使わない | `keeps muted scoped to supplementary text only, not bubble backgrounds` / `derives the user bubble from accent and surface via color-mix, and gives assistant text no fill` |
| `WIDGET_STYLES` は文字の選択の背景色と入力欄のキャレットの色を、ブラウザの既定ではなく accent から作る | `derives the text selection color and the caret color from accent instead of the browser default` |
| `WIDGET_STYLES` は入力欄の文字の大きさを 16px にする（iOS Safari がフォーカスで拡大しない） | `keeps the input at 16px so iOS Safari does not zoom on focus` |
| `WIDGET_STYLES` は幅 640px 以下では全画面で開く | `goes full screen on narrow viewports, sized from the visual viewport` |
| `WIDGET_STYLES` は幅 640px 以下では、高さと上端を CSS 変数 `--vv-height`・`--vv-top`（表示領域の値を流し込む先）に従わせる | `goes full screen on narrow viewports, sized from the visual viewport` |
