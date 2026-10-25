# Chat Tool Loop + `search_archive` — V1

> Self-contained execution plan, intended to run in a fresh session. Start at Phase 1 and go
> in order; each phase ends with a verify step. This lands the tool-calling foundation in the
> **shared** chat path (ships in the normal product), proven by one safe read-only tool, with
> **no page access and no network egress**. It is the load-bearing prerequisite for Agent Mode
> (feasibility doc §2.1.2 / superseded agent-sku doc §6.3): build the loop where it's
> debuggable, not inside an unreleased agent build.
>
> Verify commands: `npm test`, `npm run check`, `npm run dev`. AI SDK is `ai@^7.0.22` → use
> `stopWhen: stepCountIs(n)`, **not** `maxSteps`.

## Context

Chat generation today is **single-shot**. `src/services/chat/chatService.js#runGeneration`
(`:203`) builds a request at `:319-326` and consumes a stream via the injected
`streamRequest` (`defaultStreamRequest`, `:24-56`) which calls
`generateContent{,StreamEnhanced}Request` in `src/lib/api/aiSdkAdapter.js`. The request object
has **no `tools` key** today. Grep confirms `stopWhen`/`stepCountIs`/`maxSteps` appear
**nowhere** under `src/` — there is no agentic loop.

The adapter is *ready* but unused: `tools` is already destructured and forwarded in both
non-stream (`aiSdkAdapter.js:297,402`) and stream (`:590,704`) paths.

> **Framing correction (review 2026-08-15):** widening the stream reader is **NOT a functional
> prerequisite.** AI SDK v7 auto-executes a tool's `execute` *inside* `streamText`/`generateText`
> when `stopWhen` is set; the final step's `text-delta` flows through the *current*
> `readProviderStream` (`:550-573`) unchanged, so a correct answer is produced even with zero
> Phase-2 changes. Widening is needed for three narrower reasons — state these as the real
> motivation: (a) **UI trace/observability** of tool steps; (b) **multi-step text separation** —
> intermediate-step text (e.g. "Let me search…") currently concatenates into the same `fullText`
> as the final answer (`generateContentStreamEnhancedRequest` `:963` does `fullText += chunk`); and
> (c) **tool-error semantics** — a tool `execute` throw surfaces as an `error` part that
> `readProviderStream` **throws on** (`:553-555`), aborting the whole turn; decide desired behavior.

`getProviderCapabilities` (`src/lib/chat/providerCapabilities.js:159`) returns
`{providerId, modelId, contextWindowTokens, defaultOutputTokens, source}` — **no boolean
capability of any kind**, so there's no `supportsTools` gate yet. Ollama/LM-Studio tool-calling
is flaky; without a gate, failures surface as opaque stream errors.

**Archive search does not exist.** `src/lib/db/indexedDBService.js` has `getAllSummaries()`
(`:321`), `getAllHistory()` (`:523`), `getSummaryById` (`:367`) etc. but **no search/query/text
index**. `archiveStore` filters client-side (`:140-141`). A `search_archive` tool implements its
own scan-and-score. Placement is legal: `indexedDBService.js` is under `src/lib/db/`, so a tool
under `src/lib/chat/tools/` may import it directly (Rule 1: `lib` imports `lib`).

### Goal & scope decision (confirmed with user)
- Add a **capped** tool loop (`stopWhen: stepCountIs(N)`, N≈5) to the shared chat path.
- Add `supportsTools` capability + gate; tools UI only appears where supported.
- Ship exactly one tool: `search_archive` (read-only, IndexedDB, no network, no page access).
- Tool **output is untrusted** → wrap through `sourceFormatter` discipline (`escapeSourceValue`
  + `[[UNTRUSTED_...]]`), same as sources. No existing wrapper for tool output — add one.
- Preserve the cache-stable-prefix invariant: tool results **append after** the turn; they must
  not feed back into how the source block is rendered.

## Phase 1 — `supportsTools` capability + gate
- Add `supportsTools: boolean` to the `getProviderCapabilities` (`:159`) **return value**, but
  **keep it OUT of the persisted/discovered snapshot** (review): the discovered map carries
  provider-reported `context_length`, not tool support, and adding a field there forces churn in
  `providerCapabilitiesPersistence.test.js` (`toEqual({})`/`toEqual(snapshot)`). Instead **derive**
  `supportsTools` inside `getProviderCapabilities` from the static `KNOWN_MODEL_CAPABILITIES` table
  (`:107-153`) + a provider-level default. Do NOT thread it through `registerModelCapability`/
  `mergeDiscoveredCapabilities`/`getDiscoveredCapabilitiesSnapshot`.
- Default `false` for local/proxy providers (Ollama, LM Studio). **The gate is load-bearing, not
  cosmetic:** the Ollama proxy serializes config via `JSON.parse(JSON.stringify(config))`
  (`ollamaProxyModel.js:37-43,127`), which **drops `tools.execute` and the `stopWhen` predicate**
  (both functions) — so tools cannot work over the proxy regardless of model. Justify the gate on
  this serialization boundary, not just "flaky tool-calling."

**Verify:** `npm test` passes (persistence test **unchanged** since the snapshot didn't gain a
field); a unit assertion that a known Gemini model returns `supportsTools:true` and an Ollama
model returns `false`.

## Phase 2 — widen the stream reader for tool parts
- In `aiSdkAdapter.js`, widen `readProviderStream` (`:550-573`) to surface `tool-call` /
  `tool-result` (and `tool-input-delta` if streaming args) rather than dropping them — emit them
  as a typed sentinel alongside the existing `__streamMeta` (`:711-731`) pattern.
- Update `generateContentStreamEnhancedRequest` (`:942-990`) to pass tool events through instead
  of assuming string chunks.
- Keep the non-stream path (`generateText`, `:402`) working — AI SDK v7 handles multi-step
  internally when `stopWhen` is set, so most loop mechanics live in the SDK; the adapter's job
  is to not swallow the events and to forward `tools`+`stopWhen`.

**Verify:** add an adapter unit test (mirror `tests/chat/aiSdkAdapter.test.js`) with a mock model
emitting a tool-call then text; assert the enhanced stream surfaces a tool event and the final
text. `npm test` green.

## Phase 3 — `search_archive` tool + untrusted-output wrapper
- Create `src/lib/chat/tools/searchArchive.js`: an AI-SDK tool (`tool({description, parameters:
  zodSchema, execute})`) whose `execute` scans `getAllSummaries()` + `getAllHistory()`
  (`indexedDBService.js:321,523`), scores by query match over title/content, returns top-K
  `{title, snippet, date, id}`.
- Add `src/lib/chat/tools/formatToolResult.js` (or extend `sourceFormatter.js`) to wrap tool
  output in an escaped `[[UNTRUSTED_TOOL_RESULT …]]` block reusing `escapeSourceValue`
  (`sourceFormatter.js:38`). Tool results must never be treated as trusted instructions.
- Add a tool registry `src/lib/chat/tools/index.js` returning enabled tools given settings.
  **Layering:** it must receive `settings` as an **argument** (or read via
  `src/lib/config/settingsPort.js`) — importing `stores/settingsStore` from `lib/` fails
  `layering.test.js` Rule 1.

**Verify:** unit test `execute` against a seeded fake IndexedDB (reuse test helpers if present)
returns ranked results; a formatting test asserts `[[`/`]]` in a malicious archive title are
escaped. `npm test` green.

## Phase 4 — wire the loop into `runGeneration` behind a setting
- Add `settings.chat.toolsEnabled: false` (experimental) to `DEFAULT_SETTINGS.chat`
  (`settingsStore.svelte.js:168-173`) via `updateFeatureSettings('chat', …)` (`:1144`).
  **Naming caution:** a `tools` settings namespace already exists for summarizer tool providers
  (`isToolEnabled`, `:1133`) — do NOT collide; use `chat.toolsEnabled`.
- In `runGeneration`, when `toolsEnabled && capabilities.supportsTools`, add `tools` +
  `stopWhen: stepCountIs(5)` to the request built at `chatService.js:319-326`. The four callers
  (`:446,:460,:482,:520`) inherit it. **Note a fifth generation path, `continueResponse`
  (`chatService.js:532-705`), inlines its own stream loop and bypasses `runGeneration` — it will
  NOT get tools; that's fine for V1 (continue just resumes text), but state it intentionally.**
  Persist nothing new on the message beyond existing `groundingRefs`; tool steps are runtime trace.
- **Tool-step trace is under-scoped, budget real work (review):** `ChatThinkingIndicator.svelte`
  is propless, picks one random word, and vanishes on the first text token — it **cannot** host a
  live trace as-is. Surfacing steps means new plumbing through ~5 layers: adapter tool-event
  sentinel → `generateContentStreamEnhancedRequest` → `defaultStreamRequest` → `runGeneration`'s
  `for await` loop (`:328-345`, today only handles `isComplete`/`fullText`) → a new callback →
  `chatStore` (five `onChunk` sites) → a reworked indicator component. Either budget this, or ship
  V1 with **no** live trace (tools still work headless) and add trace later.
- Toggle setting UI in `src/entrypoints/settings/components/ChatSettings.svelte` (uses
  `settings.chat?.*`, `updateFeatureSettings`).

**Verify:** `npm run dev`; enable the setting; ask the chat "what did I summarize about X last
week?" with a Gemini model — observe it call `search_archive` and answer from results. Disable
setting → no tool calls. With an Ollama model, the tool UI is hidden (gate). `npm test` +
`npm run check` green; `contextPipeline.test.js` cache-stable-prefix assertions still pass.

## Out of scope (V1)
Any page-access or network tool (`web_fetch` etc.); perception/action engine (Doc 3); persisting
tool transcripts.

## Final verification checklist
- [ ] `npm test`, `npm run check` pass; `layering.test.js` green (new files respect Rules 1–6).
- [ ] Tool loop only fires when `chat.toolsEnabled` AND `supportsTools`.
- [ ] `search_archive` output is escaped/wrapped as untrusted.
- [ ] Cache-stable-prefix tests unchanged.

## Notable files
- `src/services/chat/chatService.js:203,319-326` — `runGeneration`; add `tools`+`stopWhen`.
- `src/lib/api/aiSdkAdapter.js:550-573,942-990` — stream reader + enhanced stream (widen).
- `src/lib/chat/providerCapabilities.js:32,54,69,96,107-153,159` — add `supportsTools`.
- `src/lib/chat/tools/*.js` — **new**: `searchArchive.js`, `formatToolResult.js`, `index.js`.
- `src/lib/db/indexedDBService.js:321,523` — archive reads to scan.
- `src/stores/settingsStore.svelte.js:168-173,1144` — `chat.toolsEnabled` flag.
- `src/entrypoints/settings/components/ChatSettings.svelte` — toggle UI.
- `src/entrypoints/sidepanel/components/chat/ChatThinkingIndicator.svelte` — tool-step trace.
