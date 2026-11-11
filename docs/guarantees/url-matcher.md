# url-matcher

| 保証 | 対応テスト |
|---|---|
| `createUrlMatcher` の関数は include に当たるパスだけに真を返す | `includes matching paths` |
| `createUrlMatcher` の関数は include に当たっても exclude に当たるパスには偽を返す | `excludes paths even if included` |
