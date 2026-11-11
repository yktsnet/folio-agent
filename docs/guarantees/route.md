# route

| 保証 | 対応テスト |
|---|---|
| 依頼・見積もりの文言を inquiry に分類する | `routes inquiry-shaped messages to inquiry` |
| Works に関する文言を works に分類する | `routes works-shaped messages to works` |
| どれにも当たらない文言を thoughts に分類する | `defaults to thoughts` |
| `language` が `"en"` でも、英語の文言を同じ3つの経路に分類する | `language: en > routes inquiry-shaped messages to inquiry` / `language: en > routes works-shaped messages to works` / `language: en > defaults to thoughts` |
