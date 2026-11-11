# system-prompt

## 全経路に共通の指示

| 保証 | 対応テスト |
|---|---|
| どの経路（thoughts・works・inquiry）でも、推測・創作せずサイトに記載が無いと伝える無捏造の原則を含む | `includes the no-fabrication principle for %s` |
| どの経路でも、Markdown を使わずプレーンテキストで書く指示を含む | `includes the plain-text output instruction for %s` |
| どの経路でも、2〜4文ごとに空行を入れる段落分けの指示を含む | `includes the paragraph-break instruction for %s` |
| どの経路でも、リンクを `[表示する文字](URL)` で書く指示を含む | `asks for [text](URL) links and names this site's pages instead of linking them, for %s` |
| どの経路でも、このサイトのページはリンクにせず名前で案内する指示を含む | `asks for [text](URL) links and names this site's pages instead of linking them, for %s` |
| どの経路でも、渡された knowledge の文字列を埋め込む | `embeds the knowledge for %s` |

## 経路ごとの指示と Contact の案内

| 保証 | 対応テスト |
|---|---|
| 経路ごとに異なる指示を出す | `switches route-specific instructions per route` |
| inquiry の指示には `contactUrl` が渡されればその URL を埋め込む | `embeds contactUrl into the inquiry instruction when provided` |
| inquiry の指示は `contactUrl` が無ければ既定の問い合わせの案内を使う | `keeps the existing inquiry wording when contactUrl is not provided` |
| `contactUrl` が渡されれば、どの経路でも Contact へのリンクの書き方の見本（`[Contactページ](URL)`）を含める | `gives the Contact link as an example to copy on every route when contactUrl is provided, for %s` |
| `contactUrl` が無ければ、Contact へのリンクの見本を含めない | `gives the Contact link as an example to copy on every route when contactUrl is provided, for %s` |

## 英語のプロンプト

| 保証 | 対応テスト |
|---|---|
| `language` が `"en"` なら、どの経路でも無捏造の原則を英語で含む | `language: en > includes the no-fabrication principle in English for %s` |
| `language` が `"en"` なら、どの経路でもプレーンテキストで書く指示を英語で含む | `language: en > includes the plain-text output instruction in English for %s` |
| `language` が `"en"` なら、どの経路でもリンクの書き方と、このサイトのページを名前で案内する指示を英語で含む | `language: en > asks for [text](URL) links in English for %s` |
| `language` が `"en"` なら、経路ごとの指示を英語で出し分ける | `language: en > switches route-specific instructions per route in English` |
| `language` が `"en"` なら、inquiry の指示に `contactUrl` を英語の案内とともに埋め込む | `language: en > embeds contactUrl into the English inquiry instruction when provided` |
| `language` が `"en"` なら、Contact へのリンクの見本（`[Contact page](URL)`）を英語で含める | `language: en > gives the Contact link example in English` |
| `language` が `"en"` なら、どの経路でも段落分けの指示を英語で含む | `language: en > includes the paragraph-break instruction in English for %s` |
| `language` が `"en"` なら、inquiry の指示は `contactUrl` が無ければ問い合わせの案内を英語で含む | `language: en > guides to the Contact page in English when contactUrl is not provided` |
| `language` が `"en"` なら、プロンプトに日本語の文言を混ぜない | `language: en > does not leak Japanese wording into English prompts` |
