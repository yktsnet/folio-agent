## Contact誘導へのURL直接指定
id: 03
branch-slug: contact-url
github_issue: 6
status: close
type: feat
対象: packages/handler/src/chat/gemini.ts / packages/handler/src/chat/types.ts / packages/handler/src/index.ts / packages/handler/test/chat/gemini.test.ts
内容: PLAN.md §3で「Contact ページへ誘導（オプションでオン/オフ）」とあったが未実装だった点を、真偽値のトグルではなく`contactUrl`の値の有無で切り替える形で実装する。
確認: npm run typecheck / npm run test

---

## 背景

`inquiry`経路の誘導文言（`packages/handler/src/chat/gemini.ts`の`ROUTE_INSTRUCTIONS.inquiry`）は固定文字列で、Contactページの場所はLLMが知識（ingestした`dist/`の内容）から見つける前提になっている。オン/オフを切り替える設定は無い。

## 設計方針

真偽値のオン/オフではなく、`contactUrl`という値の有無で振る舞いを変える。

- `contactUrl`が指定されている: `inquiry`経路の指示文にそのURLを直接埋め込む。
- `contactUrl`が未指定: 現状のまま（知識内の情報にLLMが頼る、既存の生成文言をそのまま使う）。

「オフ」という概念自体を作らない。ONの解像度を上げる（正確なURLを渡す）だけの変更にする。

## 実装

`packages/handler/src/chat/gemini.ts`:

- `buildSystemPrompt`のシグネチャに第3引数`contactUrl?: string`を追加する: `buildSystemPrompt(knowledge: string, route: Exclude<ChatRoute, "rate_limited">, contactUrl?: string): string`
- `inquiry`の指示文をcontactUrlの有無で出し分ける:
  - あり: `` `訪問者は仕事の依頼・相談をしようとしています。簡潔に応じたうえで、Contactページ（${contactUrl}）への問い合わせを案内してください。` ``
  - 無し: 既存の文言のまま
- `GeminiGeneratorConfig`に`contactUrl?: string;`を追加し、`createGeminiGenerator`が生成する関数の中で`buildSystemPrompt`呼び出しに渡す。

`packages/handler/src/index.ts`: 型エクスポートは既存の`GeminiGeneratorConfig`がそのまま拡張されるので追加変更は無い（確認のみ）。

## テスト

`packages/handler/test/chat/gemini.test.ts`に追加:

- `contactUrl`を渡した場合、`inquiry`経路のプロンプトにそのURL文字列が含まれること。
- `contactUrl`を渡さない場合、既存のプロンプト内容（"Contact"という語を含む既存文言）が変わらないこと（後方互換の確認）。
- `thoughts` / `works`経路には`contactUrl`を渡してもプロンプトに影響しないこと。

## 制約

- `ChatHandlerConfig`（`handler.ts`）や`ChatRoute`型の変更は不要（`inquiry`という分類自体は変えない）。
- Contactページの有無を検知するロジック（知識をスキャンして自動発見する等）は作らない。値は呼び出し側が明示的に渡す。

---

## PR記録
PR: https://github.com/yktsnet/folio-agent/pull/5
Title: feat: Contact誘導へのURL直接指定
Merged: ec6176cb5bfe641664af0b65e39681f48a77f8f3

## 変更内容
PLAN.md §3の「Contactページへ誘導（オプションでオン/オフ）」を、真偽値のトグルではなく`contactUrl`の値の有無で切り替える形で実装した。

- `buildSystemPrompt`のシグネチャに第3引数`contactUrl?: string`を追加。
- `inquiry`経路の指示文を`contactUrl`の有無で出し分け（あり: URLを埋め込んだ文言 / 無し: 既存文言のまま）。
- `GeminiGeneratorConfig`に`contactUrl?: string`を追加し、`createGeminiGenerator`内の`buildSystemPrompt`呼び出しに伝播。
- 「オフ」という概念は作らず、ON時の解像度を上げるだけの変更にとどめた。

## 静的確認結果
- `npm run typecheck`: 成功
- `npm run test`: 55 tests passed（`gemini.test.ts`に3件追加: contactUrlありでURLが含まれる / contactUrlなしで既存文言を維持 / thoughts・works経路には影響しない）
- `packages/handler/src/index.ts`: 既存の`GeminiGeneratorConfig`型エクスポートがそのまま拡張されるため変更不要（Issue記載通り確認のみ）
- `dev/worker.ts`など既存呼び出し元との整合性を確認（`contactUrl`はオプショナルのため後方互換）

```
$ git diff --name-only HEAD~1
packages/handler/src/chat/gemini.ts
packages/handler/test/chat/gemini.test.ts
```

## 検証手順
ロジック変更のみで型・テストで完結するため、追加の実行確認は不要。
