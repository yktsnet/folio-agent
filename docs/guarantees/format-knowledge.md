# format-knowledge

| 保証 | 対応テスト |
|---|---|
| このサイトの外のページ（`http(s)://`）を、タイトル・URL・本文で知識の文字列にする | `gives external pages their title and URL, and this site's pages only their name` |
| このサイトのページを、URL を付けず、名前と本文と「このサイトのページ」の目印で知識の文字列にする | `gives external pages their title and URL, and this site's pages only their name` |
| このサイトのページのタイトルに共通するサイト名の接尾辞を外す | `drops the site-name suffix shared by this site's page titles` |
| 1ページにしか無い接尾辞は外さない | `keeps a suffix that appears on only one page, since it may be part of that title` |
| `language` が `"en"` なら、目印を英語にする | `labels this site's pages in English with language en` |
