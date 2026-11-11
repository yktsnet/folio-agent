# Guarantee Ledger

このリポが外へ約束している振る舞いと、それを守るテストの一覧である。約束が破れればテストが落ちるので、
ここに書いたことは気づかないうちに実装とずれていかない。**ここに載っていない振る舞いは約束ではなく、予告なく変わりうる**。
対象は `packages/handler`・`packages/widget` の `src/index.ts` が公開する関数・定数・Web Component と、`packages/handler` の `bin` の CLI である。
そこで再公開していない内部の関数（`fileToUrlPath`・`estimateTokens`・`scanZennArticles`・`toPlainAnswer`・`buildCorrectionRequest`、`folio-agent-init` の引数の解釈と書き出しの部品など）は対象外とする。
ただし、ingest と `folio-agent-sync-github` が GitHub の README を集めて取る振る舞いは外から観測できるので、`github.md` に載せる。
地位は [docs/design-decisions.md](../design-decisions.md) と同格で、実装がこれと食い違えば指摘する。

- 目的: いま何を約束しているかを1か所で読む。変更の前に、守る約束をここから引く。テストの無い約束を Gaps に残す
- 分け方: 約束の対象（公開関数・Web Component・CLI のコマンド）ごとに1ファイル。テストファイルや Issue の単位では分けない。新しい対象を作ったときだけファイルを足す
- 書き方: 各ファイルに「保証｜対応テスト」の表を1つ置き、1行に約束を1つ、宣言文で書く。出典・経緯・設計の理由は書かない（`docs/design-decisions.md` が持つ）。目で確かめる画面の見た目と振る舞い、型検査、本物の Gemini で回答を確かめる `npm run eval` は載せない。約束が10行以上のファイルは、何についての約束かで `##` の見出しを立て、見出しごとに3行以上の表を置く。見出しは行の主語になる名詞句にする。10行未満のファイルには見出しを置かない（ファイルは分けない）。別のファイルに同じ名前のテストがあれば、`describe` の名前を前に付けて、行が1つに決まるようにする
- 引き方: Issue の「維持する保証」を挙げるときは、Issue の対象のファイルを開く。テストが落ちたら、テストの名前で台帳を検索すると、破れた約束の行が見つかる。約束が守られていることは、全テストを流す CI が確かめる。コードのファイルから約束を引く仕組みは置かない（実装とテストの名前は1対1でなく、機械では正確に引けない）
- 運用: 変更の前にこの README を読み、変更が触れるファイルから「維持する保証」を引く。約束を足す・変える・消すときは、Issue の保証節で承認を受けた文のまま、該当するファイルの表に行を足す・直す・消し、対応テストも同じ変更で直す。行を足して10行以上になったら、同じ変更で見出しを立てる。Issue や作業ごとにファイルや節を起こさない。テストの無い約束は Gaps に書き、テストを足したら移す。乖離は `guarantee-audit` で棚卸しする

## Files

| 約束の対象 |
|---|
| [chat-handler](chat-handler.md) |
| [chat-graph](chat-graph.md) |
| [system-prompt](system-prompt.md) |
| [gemini](gemini.md) |
| [route](route.md) |
| [rate-limit](rate-limit.md) |
| [answer-links](answer-links.md) |
| [generate-knowledge](generate-knowledge.md) |
| [format-knowledge](format-knowledge.md) |
| [url-matcher](url-matcher.md) |
| [html-to-text](html-to-text.md) |
| [github](github.md) |
| [cli-ingest](cli-ingest.md) |
| [cli-sync-zenn](cli-sync-zenn.md) |
| [cli-sync-github](cli-sync-github.md) |
| [cli-init](cli-init.md) |
| [widget-element](widget-element.md) |
| [widget-styles](widget-styles.md) |

