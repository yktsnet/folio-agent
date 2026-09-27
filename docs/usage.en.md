[🇯🇵 日本語](usage.md) | [🇬🇧 English](usage.en.md)

# Usage / API

Manual setup without `folio-agent-init`, and API details for each package. For the overall picture, see the [README](../README.en.md).

## 1. Knowledge Generation (build time)

```bash
npx folio-agent-ingest folio-agent.config.json knowledge.json
```

```jsonc
// folio-agent.config.json
{
  "distDir": "dist",
  "include": ["/", "/works/**", "/about"],
  "exclude": ["/works/draft-*"],
  "knowledgeDir": "knowledge"
}
```

`IngestConfig` (`distDir` / `include` / `exclude` / `knowledgeDir` / `zenn` / `tokenWarningThreshold`) is exported as a type from `@folio-agent/handler`. `language` and `theme` are fields `folio-agent-init` uses to keep its answers; ingest itself does not read them. Markdown placed in `knowledgeDir` mirrors URL paths and is not subject to include/exclude (only what you place there is included).

To include Zenn articles as knowledge, set `zenn` (omit it to skip). No request is made to zenn.dev: ingest reads the Zenn CLI `articles/` directory locally and takes only articles whose frontmatter has `published: true`:

```jsonc
// folio-agent.config.json (excerpt)
{
  "zenn": {
    "articlesDir": "../zenn-content/articles",
    "baseUrl": "https://zenn.dev/<username>/articles"
  }
}
```

For environments such as CI that cannot reach `articlesDir` (e.g. articles in a private repo), you can set `zennSnapshotPath` as a sibling key of `zenn`. When `articlesDir` does not exist, ingest falls back to the JSON at this path:

```jsonc
// folio-agent.config.json (excerpt)
{
  "zenn": {
    "articlesDir": "../zenn-content/articles",
    "baseUrl": "https://zenn.dev/<username>/articles"
  },
  "zennSnapshotPath": "zenn-snapshot.json"
}
```

Generate the snapshot with `folio-agent-sync-zenn` and commit it to your repo:

```bash
npx folio-agent-sync-zenn folio-agent.config.json zenn-snapshot.json
```

**The fallback emits no warning.** A warning appears only when neither `articlesDir` nor `zennSnapshotPath` exists, so a stale snapshot keeps the build green while the knowledge quietly ages. Run `folio-agent-sync-zenn` regularly (e.g. in CI), or have your own way to detect staleness.

## 2. Chat Handler (Pages Function / Worker)

```ts
import { createChatHandler, createGeminiGenerator } from "@folio-agent/handler";
import knowledgeDoc from "../knowledge.json";

const knowledge = knowledgeDoc.pages.map((p) => `# ${p.url}\n\n${p.text}`).join("\n\n");

interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
}

export default {
  fetch: (request: Request, env: Env) =>
    createChatHandler({
      db: env.DB,
      generateAnswer: createGeminiGenerator({
        apiKey: env.GEMINI_API_KEY,
        knowledge,
        contactUrl: "https://example.com/contact",
      }),
    })(request),
};
```

With `contactUrl`, answers on the inquiry route point to the Contact page by its URL. Without it, they just say "the Contact page".

Pass `language` (`"ja" | "en"`, default `ja`) to both `createChatHandler` (canned limit messages and routing keywords) and `createGeminiGenerator` (system prompt). Passing it to only one makes the canned messages and the prompt disagree on language.

Apply the D1 schema `packages/handler/migrations/0001_init.sql` with `wrangler d1 migrations apply`. The single `chat_logs` table serves as both the log and the rate-limit counter (default 6 per 10 minutes and 12 per 12 hours, configurable via `rateLimitConfig`).

## 3. Widget (frontend)

```html
<folio-agent-widget endpoint="/api/chat" policy-href="/data-policy"></folio-agent-widget>
<script type="module">
  import { defineFolioAgentWidget } from "@folio-agent/widget";
  defineFolioAgentWidget();
</script>
```

- `lang="en"` switches the UI text (button, heading, greeting, suggested questions, placeholder, disclosure, errors) to English. Default is Japanese.
- The panel heading, the opening greeting, and the suggested questions can be replaced via attributes: `heading="…"`, `greeting="…"`, `suggestions="Question 1|Question 2|Question 3"` (separated by `|`). Set `greeting=""` / `suggestions=""` to hide them. When unset, per-language defaults are shown.
- The page linked from `policy-href` should state three things: (1) per-IP rate limiting is in effect (default 6 per 10 minutes and 12 per 12 hours), (2) input and answers are logged in D1, and (3) the Gemini API free tier used for generation may use input for training. The page itself is the integrating site's responsibility (folio-agent ships no template).
- Colors and font can be overridden with six CSS custom properties (`--folio-agent-surface` / `text` / `muted` / `accent` / `accent-contrast` / `font`). **Without overrides, defaults are derived from the host's colors (inherited `color` / `color-scheme` and CSS system colors), so the widget fits both light and dark sites.** Override only when you want something else.
- Even then, three colors are enough: `surface` / `text` / `accent`. Borders, bubbles, the input field, and supplementary text are derived from them (set `muted` / `accent-contrast` only to change their derived values). For example, the Poimandres palette:

  ```css
  folio-agent-widget {
    --folio-agent-surface: #1b1e28;
    --folio-agent-text: #e4f0fb;
    --folio-agent-accent: #5de4c7;
  }
  ```

- At 640px wide or narrower the panel opens full screen and follows the visual viewport (`visualViewport`) height, so the on-screen keyboard never covers the input.
