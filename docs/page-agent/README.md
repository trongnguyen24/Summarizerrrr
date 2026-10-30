---
type: plan-index
status: ready
---

# Page-Agent Integration — Experimental Plan Bundle

Bundle of 4 self-contained execution plans for the experimental phase of the JS-only
in-page agent direction. Each doc is runnable in a fresh session, phase by phase, with a
verify step at the end of every phase.

**Design source of truth:** [`../research/page-agent-integration-feasibility-v1.md`](../research/page-agent-integration-feasibility-v1.md)
(status: converged). Decision: **single SKU, JS-only in-page Agent Mode, CDP/2-SKU
cancelled** with an accepted capability ceiling (§2.1.1). This bundle plans only **up to the
Agent-Mode PoC gate** — the Agent Mode UI itself is deliberately not planned until Doc 3's
PoC measures the real success/failure rate.

## Docs

| # | File | What | Depends on |
|---|---|---|---|
| 1 | [`01-extraction-quick-wins.md`](./01-extraction-quick-wins.md) | `waitForDOMStable` + live-DOM visibility pre-pass for capture | — |
| 2 | [`02-chat-tool-loop.md`](./02-chat-tool-loop.md) | LLM tool loop in shared chat + `search_archive` (read-only) | — |
| 3 | [`03-agent-poc-harness.md`](./03-agent-poc-harness.md) | Action-engine PoC: measure JS click/type/scroll on ~10 real sites (**gate**) | 1 (reuses `isVisible`) |
| 4 | [`04-cited-qa.md`](./04-cited-qa.md) | DOM-anchored inline citations, opt-in "Cited Q&A" skill | 1 |
| 5 | [`05-agent-mode-ui-containment.md`](./05-agent-mode-ui-containment.md) | Agent Mode UI: default-OFF opt-in, 3-layer tab containment, ActionMask/Takeover | **3 = go** (+ 2) |

Recommended order: **1 → 2 → 3**; **4** runnable any time after 1. **Doc 5 is GATED** — do not
execute until Doc 3's PoC returns a go decision (building the Agent Mode UI before the engine is
proven risks polishing a controller that can't reliably act). Docs 1–4 are independently shippable.

## Scope decisions (confirmed with user 2026-08-15)

- **Docs 1–3 runnable now; Doc 5 (Agent Mode UI) is planned but GATED.** Doc 5 designs the
  mode toggle + containment + takeover mask, but its Phase 0 is a hard precondition: it does not
  execute until Doc 3's PoC returns a go on the JS action engine's real success rate. (Original
  scope said "don't plan the UI until the gate"; the user chose 2026-08-15 to write the plan now
  and gate its *execution* instead.)
- **Inline citations are in-scope** as a separate vertical slice (Doc 4), independent of the
  agent track.
- Everything stays in **one SKU**, cross-browser. No new sensitive permissions. No CDP.

## Repo facts (verified on `V3.0-refactor-01`)

- AI SDK `ai@^7.0.22` → use `stopWhen: stepCountIs(n)`, not `maxSteps`.
- Tests: `npm test` (vitest run). Type-check: `npm run check`. Dev: `npm run dev` / `npm run dev:firefox`.
- Architecture guard: `tests/architecture/layering.test.js` (Rules 1–6). No `.env` files exist yet.

## Cross-cutting constraints (all docs)

- **Layering:** `src/lib/**` imports only `src/lib/**` (tool code under `src/lib/chat/tools/`
  may import `src/lib/db/…`); read settings in `lib/` via `src/lib/config/settingsPort.js`,
  never the store. Single-surface `.svelte` files live under
  `src/entrypoints/<surface>/components/` with globally-unique basenames (Rule 4);
  `src/components/` is only for 2+-surface components (Rule 6).
- Run `npm test` before considering any pipeline/layering/component change done.
- **Feasibility open questions:** 6b.3 (vendor-vs-dependency) is **resolved** — vendor
  `dom_tree` + `actions.ts` into `src/lib/dom/`, not an npm dependency (page-agent source read
  2026-08-15, feasibility doc §2.1.3; Doc 3 Phase 0 done). Still open — do not silently decide:
  agent-turn token budget vs the fixed-per-turn budgeter (6b.1), relevant only if Agent Mode is
  built after Doc 3's PoC.
