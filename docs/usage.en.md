[🇯🇵 日本語](usage.md) | [🇬🇧 English](usage.en.md)

# Usage / API

`folio-agent-init` options, and API details for each package when setting up by hand. For the overall picture, see the [README](../README.en.md).

## 0. Setup (`folio-agent-init`)

```bash
npx folio-agent-init [options]
```

It is not interactive. It changes only the values you pass and keeps everything else as it is in the existing `folio-agent.config.json` (defaults on the first run). With `--dry-run` it prints what it would write and writes nothing.

| Option | Meaning | Default |
|---|---|---|
| `--lang <ja\|en>` | UI and prompt language | `ja` |
| `--dist <dir>` | Build output directory | `dist` |
| `--include <globs>` | URL globs to include in the knowledge (comma-separated) | `/**` |
| `--zenn-dir <path>` / `--zenn-user <name\|url>` | Zenn article ingestion; pass both. `--no-zenn` removes it | none |
| `--contact-url <url>` | Contact page URL written into the API route scaffold | none |
| `--theme <auto\|poimandres\|custom>` | Colors. `auto` writes no theme CSS and follows the site's colors | `auto` |
| `--accent` / `--surface` / `--text <hex>` | The three colors for `--theme custom`; passing any implies `custom` | none |
| `--api-route <path>` / `--no-api-route` | Where to generate the API route scaffold. An existing file is never overwritten | `functions/api/chat.ts` on the first run only |
| `--dry-run` | Print what would be written without writing | |

The Gemini API key is never taken as an argument (it would end up in shell history and conversation logs). If the `GEMINI_API_KEY` environment variable is set, it is written to `.dev.vars`; otherwise, add it to `.dev.vars` by hand. `.dev.vars` is added to `.gitignore` either way.

Switching back to `--theme auto` deletes a previously written `folio-agent.theme.css`.

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

`IngestConfig` (`distDir` / `include` / `exclude` / `knowledgeDir` / `zenn` / `tokenWarningThreshold`) is exported as a type from `@folio-agent/handler`. `language` and `theme` are fields `folio-agent-init` uses to keep its previous values; ingest itself does not read them. init never rewrites fields it doesn't manage (`exclude` / `knowledgeDir` / `zennSnapshotPath`, and so on). Markdown placed in `knowledgeDir` mirrors URL paths and is not subject to include/exclude (only what you place there is included).

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
import { collectAnswerLinks, createChatHandler, createGeminiGenerator, formatKnowledge } from "@folio-agent/handler";
import knowledgeDoc from "../knowledge.json";

const CONTACT_URL = "https://example.com/contact";
const knowledge = formatKnowledge(knowledgeDoc);
const answerLinks = collectAnswerLinks(knowledgeDoc, CONTACT_URL);

interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
}

export default {
  fetch: (request: Request, env: Env) =>
    createChatHandler({
      db: env.DB,
      answerLinks,
      generateAnswer: createGeminiGenerator({
        apiKey: env.GEMINI_API_KEY,
        knowledge,
        contactUrl: CONTACT_URL,
      }),
    })(request),
};
```

`formatKnowledge` formats the knowledge with each page's title and URL (so answers can point to an article by its title). `collectAnswerLinks` gathers what answers may link to (pages outside this site that are in the knowledge, plus Contact). The handler brings each generated answer into the answer format before returning it (`normalize_answer`); links not in `answerLinks`, and bare URLs, are reduced to text. Without `answerLinks`, every link in an answer becomes text.

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
- The second header line (default "AI answers from what this site publishes") tells visitors what the answers are based on. Replace it with an element carrying `slot="subheading"`; it can include links:

  ```html
  <folio-agent-widget endpoint="/api/chat" policy-href="/data-policy">
    <span slot="subheading">Answers come from this site and my articles on <a href="https://zenn.dev/<username>">Zenn</a> (a tech blogging platform)</span>
  </folio-agent-widget>
  ```

- Links in answers (`[text to show](URL)`) are rendered as links showing that text. Same-site URLs (such as Contact) open in the current tab; external URLs open in a new tab.
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
