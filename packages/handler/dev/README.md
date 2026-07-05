# dev harness

`createChatHandler` を実際の D1 / Gemini API に対して手動検証するための使い捨てハーネス（npm には配布しない）。
サイトとAPIが同一デプロイになるv1の設計（JUDGE.md §9）に合わせて、`public/` を静的アセットとして同梱している。

```sh
# ウィジェットのビルド成果物を同梱（コミットしない、都度再生成）
rm -rf public/widget && cp -r ../../widget/dist public/widget

# マイグレーション適用（初回のみ）
npx wrangler d1 execute DB --local --file "$(pwd)/../migrations/0001_init.sql" --config "$(pwd)/wrangler.jsonc"

# 起動
npx wrangler dev --config "$(pwd)/wrangler.jsonc" --port 8799
```
