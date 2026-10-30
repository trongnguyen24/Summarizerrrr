# Cited Q&A — DOM-anchored inline citations (opt-in) — V1

> Self-contained vertical slice of [`../research/chat-inline-citations-v1.md`](../research/chat-inline-citations-v1.md).
> Independent of the agent track. Run Phase 1 → 4 in order; each phase ends with a verify step.
> The whole click-to-source chain must exist for any of it to be usable — block-ids at capture,
> an opt-in skill telling the model to cite, a `cite:` renderer, and a scroll+highlight handler
> — so this is one feature, not just a highlighter.
>
> Verify commands: `npm test`, `npm run check`, `npm run dev`.

## Context

When chat answers from a tab/page, we want positional citations: a marker (`[a2]`) that on click
scrolls the source tab to the exact passage and highlights it. Research 1 converged on a
**4-level degrade ladder** so a persisted citation never becomes a dead link: the citation record
carries its own `quote`, so a closed tab degrades to "show the quote" (level 4) rather than
breaking. That reframe is the core; page-agent only helps the *mechanics* of levels 1–2.

Current gaps (verified):
- **No positional structure anywhere.** `semanticPageExtractor.js` returns
  `{content, method, wordCount}` (`:109-113`) with no block ids.
  `chatSourceService.js#persistSnapshot` (`:145-169`) stores a flat `rawContent` blob.
  `groundingRefs` (`contextPipeline/index.js:48-61`) is per-*source* `{sourceId, contentKind,
  tokens}`, no offsets/quotes.
- **Rendering precedent to clone: the timestamp chain.**
  `src/lib/utils/timestampProcessor.js:17` rewrites `[MM:SS]` → `[MM:SS](timestamp:<sec>)`;
  `src/components/markdown/StreamingMarkdownV2.svelte:185,187` applies it and maps
  `renderers.link = TimestampLink`; the sanitizer exempts the custom protocol at `:49-51`;
  `TimestampLink.svelte:11-31` messages the tab `{action:'seekToTimestamp'}`; handled in the
  YouTube-only script `youtubetranscript.content.js:75-88`.
- **Critical cross-browser gotcha:** `scrollToCite` must work on *arbitrary* sites, but the
  `seekToTimestamp` handler lives in a YouTube-only content script, and Firefox only injects
  content scripts on 5 domains (`firefox.content.js:7-13`; `wxt.config.ts:207` makes `<all_urls>`
  *optional*). So the citation handler must be injected via `scripting.executeScript` (pattern:
  `contentService.js:83`), **not** `tabs.sendMessage`.

Invariants (feasibility §2.2, research 1 §3.6): block-ids must be **deterministic from content**
(same content → same id every turn) or they break the cache-stable prefix
(`contextPipeline.test.js` cache assertion). Model may cite an id that got truncated out of
context → renderer must tolerate dangling cites (render as plain text). Ids are **assigned by
code**, **chosen** by the model.

### Goal & scope decision (confirmed with user)
- Opt-in only: a **"Cited Q&A" skill** (built-in, one-shot), NOT default for summarize/analyze
  (protects summary fluency; research 1 §7).
- Ship the full chain: deterministic block-ids at capture → skill instruction → `cite:` renderer
  + validation → inject-based scroll & highlight with the 4-level degrade ladder.
- Persist `{id, sourceId, quote, locator?}` on the message so level 4 always works.
- **Build the scroll/highlight code ourselves — confirmed.** Doc 3 Phase 0 (source read
  2026-08-15) found page-agent's highlight is a single non-separable fixed `div` inside
  `dom_tree`, not a reusable module. A small self-cleaning shadow-DOM highlighter is cleaner.

## Phase 1 — deterministic block-ids at capture
- Emit a stable block id per structural block in `semanticPageExtractor.js`
  (`formatStructuralElement`, `:33-72`): id = short prefix + content hash (FNV-1a already used in
  `chatSourceService.js:18-25`) so it's deterministic and cache-safe. Return the block map
  alongside `content`.
- Persist the block map in the snapshot (`persistSnapshot`, `chatSourceService.js:145-169`) so
  citations can resolve `quote`/`locator` later. **Migration caveat:** `putSourceSnapshot`
  dedups by `sourceKey` (incl. `contentHash`) and returns the existing record untouched — a
  snapshot captured *before* this feature short-circuits and has **no** `blockMap`, so L1/L2 are
  unavailable for it (L4 quote still works, since quote lives on the message). Acceptable.

> **The load-bearing design hole (review): where do ids enter the LLM-visible source body?**
> This plan defines capture (block map) and render (`cite:`) but not the **injection step** —
> `sourceFormatter.formatSource()` (`:60-70`) emits `content` verbatim; nothing interleaves
> `[aN]` markers into the rendered source block, so today the model has no ids to cite. Add a
> concrete step (in `sourceFormatter`/`contextAssembler`, gated to cited-mode) and **pick a token
> lane**: inject ids *pre-budget* into the content the budgeter estimates (appears in all modes,
> contradicts cited-only) OR *post-budget* only in cited-mode (escapes the token estimate — and
> the estimator is already optimistic for VI/CJK, research §3.6). The clean answer is usually
> cited-mode injection **before** `estimateTokens` sees it, so the id cost is counted. Decide and
> write it down — this is the biggest gap.

**Verify:** capture a page twice; block-ids are byte-identical across captures (deterministic).
`contextPipeline.test.js:152` cache-stable-prefix assertion still passes (it compares same-mode
turns, so cited-vs-normal prefix difference is unguarded and acceptable). `npm test` green.

## Phase 2 — "Cited Q&A" one-shot skill
- Add a built-in skill in `src/lib/chat/skills/builtInSkills.js` (shape
  `{id, version, name, instruction, pinned, sourceMode}`, e.g. summarize at `:66-72`). Instruction:
  answer factual questions from the source, cite the block-id in `[aN]` form for each claim, only
  use ids present in the provided source, may cite multiple.
- It flows through the existing one-shot path: `formatSkillInvocation` (`sourceFormatter.js:78`)
  → current-turn user message only (`contextAssembler.js:50`). Ids are rendered into the source
  block only in this mode (accepted prefix difference, sticky per conversation — research 1 §6).

**Verify:** invoke the skill on a captured page; the model's reply contains `[aN]` markers drawn
only from the emitted id set. `npm test` (extend `tests/chat/skills.test.js`) green.

## Phase 3 — `cite:` renderer + validation
- Preprocess rewriting `[aN]` → `[aN](cite:<id>)` (mirror `processTimestamps`; note it runs only
  when `!isStreaming`, `StreamingMarkdownV2.svelte:184-186`, so cites become clickable
  post-stream — acceptable). Anchor the regex to the emitted id namespace so `[aN]` can't collide
  with markdown reference links.
- **Renderer wiring — NOT symmetric to timestamp (review):** `@humanspeak/svelte-markdown` accepts
  a **single** `renderers.link` component (`:187` already maps it to `TimestampLink`). You
  **cannot register a second `renderers.link`** for `cite:`. Instead either (a) **extend the one
  link renderer to branch on href prefix** — `TimestampLink` already branches `isTimestamp` vs
  plain `<a>` (`:34/:64`); add a `cite:` branch delegating to `CiteLink`; or (b) introduce a
  combined dispatcher renderer that picks `TimestampLink` / `CiteLink` / plain link. Add a
  `CiteLink.svelte` (unique basename — Rule 4; Rule 6 satisfied because `StreamingMarkdownV2` is
  reachable from archive + sidepanel) under `src/components/markdown/`.
- Sanitizer exemption for `cite:` at `StreamingMarkdownV2.svelte:49` (mirror the `timestamp:` branch).
- **Validate at render:** unknown/dangling id → render as plain text, never a broken link
  (budgeter may have truncated that block; `SOURCE_GUARDRAIL` already warns the model).
- Hover shows the `quote` from the persisted citation record.

**Verify:** a reply citing a valid id renders a clickable marker with hover-quote; a reply citing
a bogus id renders as plain text (no crash). `npm run check` green.

## Phase 4 — inject-based scroll & highlight (degrade ladder)
- New injectable `public/cite-highlighter.js` (verbatim-copy pattern). On `scrollToCite`:
  - **L1** tab live + `[data-cite-id]`/locator found → `scrollIntoView({behavior:'smooth'})` +
    temporary highlight overlay (shadow-DOM or a transient outline; no host-page overlay
    precedent exists, so build a self-cleaning one).
  - **L2** node gone (SPA re-render) → re-find by `quote` (`window.find`/TreeWalker / Text Fragment).
  - **L3** tab closed but URL known → open URL with `#:~:text=<quote>`.
  - **L4** nothing runs → show `quote` in a drawer/tooltip (extend `ChatSourceDrawer.svelte`).
- `CiteLink` triggers it via `scripting.executeScript` injection (NOT `tabs.sendMessage` — Firefox
  arbitrary-site constraint above). Reuse the Firefox permission gate pattern
  (`chatSourceService.js:79-89`) before injecting.
- **Target the SOURCE tab by id, not the active tab.** `TimestampLink` messages the active tab
  (`tabs.query{active:true}`), but a cited source is usually a background `@tab`. Resolve the
  source tab from the persisted `tabId` hint on the snapshot; it's runtime-only and goes stale on
  reopen — which is exactly what L3/L4 cover.
- **Persist `{id,sourceId,quote,locator}` at message-create time.** `createMessageRecord`
  (`conversationRepository.js:88-108`) spreads `...messageData`, so a new `citations` array
  persists with no migration — **but** `updateMessage` (`:1082`) merges only `groundingRefs`, so a
  streamed-then-finalized message would drop citations unless you set them at add time (or add a
  merge line). Decide `locator` schema (XPath vs Text-Fragment vs both) — SPA re-find (L2) is the
  most common silent failure (research §6), so this choice is real V1 risk.

**Verify:** `npm run dev`; ask a cited question about an attached static page → click `[a2]` →
source tab scrolls + highlights the passage. Close the tab → click → quote shows (L4). On an SPA,
click after a re-render → re-find highlights (L2). On Firefox without site permission → actionable
"Settings → Site Access" prompt, no silent failure.

## Out of scope (V1)
Default-on citations for summarize/analyze; semantic (LLM) chunking; cross-tab id remap on
conversation reopen beyond the persisted `sourceId`+`quote` (L3/L4 cover it).

## Final verification checklist
- [ ] Block-ids deterministic; cache-stable-prefix tests pass.
- [ ] Skill is opt-in; summarize/analyze unchanged.
- [ ] Dangling/bogus cites degrade to plain text; ladder L1–L4 all demonstrated.
- [ ] Works on an arbitrary (non-YouTube) site via injection; Firefox permission handled.
- [ ] `npm test` + `npm run check` pass; `layering.test.js` green.

## Notable files
- `src/lib/content/semanticPageExtractor.js:33-72,109-113` — emit block-ids.
- `src/services/chat/chatSourceService.js:18-25,145-169` — hash + persist block map.
- `src/lib/chat/skills/builtInSkills.js` — new "Cited Q&A" skill.
- `src/components/markdown/{StreamingMarkdownV2.svelte:49,185,187, CiteLink.svelte(new)}` — render.
- `src/lib/utils/timestampProcessor.js:17` — preprocess pattern to mirror.
- `public/cite-highlighter.js` — **new** injectable scroll+highlight.
- `src/entrypoints/sidepanel/components/chat/ChatSourceDrawer.svelte` — L4 quote fallback.
- `src/services/chat/chatSourceService.js:79-89` — Firefox permission gate to reuse.
