# Agent Mode — UI/UX, Opt-in & Tab Containment — V1

> **GATED PLAN.** This designs the Agent Mode **product surface** (mode toggle, safety
> onboarding, tab containment, in-page ActionMask/Takeover). Per the bundle's scope decision,
> it must **NOT** be executed until [`03-agent-poc-harness.md`](./03-agent-poc-harness.md) has
> returned a **go** decision — building this UI before the PoC measures the JS action engine's
> real success rate risks polishing a controller that can't reliably act. Treat Phase 0 as the
> hard precondition.
>
> Self-contained; run Phase 0 → 5 in order once unblocked. Design inputs:
> [`../research/page-agent-integration-feasibility-v1.md`](../research/page-agent-integration-feasibility-v1.md)
> §2.1.1 (ceiling), §2.1.3 (page-agent source findings incl. `SimulatorMask`, heartbeat), and the
> predecessor [`../research/summarizerrrr-agent-sku-v1.md`](../research/summarizerrrr-agent-sku-v1.md)
> §7 (containment), §8.3 (Manus takeover), §9 (permission model).

## Context

Agent Mode lets the AI click/type/scroll on a target tab (JS-only engine from Docs 3). Three
safety properties are **mandatory, not optional** (user requirement 2026-08-15): the feature is
**default-OFF / explicit opt-in**, the agent is **contained** to a user-designated tab, and the
user can **stop / take over** at any moment. This doc turns those into concrete UI + enforcement.

Current state (verified):
- The sidepanel sticky header lives at `src/entrypoints/sidepanel/App.svelte:706-719`:
  `ChatTabTitleBar` (`:710`) + `ChatHeader` (`src/entrypoints/sidepanel/components/chat/ChatHeader.svelte`,
  97 lines) — the natural home for a top-bar mode switch.
- **Modal precedent:** `src/entrypoints/settings/components/ui/ConfirmDialog.svelte` (and
  `BlacklistConfirmModal.svelte`, `DeepDiveDialog.svelte`) — reuse for the onboarding warning +
  domain-transition prompt.
- **App-level overlay precedent:** the Firefox permission flow — `PermissionWarningPrompt.svelte`
  lazy-imported at `App.svelte:523-526`, rendered via `firefoxPermissionOverlay` at `:731`; the
  `fixed inset-0 z-[45]` class lives in the **child** `PermissionWarningPrompt.svelte:226` (mirror
  the child, not App.svelte). This is the model for a sidepanel-level "agent is asking permission"
  surface.
- **In-page shadow-DOM overlay precedent:** the FAB mounts via `createShadowRootUi`
  (`src/entrypoints/content/main.js:61`, host `z-index:2147483647` at `:77`). The ActionMask +
  phantom cursor mount the same way, in the content script.
- **Settings flag:** `settings.chat` block (`settingsStore.svelte.js:168-173`), written via
  `updateFeatureSettings('chat', …)` (`:1144`) — home for `agentMode` opt-in state.
- Chrome permissions (`wxt.config.ts:56-66`): `tabs`, `activeTab`, `scripting`, `storage`,
  `alarms` present; **`tabGroups` is NOT.**

### ⚠️ Load-bearing cross-browser constraint (surface this before designing)
**Tab Groups are Chrome/Edge-only.** `chrome.tabs.group()` needs `tabs` (present); setting the
group's **color/label** needs the **`tabGroups`** permission (must be added, Chrome branch only —
it's not a scary-warning permission). **Firefox has no tab-groups API at all.** So the user's
"Layer 1 = visual Tab Group" works on Chrome/Edge but **cannot exist on Firefox**. Containment must
therefore be split:
- **Enforcement (all browsers):** a logical `getTabForTool` allowlist keyed by tabId — this is
  what actually keeps the agent contained; it does NOT depend on any OS-level grouping.
- **Visual grouping (Chrome/Edge only):** the colored tab-group is the *consent story* and the
  allowlist's source, but it is a **policy convention, not a hard sandbox** — with the JS-only
  engine, containment is enforced by the controller only ever calling `executeScript` on tabIds
  that pass `getTabForTool`, not by the group itself.
- **Firefox fallback:** single-tab-by-tabId containment (Layer 2), no colored group, with clear
  in-panel text naming the one tab the agent may touch.

### Goal & scope decision (confirmed with user)
- Default-OFF; explicit opt-in with a first-run acknowledgement modal.
- 3-layer containment: Tab Group (Chrome) / single-tab default / domain_transition guard.
- In-page ActionMask + phantom cursor + Takeover; user click or Takeover button instantly yields.
- One SKU, cross-browser: Firefox **and Safari** (both MV2, no tab-groups API) degrade Layer 1 to
  logical containment (above), everything else works. No CDP.
- **Desktop-sidepanel-only.** Mobile forces the popup surface (`background/index.js:111,119-123,
  271-286` → `setPopup` on `isMobile`); the popup closes on blur, which would kill the heartbeat
  and tear down the mask mid-run. Agent Mode must be hidden/disabled on mobile — the toggle simply
  doesn't render there.

## Phase 0 — precondition gate (do not skip)
- Confirm `03-agent-poc-harness.md` recorded a **go** decision with an acceptable success rate.
  If no-go, **stop** — this doc is not executed.
**Verify:** Doc 3's decision section says go; link it here.

## Phase 1 — mode toggle, default-OFF, opt-in onboarding
- Add `settings.chat.agentMode: false` and `settings.chat.agentModeAcknowledged: false` to
  `DEFAULT_SETTINGS.chat` (`settingsStore.svelte.js:168-173`) via `updateFeatureSettings`.
- **New `ChatModeToggle.svelte`** under `src/entrypoints/sidepanel/components/chat/` (unique
  basename — Rule 4; single-surface so NOT in `src/components/`): `[💬 Chat] [⚡ Agent Mode]`,
  Agent visibly "Thử nghiệm/experimental". Prefer a dedicated component over cramming
  `ChatHeader.svelte` — that header is a 32px (`h-8`) row already carrying title + New-chat +
  `ConversationMenu` (`:62-97`); a segmented switch won't fit cleanly. **Do not render it on
  mobile** (desktop-sidepanel-only, above).
- First time the user flips to Agent Mode (`!agentModeAcknowledged`): show a `ConfirmDialog`-based
  modal with the safety text ("AI can click and fill forms on the designated tab; you can Stop or
  Take over any time"). Only on confirm set `agentModeAcknowledged = true` and activate. Cancel →
  stay in Chat.
- When Agent Mode is OFF, **no** perception/action code path is reachable (the toggle gates the
  whole controller). Note Doc 3's `page-actions.js` unlisted script still *ships* in every build
  (it's an entrypoint, not dev-gated) — but it's never *invoked* when the toggle is off; there's
  no contradiction, just an inert injectable.
**Verify:** fresh profile → sidepanel opens in Chat, no agent affordances. Flip to Agent → modal
appears; cancel keeps Chat; confirm activates and doesn't re-prompt next time. `npm test` +
`npm run check` green.

## Phase 2 — containment core: `getTabForTool` + Layer 1/2
- **`getTabForTool(tabId)` is the single enforcement point for the AGENT ENGINE** (doc cũ §7.1) —
  scope it to Doc 3's action layer (`__PAGE_AGENT_ACT__`), NOT the existing extraction/permission
  `executeScript` sites (`contentService.js:83`, `chatSourceService.js`, `firefoxPermissionService.js`,
  `background/index.js`) which are read-only capture and neither route through nor need it. Every
  agent tool/action that receives a tabId resolves through `getTabForTool`; it returns the tab only
  if the tab is in the agent allowlist, else throws. Batched/multi-action calls check **each**
  sub-action's tabId.
- **Containment state placement (layering):** the allowlist is runtime agent state, not a setting.
  Keep it inside the new `agentContainment` module (or a dedicated agent store) — a `services/`
  module may import `stores/settingsStore` **only** (Rule 2), so `agentContainment.js` must not reach
  into `chatStore`/a new store; hold the allowlist internally and expose functions.
- **Layer 2 (default, all browsers):** the allowlist starts as exactly the current tab; the agent
  may not open or switch tabs unless the user explicitly asks.
- **Layer 1 (Chrome/Edge):** on activating Agent Mode for a tab, `chrome.tabs.group()` it into a
  labeled colored group (`🤖 AI Agent`); add `tabGroups` to the Chrome manifest permissions
  (`wxt.config.ts:56-66`). The allowlist = tabs in that group. **Firefox:** skip grouping; the
  allowlist is just the single tabId, surfaced as in-panel text.
- **New-tab handling (doc cũ §7.1) — default BLOCK, not auto-adopt.** Without CDP you cannot
  reliably attribute a newly-created tab to an agent action vs. a user action (`tabs.onCreated`
  fires for both; auto-adopt is racy and could pull a user's own new tab into scope). So on a
  `target="_blank"`/new tab, the gate **blocks + reports** "blocked — outside agent scope" rather
  than silently hanging or auto-adopting. Explicit user-driven adoption can come later.
**Verify:** activate on tab A; on Chrome a colored group appears containing only A. Point a tool at
another tab B's id → `getTabForTool` throws, no DOM read/click happens on B. On Firefox, same
containment by tabId, no group. `npm test` green.

## Phase 3 — Layer 3: `domain_transition` guard on `navigate`
- Any agent `navigate` that changes the **registrable domain** pauses and asks via a modal /
  App-level overlay (mirror `PermissionWarningPrompt` at `App.svelte:523-526`): "Agent muốn điều
  hướng sang `abc.com`. Cho phép?" → `[Cho phép 1 lần] [Từ chối]`. This is feasibility §2.1 safety
  #4 — the navigate+type exfiltration path survives JS-only, so this guard is mandatory, not nice.
- **"Registrable domain" has NO utility in this repo yet (Phase-3 blocker).** Only raw `hostname`
  handling exists (`titleExtractor.js`); a naive hostname compare over-prompts across subdomains
  (`a.example.com`→`b.example.com`) and mishandles multi-part TLDs (`example.co.uk`). Bundle a
  small public-suffix helper (eTLD+1) or write down an explicit documented heuristic — decide
  before implementing.
- **`ConfirmDialog` is fire-and-forget and unsafe as-is for this prompt.** It exposes an
  `onConfirm` callback with close-on-cancel — no promise, no allow/deny/timeout distinction. Wrap
  it in a **promise-queue** so each `navigate` request `await`s a single resolve. Also it renders
  `description` via **`{@html}`** (`ConfirmDialog.svelte:72`) — interpolating an agent-influenced
  domain string raw is an **XSS vector**; sanitize the domain or switch that prompt to a text
  binding. (The agent loop and this UI both live in the sidepanel, so it's a same-context `await`,
  not cross-context messaging.)
- Permission plumbing (doc cũ §9): prompts **serialized** through one promise chain (never two
  popups at once); **timeout ⇒ deny** (~30s); prompt names the **action + domain**, not the tool
  name. `navigate` defaults to **always-ask** (no "always allow").
**Verify:** script the agent to navigate same-domain (allowed silently) then cross-domain (prompt
appears; deny aborts the step with a clear message; allow proceeds once only). Two rapid
cross-domain requests never show two simultaneous popups.

## Phase 4 — in-page ActionMask, phantom cursor, Takeover
- Vendor page-agent's `SimulatorMask.ts` (~220 lines, §2.1.3) into `src/lib/dom/` (MIT header;
  DOM/shadow globals are fine in `lib/` — no cross-layer import). It provides: full-screen
  `pointer-events:auto` overlay that blocks user events while the agent acts, and an SVG **phantom
  cursor** gliding to the target element.
- **⚠️ Mount path must be INDEPENDENT of the FAB (Phase-4 blocker).** Do NOT ride
  `content/main.js`'s mount — it early-returns before mounting anything when the FAB is disabled
  (`:20-25`), when `shouldShowFab` is false (`:45-49`), or on Firefox permission denial (`:36`), so
  a user who turned the FAB off but enabled Agent Mode would get **no mask at all**. Mount the
  ActionMask on its **own host** via a separate path — either on-demand `scripting.executeScript`
  injection when a run starts, or an always-registered content-script listener decoupled from FAB
  gating. The FAB's mount mutex (`__SUMMARIZERRRR_MOUNT_LOCK__`, `content/main.js:90`) only guards
  the FAB host, so a second independent host is fine (`createShadowRootUi`, own `z-index`).
- **Floating Action Bar** (top of page, in the same shadow host):
  `🤖 AI đang thao tác…  [⏸ Tạm dừng] [✋ Tôi tự làm (Takeover)] [⏹ Dừng hẳn]`.
- **Takeover:** user clicks `✋` **or** clicks anywhere on the page → agent immediately releases,
  the mask drops so the user can type/click (OTP, captcha), then `[Tiếp tục]` resumes. Model a state
  machine `idle | ongoing | takeover | stopped` (Manus, §8.3).
- Two Manus details are **mandatory** on a tab the user is actively viewing (§8.3): **hide the
  ActionBar/overlay before each click** (`withActionBarHiding` — the overlay would otherwise
  intercept the click), and **origin-check before dispatch** (`snapshotOrigin !== currentOrigin`
  → abort with `page_updated`; DOM drift between steps is normal here, not exceptional).
**Verify:** run a multi-step action on a form; the phantom cursor moves to each field, the mask
blocks stray user input during a step, and clicking `✋` (or clicking the page) instantly frees the
page and pauses the agent; `[Tiếp tục]` resumes. `⏹` stops fully.

## Phase 5 — lifecycle & reliable teardown
- **Heartbeat cleanup (page-agent pattern, §2.1.3):** the sidepanel writes `agentHeartbeat` to
  `chrome.storage.local` every ~1s; the content script tears down mask + phantom cursor if the
  heartbeat is missing >2s. This is the reliable-cleanup answer because MV3 kills the service
  worker and the sidepanel has no dependable `unload` (doc cũ §7.4). **Use `setInterval` in the
  sidepanel page + a polling timer in the content script — NOT `chrome.alarms`** (MV3 alarms have a
  1-minute minimum, far too coarse for a 1s heartbeat; the `alarms` permission is unrelated here).
  Firefox (MV2 event page + closable sidebar) needs the same heartbeat.
- On turning Agent Mode OFF or closing the panel: stop the agent, remove the mask, and (Chrome)
  **ungroup** the tab. Firefox: clear the tabId allowlist.
- No agent transcript/state is persisted (privacy — doc cũ §7.3); closing the panel loses the run.
**Verify:** start an agent run, then close the sidepanel → within ~2s the page's mask/cursor
disappear and (Chrome) the tab is ungrouped; reopening the panel shows Chat (default), no orphaned
overlay, no stuck group.

## Out of scope (V1)
CDP anything; `execute_javascript` as a tool; multi-tab agent workflows beyond the allowlist;
persisted agent transcripts; `web_fetch`; agent-turn token budgeting (feasibility open question
6b.1 — resolve separately before the loop runs many steps).

## Final verification checklist
- [ ] Doc 3 returned **go** (Phase 0).
- [ ] Default-OFF; opt-in modal gates first activation; toggle fully gates the controller.
- [ ] `getTabForTool` is the sole tabId gate; a tool pointed at an out-of-scope tab throws.
- [ ] Chrome shows a colored agent group + has `tabGroups` permission; Firefox degrades to logical
      single-tab containment with in-panel text (no group), everything else works.
- [ ] Cross-domain `navigate` prompts (serialized, timeout⇒deny, always-ask); same-domain silent.
- [ ] ActionMask blocks stray input; phantom cursor visible; Takeover (button or page click)
      instantly yields; origin-check + action-bar-hiding in place.
- [ ] Heartbeat teardown removes mask + ungroups within ~2s of panel close.
- [ ] `npm test` + `npm run check` green; `layering.test.js` green (new `.svelte` unique basenames,
      `src/lib/dom/` imports only lib).

## Notable files
- `src/entrypoints/sidepanel/components/chat/ChatHeader.svelte` — top bar; mode toggle host.
- `src/entrypoints/sidepanel/components/chat/ChatModeToggle.svelte` — **new** (if extracted).
- `src/entrypoints/settings/components/ui/ConfirmDialog.svelte` — reuse for onboarding + domain prompt.
- `src/entrypoints/sidepanel/App.svelte:523-526,731` — `PermissionWarningPrompt` overlay pattern to mirror.
- `src/stores/settingsStore.svelte.js:168-173,1144` — `chat.agentMode` / `agentModeAcknowledged`.
- `src/services/chat/agentContainment.*` — **new** `getTabForTool` + allowlist + tab-adopt listener.
- `wxt.config.ts:56-66` — add `tabGroups` to Chrome permissions (Chrome branch only).
- `src/lib/dom/SimulatorMask.*` — **new**, vendored from page-agent (MIT header).
- `src/entrypoints/content/main.js:20-49,61,77,90` — FAB early-returns (why the mask needs its own
  mount path), `createShadowRootUi` pattern, mount mutex.
- Heartbeat: `setInterval` in the sidepanel page + polling timer in the content script writing/
  reading `agentHeartbeat` in `chrome.storage.local` — **not** `chrome.alarms` (1-min floor).
- `background/index.js:111,119-123,271-286` — mobile→popup branch (why Agent Mode is desktop-only).
