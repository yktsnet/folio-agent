## レート制限の緩和と、制限ヒット時の納得感あるメッセージ化
id: 15
branch-slug: rate-limit-tuning-and-honest-messaging
github_issue:
status: open
type: feat
対象:
- packages/handler/src/chat/types.ts（`RateLimitConfig`型・`DEFAULT_RATE_LIMIT_CONFIG`・`RateLimitReason`を変更）
- packages/handler/src/chat/rate-limit.ts（日次固定窓のハードコードを可変窓に一般化）
- packages/handler/src/chat/graph.ts（`OVER_LIMIT_MESSAGE`に実際にヒットした制限の具体的数値を埋め込む）
- packages/handler/test/chat/rate-limit.test.ts（新設定値・新reasonに追従）
- packages/handler/test/chat/graph.test.ts（新メッセージ文言のアサーションに追従）
- docs/design-decisions.md（「レート制限をD1ログの集計で行う理由」の記述を新挙動に合わせて更新）
確認: npm run typecheck / npm run test

---

### 背景

現状の`DEFAULT_RATE_LIMIT_CONFIG`（types.ts:13-17）は `shortWindowMinutes: 10, shortWindowMax: 3, dailyMax: 10` で、`dailyMax`は`rate-limit.ts`内で`DAY_MS = 24 * 60 * MINUTE_MS`という24時間固定窓としてハードコードされている（configで窓の長さ自体は変えられない）。

利用者（yktsnet／portfolio-astro運営者）からの要望:

1. 短時間側の上限が3問/10分だと枯渇が早い。**6問/10分**にしたい。
2. 「日次リセット」ではなく**12時間窓でリセット・上限12問**にしたい。現状の実装は窓の長さが24時間に固定されているため、単なる数値変更では対応できず、窓の長さ自体を設定可能にする一般化が要る。
3. レート制限に達したときのメッセージ（graph.ts:11-14の`OVER_LIMIT_MESSAGE`）が「直近の質問数の上限に達しました。お急ぎの場合はContactからお問い合わせください。」のように、何にどれだけ達したのか一切説明がなく無愛想。**制限にヒットしたときだけ**、実際にヒットした制限の具体的な数値（何問/何分、または何問/何時間）を伝え、納得感のある文言にしたい。**制限にヒットする前から上限の話を持ち出す必要はない**（バナー表示等は不要）。

なお`docs/design-decisions.md`の「レート制限をD1ログの集計で行う理由」には現状「上限は事前に掲げず、超過時に『上限に達しました。お急ぎはContactへ』と返して誘導に転化する」と明記されており、これは今回の要望3で意図的に変更する対象。実装だけでなくこの設計判断の記述も新しい挙動に合わせて書き換えること（同ドキュメントは「実装がこれと食い違う場合は指摘する」正としての位置づけのため、記述を残したままにしない）。

### 仕様

**1. `RateLimitConfig`の一般化（types.ts）**

`dailyMax`という命名・24時間固定を、時間指定可能な「長時間窓」に一般化する。

```ts
export interface RateLimitConfig {
  shortWindowMinutes: number;
  shortWindowMax: number;
  longWindowHours: number;
  longWindowMax: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  shortWindowMinutes: 10,
  shortWindowMax: 6,
  longWindowHours: 12,
  longWindowMax: 12,
};

export type RateLimitReason = "short_window" | "long_window";
```

`RateLimitReason`の値`"daily"`は`"long_window"`に改名する（利用箇所は本Issueの対象ファイル内で完結するため破壊的変更として扱ってよい。npm未リリースの新規挙動として次バージョンに含める）。

**2. `rate-limit.ts`の一般化**

`DAY_MS`のハードコードと`dailyCount`/`dailyStart`のロジックを、`config.longWindowHours`を使った可変窓に置き換える。`countSince`関数自体は流用可能。ブロック時の`reason`は`"long_window"`を返す。

**3. `graph.ts`のメッセージに具体的数値を埋め込む**

`buildChatGraph`が受け取る`deps`（`ChatGraphDeps`、types.ts）に`rateLimitConfig: RateLimitConfig`を追加し、`handler.ts`の`buildChatGraph`呼び出しで`config.rateLimitConfig ?? DEFAULT_RATE_LIMIT_CONFIG`を渡す。

`OVER_LIMIT_MESSAGE`を、`reason`に応じて実際の数値を文中に組み込む形に変更する。日英両方で以下の情報を含めること:

- `reason === "short_window"`: 短時間窓の上限（`shortWindowMax`件 / `shortWindowMinutes`分）
- `reason === "long_window"`: 長時間窓の上限（`longWindowMax`件 / `longWindowHours`時間）

文言のトーンは「なぜ制限されたか利用者が納得できる」ことを目的とし、事務的な無愛想さを避ける。最後にContactページへの案内は維持する。

`GENERATION_FAILED_MESSAGE`（Gemini呼び出し自体が失敗した場合の汎用フォールバック文言）は**今回の変更対象外**。こちらは実際のレート制限ヒットとは別の経路（generateAnswerの例外catch）であり、意図的に原因を曖昧にしている既存の設計のため、そのまま維持する。

**4. テスト**

`rate-limit.test.ts`・`graph.test.ts`内の`CONFIG`定数・期待値（`shortWindowMax: 3`→`6`、`dailyMax`→`longWindowHours`/`longWindowMax`、`reason: "daily"`→`"long_window"`、メッセージの正規表現アサーション）を新仕様に合わせて更新する。既存のテスト構造（IPごとの独立性、rate_limitedログはカウント対象外、等）はそのまま維持してよい。

**5. ドキュメント**

`docs/design-decisions.md`の該当セクションを、「上限自体は事前に掲げないが、ヒット時は実際に達した制限の内容を伝えて納得感を優先する」という新しい設計判断に書き換える。

### スコープ外

- portfolio-astro側の追従（`@folio-agent/handler`の依存バージョン更新）は本Issueのスコープ外。ライブラリのデフォルト値変更のため、リリース後にportfolio-astro側でバージョンを上げれば自動的に反映される。
