# widget-element

## パネルの開閉と開示文言

| 保証 | 対応テスト |
|---|---|
| `<folio-agent-widget>` は初めは閉じたトグルボタンだけを見せる | `renders only a closed toggle button and makes no network call until clicked` |
| `<folio-agent-widget>` はクリックされるまでネットワークを呼ばない | `renders only a closed toggle button and makes no network call until clicked` |
| `<folio-agent-widget>` はトグルで開く | `opens with the toggle and closes with the close button or Escape` |
| `<folio-agent-widget>` は閉じるボタンと Esc キーで閉じる | `opens with the toggle and closes with the close button or Escape` |
| `<folio-agent-widget>` は開閉の状態を `aria-expanded`・`aria-hidden` に反映する | `opens with the toggle and closes with the close button or Escape` |
| `<folio-agent-widget>` はパネルに `policy-href` へのリンク付きの開示文言を出す | `shows the disclosure line with a policy link exactly once in the panel` |
| `<folio-agent-widget>` は何度開閉しても開示文言を複製しない | `shows the disclosure line with a policy link exactly once in the panel` |

## 見出し・案内文・質問候補

| 保証 | 対応テスト |
|---|---|
| `<folio-agent-widget>` は既定の案内文と質問候補を出す | `shows the default greeting and suggestions, and lets attributes override or remove them` |
| `<folio-agent-widget>` は `heading`・`greeting`・`suggestions` の属性で見出し・案内文・質問候補を差し替える | `shows the default greeting and suggestions, and lets attributes override or remove them` |
| `<folio-agent-widget>` は `greeting`・`suggestions` の属性を空にすると、案内文・質問候補を出さない | `shows the default greeting and suggestions, and lets attributes override or remove them` |
| `<folio-agent-widget>` はヘッダの2行目に既定の文言を出す | `shows the default subheading and lets the site replace it through the subheading slot` |
| `<folio-agent-widget>` はヘッダの2行目を `slot="subheading"` の要素で差し替えさせる | `shows the default subheading and lets the site replace it through the subheading slot` |

## 送信と会話

| 保証 | 対応テスト |
|---|---|
| `<folio-agent-widget>` は送信で `endpoint` 属性の URL へ `{ message }` を POST する | `sends a message to the configured endpoint and renders the answer` |
| `<folio-agent-widget>` はユーザーの発言と AI の回答を描く | `sends a message to the configured endpoint and renders the answer` |
| `<folio-agent-widget>` は質問候補がクリックされたら、その文言を送信する | `sends a suggestion when clicked and removes the suggestions` |
| `<folio-agent-widget>` は質問候補がクリックされたら、候補を消す | `sends a suggestion when clicked and removes the suggestions` |
| `<folio-agent-widget>` は回答を待つ間は入力中の表示を出す | `shows a typing indicator and disables sending until the answer arrives` |
| `<folio-agent-widget>` は回答を待つ間は送信ボタンを無効にする | `shows a typing indicator and disables sending until the answer arrives` |
| `<folio-agent-widget>` は「新しい会話」のボタンを発言があるときだけ出す | `shows the new-conversation button only after a message, and resets to the greeting and suggestions` |
| `<folio-agent-widget>` は「新しい会話」が押されたら案内文と質問候補の状態に戻る | `shows the new-conversation button only after a message, and resets to the greeting and suggestions` |
| `<folio-agent-widget>` は会話を最初の状態に戻す前に送った質問の回答を描かない | `drops an answer that arrives after the conversation was reset` |
| `<folio-agent-widget>` は通信に失敗したら通信エラーの文言を出す | `renders a friendly message when the network request fails` |
| `<folio-agent-widget>` は `endpoint` 属性が無ければ設定エラーの文言を出す | `shows a config error and does not call fetch when endpoint is missing` |
| `<folio-agent-widget>` は `endpoint` 属性が無ければ `fetch` を呼ばない | `shows a config error and does not call fetch when endpoint is missing` |

## 回答中のリンク

| 保証 | 対応テスト |
|---|---|
| `<folio-agent-widget>` は AI の回答の `[表示する文字](URL)` を、その文字のリンクとして描く | `renders [text](url) in answers as a link showing the text, not the URL` |
| `<folio-agent-widget>` は AI の回答にそのまま書かれた `http(s)://` の URL を、URL のリンクとして描く | `turns bare http(s) URLs in answers into links, leaving the rest as text` |
| `<folio-agent-widget>` は AI の回答のリンク以外の部分をテキストのまま描く | `turns bare http(s) URLs in answers into links, leaving the rest as text` |
| `<folio-agent-widget>` は AI の回答に含まれる HTML を解釈しない | `turns bare http(s) URLs in answers into links, leaving the rest as text` |
| `<folio-agent-widget>` はユーザーの発言をリンクにしない | `turns bare http(s) URLs in answers into links, leaving the rest as text` |
| `<folio-agent-widget>` はリンクにした URL の末尾の ASCII の句読点をリンクから外す | `drops trailing ASCII punctuation from a linked URL` |
| `<folio-agent-widget>` は同じサイト内のリンクを同じタブで開く | `opens same-origin links in the current tab and external links in a new tab` |
| `<folio-agent-widget>` は外部のリンクを新しいタブ（`noopener noreferrer`）で開く | `opens same-origin links in the current tab and external links in a new tab` / `turns bare http(s) URLs in answers into links, leaving the rest as text` |

## 表示の言語

| 保証 | 対応テスト |
|---|---|
| `<folio-agent-widget>` は `lang="en"` ならトグル・プレースホルダ・送信／閉じる／新しい会話のラベル・開示文言を英語で出す | `lang=en > renders English toggle, placeholder, submit label, and disclosure text` |
| `<folio-agent-widget>` は `lang="en"` なら設定エラーの文言を英語で出す | `lang=en > shows an English config error when endpoint is missing` |
| `<folio-agent-widget>` は `lang="en"` なら通信エラーの文言を英語で出す | `lang=en > shows an English network error message on fetch failure` |
| `<folio-agent-widget>` は対応していない `lang` 属性の値では日本語で出す | `lang=en > falls back to ja for an unrecognized lang attribute` |
