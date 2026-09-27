[🇯🇵 日本語](design-decisions.md) | [🇬🇧 English](design-decisions.en.md)

# Design Decisions

The full text of folio-agent's design decisions. Each one records not only what was chosen but also what was rejected and at which boundary to revisit it. For the key points only, see [Design Decisions in the README](../README.en.md#design-decisions).

## Why code, not the prompt, guarantees the model's output

LLM output is probabilistic; nothing guarantees the format a prompt asks for. What hurts a reception chat is a broken shape (stray Markdown) and wrong references (URLs that don't exist, links to the page the visitor is already on), and both erode trust directly. So the model is trusted with the prose only, and an answer goes through four stages.

1. **Material**: give the model what it needs to comply. An instruction to use information it never received (such as article titles) cannot be followed
2. **Instruction** (`chat/prompt/`): ask for the format, without assuming it will be followed
3. **Check and correct** (`chat/answer/`, the `normalize_answer` node in the graph): after generation, code brings the answer into the format agreed between handler and widget. This is where the guarantee lives
4. **Render** (widget): draws only that format. No HTML is parsed

The answer format: plain text, paragraphs separated by blank lines, and one notation only, links as `[text to show](http(s)://…)`, pointing only to `answerLinks` (pages outside this site that are in the knowledge, plus Contact). This site's own pages are named rather than linked, since the visitor is already on the site. `normalize_answer` reduces disallowed links and bare URLs to text (an allowed bare URL becomes a link titled from `answerLinks`). For links, this turns the existing rule "never invent what the knowledge doesn't say" into something code enforces.

Checking lives in the handler rather than the widget because only the handler knows which references are allowed (URLs in the knowledge, the Contact URL). It is a graph node so that a deterministic stage between generation and logging stays in place as rules are added. It is the same idea as the author's [order-system-rag](https://github.com/yktsnet/order-system-rag), which checks model-generated SQL deterministically before running it: code always stands behind the model.

## Why CAG

When the knowledge fits comfortably in an LLM's context, adding a search layer is overkill. Having no vector DB or embedding pipeline means fewer parts that can break and a lighter setup for users. There is a boundary beyond which growing knowledge degrades context, cost, and answer quality, and switching to RAG makes sense; this repo's claim is to pick the near side while knowing where that boundary is. Where the author's [order-system-migration](https://github.com/yktsnet/order-system-migration) (Text-to-SQL) and [order-system-rag](https://github.com/yktsnet/order-system-rag) (RAG) chose tools by "the nature of the question", this repo demonstrates a third axis: choosing by "the scale of the knowledge".

## Why an independent OSS package + dogfooding

Developed as an npm package separate from the site, and verified by integrating it into a real site. Because knowledge is ingested at build time, the bot follows the site automatically, with no manual syncing. A template repo was rejected (improvements after forking never flow back, so it would not grow as OSS). v1 supports only "static sites that build to dist + Cloudflare Workers"; the cost of generalizing (a bloated config surface, multi-framework support) is paid when users appear.

## Why Cloudflare Workers + LangGraph.js

For the common Astro/Next + Cloudflare/Vercel crowd, a TypeScript package that completes with `npm install` + `wrangler deploy` keeps the adoption barrier lowest. Python on a separate host would require users to run a persistent server. LangGraph instead of plain function calls because it expresses the guard → route → generate → log graph declaratively. Only the StateGraph core is used, to keep the bundle small.

## Why the Gemini free tier is the default

It keeps an always-on public bot at zero cost. Which engine generates the answer does not affect the subject (CAG as a knowledge design). The free tier may use input for training, which is acceptable because the knowledge is public information only and the disclosure page states the same premise for visitor input. On days the free tier runs out, the bot replies "reception is closed for today + go to Contact" rather than going silent.

## Why knowledge is selected by "dist traversal + URL globs"

It combines file access for reading (no crawling, lives alongside the build) with URLs as selectors (users only need to know their own site's URL structure). Runtime crawling and a hand-written single JSON knowledge file were avoided because both leave syncing to people. Supplementary knowledge goes explicitly into a `knowledge/` directory mirroring URL paths, keeping "only what you put in gets in".

## Why v1 ships knowledge in the same deployment

Under the principle that knowledge handed to an LLM's context is public, this removes any gap between where knowledge is generated and where it is consumed. One deployment keeps knowledge and site atomically in sync, with no extra tokens or KV. Delivery for sites outside Cloudflare (publishing knowledge as a static asset that a separate Worker fetches) is left as a boundary between the generation and delivery stages, so it can be added later.

## Why log to D1 without a consent button

Logs feed quality improvement directly (question patterns, Contact conversion), and with a free tier, one table, and one row per conversation, the operating cost is close to zero. IP + input can count as personal information, so a line below the chat input plus a link to a details page tells visitors. Requiring explicit consent is excessive by the standard of common chat widgets and would hurt the experience, so there is none.

## Why rate limiting counts D1 log rows

It reuses `COUNT` on `chat_logs` as the counter instead of adding another mechanism. The Workers Rate Limiting binding struggles to express long-window caps, and Durable Objects are overkill at this scale. Limits are not advertised up front, but when one is hit the reply states the actual limit reached ("up to N per X minutes/hours") and points to Contact, favoring clarity over a curt canned message. The limitation that NAT or mobile carriers put several people behind one IP is absorbed by making the numbers adjustable in config.

## Why the widget is hand-written

Off-the-shelf chat widgets are heavy and hard to hold to "assert nothing until clicked" (no auto-popup, no first-message bubble, no network before the first click). Theming comes in through CSS custom properties (a standard mechanism inherited from the host even through Shadow DOM; the integrating side needs a few lines of global CSS, and defaults apply if unset). Answers are plain text only; the weight of a Markdown renderer and its XSS surface are not worth it for short reception answers. The one exception is links as `[text to show](URL)`, drawn from text nodes and `<a>` elements (no HTML is parsed).

## Why routing is deterministic keyword branching

A misrouted message costs little (the knowledge prompt is shared by all routes; only tone and behavior instructions differ), so this branch does not get an extra LLM call (latency, cost, another failure point). Being deterministic, the tests are literally the keyword-to-route table. If signs of misrouting grow, switching to LLM classification can be reconsidered.

## Why npm workspaces

At two lightly-dependent packages, pnpm's advantages (disk efficiency, strict resolution) do not pay off, and a setup that needs only Node puts fewer constraints on contributors. A corepack-based workflow was avoided because it asks for a more privileged environment. Reconsider if the package count grows and causes real friction.
