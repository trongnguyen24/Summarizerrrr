# Agent Action-Engine PoC Harness — V1 (measurement, not product)

> Self-contained. This is the **gate** for Agent Mode. Its deliverable is **evidence, not
> UI**: a measured success/failure rate for JS-only click/type/scroll on ~10 real target
> sites, and a catalogue of which sites fail on `isTrusted` / cross-origin iframe / closed
> shadow DOM. If the numbers are bad, we stop before building Agent Mode. Run Phase 0 → 3 in
> order. **Do NOT build the sidepanel Agent Mode UI from this doc.**
>
> Design source: [`../research/page-agent-integration-feasibility-v1.md`](../research/page-agent-integration-feasibility-v1.md)
> §2.1.1 (accepted ceiling) + §2.1.3 (source findings). NB: `§8.x` cites below point at the
> **predecessor** [`../research/summarizerrrr-agent-sku-v1.md`](../research/summarizerrrr-agent-sku-v1.md)
> ("doc cũ") — feasibility-v1 itself has no §8.

## Context

The feasibility decision accepts a **permanent capability ceiling** for JS-only automation
(feasibility doc §2.1.1): synthetic events carry `isTrusted:false` (rejected by login/bot-check
flows), cross-origin iframes and closed shadow DOM are unreachable, file upload can't be set.
`page-agent`'s own proof is from **cooperative same-origin pages** (site owner embeds it) — it
does **not** transfer automatically to Summarizerrrr driving third-party sites. This PoC is what
turns "feasible on cooperative pages" into a real number on our regime.

Greenfield: **zero references** to `page-agent`/`browser-use` in the repo. `public/accessibility-tree.js`
deliberately *skips* interactive elements (`skipTags` `:76-80` excludes input/button/select/…),
so the numbered-interactive-element tree is **new code**, not a tweak. The injection pattern to
copy is `contentService.js:83-90` (`executeScript({files})` then `executeScript({func})`).

**Phase 0 (read page-agent source, decide vendor-vs-dependency) is already done** — see below.
Result: vendor `dom_tree` + `actions.ts` into `src/lib/dom/` (not an npm dependency), expose via
an unlisted script; page-agent has **no** redaction (must write our own) and **no** separable
highlighter (build our own for Doc 4).

### Goal & scope decision (confirmed with user)
- Build the **minimum** to measure: perception (numbered interactive tree) + 3 actions
  (`click`, `type`, `scroll`) + redaction-at-source. Drive it from a **throwaway dev harness**
  (a dev-only button or console entry), NOT the chat/Agent-Mode UI.
- Redaction is mandatory even in the PoC (it's a live gap: `getSemanticWebpageContent` currently
  hoovers everything; doc cũ §8.5): redact `input[type=password|hidden]` and
  `autocomplete` ∈ {current-password,new-password,one-time-code,cc-number,cc-csc,cc-exp*}.
  **Clarify which path each clause guards:** `type=hidden` never appears in a *visible-interactive*
  tree, so that clause only matters for the summary-extraction path (`getSemanticWebpageContent`),
  not the perception tree. Consider also `cc-name`/`cc-type` and treating a field's
  `aria-label`/accessible-name as a leak vector. Secrets-only is fine for a PoC — say so.
- Measure on ~10 real target sites; record pass/fail + failure cause per action.

## Phase 0 — read page-agent source; decide vendor vs dependency ✅ DONE (2026-08-15)

A source-review pass has already been run and recorded in the feasibility doc §2.1.3. When
executing, **re-open the source to confirm the file:line refs before vendoring** (they were
relayed, not independently re-checked here), then proceed on the decisions below.

### Source findings (recorded 2026-08-15)
- **Locators: non-mutating ✅** — perception builds an in-RAM `FlatDomTree` (`node.ref:
  HTMLElement`), no `setAttribute` on page elements (`dom_tree/index.js`). Exception: a React
  patch adds `data-page-agent-not-interactive` to `#root`/`#app` (`patches/react.ts`).
- **Highlighter: NOT a separable module 🟡** — it's a single fixed `div#playwright-highlight-container`
  (`pointer-events:none; z-index:2147483640`) appended to `body`, logic embedded in
  `dom_tree/index.js`. **Build our own** small shadow-DOM highlighter for citations (Doc 4).
- **PII/password redaction: ABSENT ❌** — literal `@todo 数据脱敏过滤器` at `dom/index.ts:191`.
  **Must write our own** (this Phase's redaction requirement stands, confirmed).
- **`actions.ts` (~550 lines)** is the highest-value reuse: full W3C event chain for `click`,
  `getNativeValueSetter(HTMLInputElement.prototype)` so React `onChange` fires, `contenteditable`
  fallback (`beforeinput` → `execCommand`). All events `isTrusted:false` (confirms the ceiling).
- **Navigation resilience = heartbeat**: `agentHeartbeat` written to `chrome.storage.local` every
  1s; content script tears down mask/highlights if heartbeat is missing >2s. Reuse this pattern
  for cleanup when Agent Mode is built.
- **`SimulatorMask.ts` (~220 lines)**: full-screen `pointer-events:auto` overlay blocking all user
  events + SVG phantom cursor — reference for the future takeover UI (post-PoC).
- Their extension is **also WXT**, mirroring this repo (`MultiPageAgent` in sidepanel ↔ background
  ↔ `RemotePageController.content.ts`).

### Decision: vendor selectively into `src/lib/dom/` (NOT an npm dependency)
| Module | ~lines | How |
|---|---|---|
| `dom_tree` (visibility + indexing + bbox) | ~1700 | Vendor, trim to the perception path |
| `actions.ts` (event dispatcher) | ~550 | Vendor nearly verbatim — most valuable |
| `SimulatorMask` (phantom cursor + lock) | ~220 | Reference; rewrite for Agent Mode (post-PoC) |
| Highlight container | (in dom_tree) | **Do not take** — build our own for citations |
| PII redaction | 0 (absent) | **Write our own** |

Keep the MIT attribution header on any vendored file.

**Verify:** ✅ findings + vendor decision recorded above; on execution, re-confirm file:line refs
against a fresh `npm pack page-agent` / clone before copying code.

## Phase 1 — perception: numbered interactive-element tree
- **Vendor** page-agent's `dom_tree` (trimmed to perception) into `src/lib/dom/` with its MIT
  attribution header (Phase 0 decision). Wrap it in an **unlisted script entrypoint**
  `src/entrypoints/page-actions.js` (mirror `semantic-extractor.js`: `defineUnlistedScript`
  assigning a `globalThis.__…` function) — this is cleaner than a hand-written `public/` file
  because the vendored code is bundled TS, not a standalone script.
- Expose `globalThis.__PAGE_AGENT_PERCEIVE__()` → a compact list of visible interactive elements
  each with a stable in-session numeric id (`[1]`,`[2]`…) + role + accessible name + bbox, plus
  `pixels_above`/`pixels_below` so the model knows content exists outside the viewport
  (viewport-only is the chosen perception scope; it must never silently claim an off-screen
  element is absent — doc cũ §8.6).
- **Must traverse OPEN shadow roots** to number elements inside them (common on modern sites) —
  closed shadow DOM is the ceiling (§2.1.1), open shadow is a **perception requirement**. Ensure
  the trimmed `dom_tree` vendor keeps its open-shadow traversal.
- **Redaction at source** before serialization (mandatory, above — page-agent has none, `@todo`
  at `dom/index.ts:191`).
- Reuse the extended `isVisible` from Doc 1 Phase 2 if available; page-agent's `dom_tree` already
  computes visibility, so reconcile the two rather than duplicating.

**Verify:** inject on 3 sites via `executeScript`; console-print the tree; every visible button/
input is numbered, password fields show `[redacted]`, and `pixels_below>0` on a long page.

## Phase 2 — action dispatch (click/type/scroll) + ref resilience
- **Vendor page-agent's `actions.ts` nearly verbatim** into `src/lib/dom/` (Phase 0: highest-value
  reuse — it already handles the full W3C click event chain, React `getNativeValueSetter` so
  `onChange` fires, and `contenteditable` fallback via `beforeinput`/`execCommand`). Expose
  `globalThis.__PAGE_AGENT_ACT__({op, ref, value})` from the same unlisted script as Phase 1.
- Ids resolve through page-agent's ref map (in-RAM `node.ref:HTMLElement`, strong refs on the
  isolated-world `globalThis` — persists between a `perceive()` and a later `act(ref)` on the same
  tab). Staleness check must be **`el.isConnected === false` → clear error**, never a silent
  wrong-element click. (Do NOT use `WeakRef` — it would let a stale ref be GC'd silently.)
- **Smoke-test the isolated/main-world boundary early:** `getNativeValueSetter` firing React's
  `onChange` from an executeScript-injected isolated world may not cross into the page's React.
  If it fails, `world:'MAIN'` executeScript is the fallback — flag this as the top Phase-2 risk.
- Record `isTrusted:false` explicitly in results so the harness can attribute failures (this is
  the ceiling being measured, not a bug).

**Verify:** on a simple form (e.g. DuckDuckGo search), harness runs `type(ref, "hello")` then
`click(searchButton)` → search executes. On a site with a cross-origin iframe, the action returns
a clean "unreachable: cross-origin frame" error (not a crash).

## Phase 3 — measurement harness + report
- **Pre-register the site+scenario list BEFORE measuring (blocking — else the number is
  theatre).** `isTrusted`/iframe/closed-shadow failures are all site-and-action-specific; a list
  of blogs and search boxes yields ~100% and false confidence. Pin down ~10 sites **categorized**
  (cooperative SPA / login flow / cross-origin-iframe embed / shadow-heavy) and **weighted to the
  actual intended Agent Mode workflows**, with the exact action-per-site scenario written down
  first, so the aggregate is decomposable and defensible.
- **Success is OUTCOME-verified, not dispatch-verified.** A synthetic click that dispatches
  without throwing but that the site ignores (isTrusted) is a **failure**. Each scenario needs a
  concrete post-condition (search results appeared, field committed its value, page navigated).
- Dev-only harness (a temporary button in sidepanel dev build, or a `javascript_tool`/console
  driver) runs the scripted sequence per site and logs pass/fail + cause.
- Produce a results table in this doc: site → category → action → pass/fail → failure cause
  (`isTrusted` / iframe / shadow-DOM / not-found / ok).

**Verify:** the table is filled for all ~10 sites with outcome-verified results. **Decision
recorded**: overall + per-category success rate, and go/no-go for building Agent Mode (answers
feasibility open question 6b.2). If no-go, the doc states why and the agent track stops here.

## Firefox scope & no-go cleanup (read before executing)
- **The gate runs on Chrome.** Chrome ships `<all_urls>` in `host_permissions`
  (`wxt.config.ts:54`), so `executeScript` hits any target site immediately. Firefox
  (`wxt.config.ts:195-227`) has **no `<all_urls>`** — only 5 static domains + `optional_permissions:
  ['<all_urls>']`, so arbitrary-site injection there needs the user's optional-permission grant
  first. That's fine for the gate: the ceiling (`isTrusted`/iframe/closed-shadow/file-input) is
  engine-level and ~Chrome≈Firefox, so **measuring on Chrome answers 6b.2**. State this explicitly.
- **`page-actions.js` ships in EVERY build, not just dev** (an unlisted-script entrypoint isn't
  dev-gated; only the driver *button* can be `import.meta.env.DEV`-gated). So the "dev-only,
  removable" claim is only half-true: **on a no-go decision, deleting `src/lib/dom/` AND
  `src/entrypoints/page-actions.js` is required** to avoid shipping inert injectable action code.
  Name this in the no-go path.

## Out of scope (V1)
Agent Mode toggle/controller/takeover mask/phantom cursor; `navigate`/`domain_transition`
plumbing; tool-loop integration (that's Doc 2, and Agent Mode later); persistence.

## Final verification checklist
- [ ] Phase 0 source findings + vendor/dependency decision recorded.
- [ ] Perception tree numbers interactive elements, redacts secrets, reports off-viewport content.
- [ ] 3 actions work on cooperative sites; fail *cleanly* with attributed cause elsewhere.
- [ ] ~10-site results table + go/no-go decision written into this doc.
- [ ] No changes to the shipped chat/agent UI; harness is dev-only and removable.

## Notable files
- `src/lib/dom/` — **new**: vendored `dom_tree` (trimmed) + `actions.ts` from page-agent, MIT
  header kept; plus our own redaction layer.
- `src/entrypoints/page-actions.js` — **new** unlisted script exposing `__PAGE_AGENT_PERCEIVE__`
  / `__PAGE_AGENT_ACT__` (mirror `semantic-extractor.js`).
- `src/services/contentService.js:83-90` — injection pattern to copy.
- `public/accessibility-tree.js:60-67,76-80` — `isVisible` reference; `skipTags` shows why the
  interactive traversal is the inverse of the summary extractor's.
- This doc — the deliverable (findings + results table + decision).
