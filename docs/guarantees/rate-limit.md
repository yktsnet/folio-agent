# rate-limit

| 保証 | 対応テスト |
|---|---|
| `checkRateLimit` は短期・長期のどちらの制限内でも許可する | `allows requests under both limits` |
| `checkRateLimit` は短期の上限に達したら `short_window` を理由に拒否する | `blocks once the short window max is reached` |
| `checkRateLimit` は短期のウィンドウの外でも長期の上限に達したら `long_window` を理由に拒否する | `blocks once the long window max is reached even if outside the short window` |
| `checkRateLimit` はレート制限の超過として記録したリクエストを数えない | `does not count logged rate-limited attempts towards the limit` |
| `checkRateLimit` は IP ごとに別々に数える | `tracks each IP independently` |
| `DEFAULT_RATE_LIMIT_CONFIG` の値は `{ shortWindowMinutes: 10, shortWindowMax: 6, longWindowHours: 12, longWindowMax: 12 }` である | `has the current declared rate limit values` |
