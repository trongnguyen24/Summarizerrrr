# Extraction Quick Wins (visibility filter + DOM-stable capture) — V1

> Self-contained execution plan, intended to run in a fresh session. Start at Phase 1 and go
> in order. Each phase ends with a verify step — don't move on until it passes. Low risk:
> touches only the page-capture path, no LLM/agent/permission changes.
>
> Design source: [`../research/page-agent-integration-feasibility-v1.md`](../research/page-agent-integration-feasibility-v1.md) §2.3, §8.5.
> Verify commands: `npm test` (vitest run), `npm run check` (type-check), `npm run dev`.

## Context

`@tab` and summarization capture page text through a three-tier fallback in
`src/services/contentService.js` → `getSemanticWebpageContent(tabId)` (`:81-143`):
1. inject `semantic-extractor.js` (Defuddle) via `executeScript` (`:83-90`), accept if ≥50 chars;
2. fall back to `accessibility-tree.js` → `window.__getPageContent()` (`:103-118`);
3. fall back to raw `document.body.innerText` (`:123-141`).

Two known-cheap quality gaps:
- **No DOM-stable wait.** SPA pages are captured mid-skeleton because the `func` at
  `contentService.js:89` runs synchronously the instant injection completes. Any throw here
  silently degrades to tier 2/3, so a bug fails *invisibly* — verify carefully.
- **Weak visibility filtering.** `semanticPageExtractor.js#cleanedHtmlToStructuredText`
  (`:78-89`) runs on a **detached div** (`container.innerHTML = html`, `:80`) where
  `getComputedStyle`/`offsetParent`/`getBoundingClientRect` all return useless values — so a
  visibility filter **cannot** live there. It must be a live-DOM pre-pass. The reusable
  reference implementation is `public/accessibility-tree.js#isVisible` (`:60-67`).

**NOT a Defuddle replacement.** The feasibility doc is explicit: page-agent's DOM tree is an
*interactive-element* tree for acting, which reads *worse* as article text. We keep Defuddle;
we only add a visibility pre-pass and a stability wait. The "60–80% token savings" figure from
early drafts was unsourced — this phase **measures** the real delta instead of assuming one.

### Goal & scope decision (confirmed with user)
- Add `waitForDOMStable` before capture; add a live-DOM visibility pre-pass feeding Defuddle.
- No new dependencies (Defuddle `0.19.1` already in `package.json:70`).
- No block-ids here (that's Doc 4). No agent, no permissions changes.

> **Reviewed 2026-08-15 (subagent pass) — key correction:** Defuddle **already** removes
> inline `display:none`/`visibility:hidden`/`opacity:0` and Tailwind `hidden`/`invisible`
> classes (`removeHiddenElements` defaults on). What it *misses* is **computed-style hidden**
> (stylesheet-driven), **zero-size** `getBoundingClientRect`, `aria-hidden` **ancestors**, and
> `content-visibility` — because those are only detectable on the live DOM, and Defuddle does
> its hidden-removal on an internal **clone** whose `defaultView` is `null` (so `getComputedStyle`
> is skipped there). Interestingly Defuddle itself follows this same discipline: it measures
> small-image visibility on the *live* doc **before** cloning. So the pre-pass must target
> **only that computed-style gap**, not re-do what Defuddle already does.

## Phase 1 — `waitForDOMStable` before capture
- Add a debounced-quiescence helper. There is **no existing `waitForDOMStable`** — all current
  `MutationObserver` uses wait for a *specific element* (e.g. `content/App.svelte:266-291`).
  Pattern: `MutationObserver` on `document.body {childList, subtree, characterData}`, resolve
  after ~500ms of no mutations OR a ~2s hard cap, whichever first.
- Put the helper **inside the injected script** so it runs in page context. Cleanest seam:
  make `src/entrypoints/semantic-extractor.js`'s
  `globalThis.__SUMMARIZERRRR_EXTRACT_SEMANTIC_CONTENT__` **async** (await stability, then
  extract). Then in `contentService.js:87-90`, `await` the result (executeScript resolves a
  returned Promise into `results[0].result`).
- Guard the timeout so a hang can't wedge capture; on timeout, extract anyway.
- **Latency honesty (review 2026-08-15):** a pure debounce waits the full ~500ms even on a
  quiet page, and pages with ad tickers / animations / YouTube's own MutationObservers **never**
  go quiet → they always hit the 2s cap (+2s latency). Add a short-circuit: if
  `document.readyState === 'complete'` **and** the first observation tick is already quiet,
  resolve early. Don't promise "no perceptible delay" unconditionally.

**Verify:** `npm run dev` **and** `npm run dev:firefox` (see below), open a known SPA (e.g. a
Reddit or X thread that lazy-loads), attach via `@tab`; captured `rawContent` now contains the
article body, not skeleton placeholder text. Confirm a static page (Wikipedia) still captures
within the debounce window. `npm test` green.
- **Firefox is the risky path, verify it explicitly.** Chrome MV3 `scripting.executeScript`
  reliably awaits a promise-returning injected `func`; Firefox MV2 `browser.scripting.executeScript`
  promise-await has been version-dependent. If Firefox does **not** await, tier-1 returns
  `undefined` and *silently degrades to tier 2* — the exact invisible regression to guard. If
  unreliable, fall back to messaging the result rather than returning a promise from `func`.

## Phase 2 — live-DOM visibility pre-pass
- **Scope to the gap Defuddle misses, not what it already does** (review: Defuddle already
  removes inline `display:none`/`visibility:hidden`/`opacity:0` + `hidden`/`invisible` classes).
  The pre-pass targets only: **computed-style hidden** (stylesheet-driven), **zero-size**
  `getBoundingClientRect()`, `aria-hidden` **ancestors**, `content-visibility:hidden`. Reuse and
  extend `isVisible` from `accessibility-tree.js:60-67` for exactly these.
- **Mechanism (the earlier "strip from the clone Defuddle receives" was unworkable — Defuddle
  clones internally and the clone's `defaultView` is `null`, so `getComputedStyle` can't run on
  it).** The only viable seam is to act on the **live** `document` *before* `new Defuddle(document,
  …)` (`semanticPageExtractor.js:97`): walk the live DOM, and for each computed-hidden node
  **stamp an inline `style="display:none"`** so Defuddle's existing inline-pattern removal drops
  it from its clone. This **mutates the user's live page** (which the user may be viewing during
  `@tab` capture) — so either (a) restore the original inline styles after `parse()`, or (b)
  accept it as non-destructive-enough and document that choice. Pick one explicitly.
- Instrument: log `wordCount` before/after (return shape is `{content, method, wordCount}` at
  `:109-113`) so the token delta is measurable, not assumed.
- **Over-strip guard:** if the pre-pass wrongly removes real content and Defuddle output falls
  below the 50-char gate (`contentService.js:92`), capture silently degrades to tier 2 (no
  pre-pass). Graceful, but it can hide a regression — watch `method` in the result.

**Verify:** capture a content-heavy page with known chrome/nav/ads (e.g. a news article);
compare `wordCount` and eyeball `rawContent` — boilerplate nav/footer/hidden-tab text is gone,
article intact. Record the measured reduction in this doc. Add a unit test for the
`waitForDOMStable` timer/timeout logic (jsdom can't test layout, but timers are testable).
`npm test` + `npm run check` green.

## Out of scope (V1)
Block-ids/citation anchors (Doc 4); interactive-element tree (Doc 3); any per-site expander.

## Final verification checklist
- [ ] `npm test` and `npm run check` pass.
- [ ] SPA capture no longer returns skeleton; static-page latency unchanged.
- [ ] Measured word-count reduction recorded in the doc (replaces the unsourced 60–80%).
- [ ] `git diff --stat` shows only `contentService.js`, `semantic-extractor.js`,
      `semanticPageExtractor.js` (+ maybe a new helper under `src/lib/content/`).

## Notable files
- `src/services/contentService.js:81-143` — capture fallback chain; `:87-90` the await seam.
- `src/entrypoints/semantic-extractor.js` — unlisted script; make async here.
- `src/lib/content/semanticPageExtractor.js:78-113` — Defuddle path; pre-pass goes before `:97`.
- `public/accessibility-tree.js:60-67` — `isVisible` reference to reuse/extend.
