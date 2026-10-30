# Detached Chat Sessions — V1

> **How to use this doc:** Self-contained execution plan, intended to be run in
> a fresh session. Start at Phase 1 and go in order. Each phase ends with a
> verify step — don't move on until it passes.

## Context

The side-panel chat (`src/entrypoints/sidepanel/components/chat/`) keeps one
runtime session per **browser tab**:

- `src/stores/chatStore.svelte.js:152` — `tabSessions = new Map() // tabId -> session`,
  plus `activeTabId` (the session currently projected onto the reactive `chatState`).
  `writeSession(tabId, patch)` / `readSession(tabId)` route updates to the live view
  or to a background snapshot.
- `src/services/chat/chatSessionService.js` — runtime-only `tabId → conversationId`
  map. Tab IDs are never written to IndexedDB; conversations are persisted
  independently in `conversationRepository`.
- `src/entrypoints/sidepanel/components/chat/ChatTabTitleBar.svelte` — listens to
  `browser.tabs.onActivated/onUpdated/onRemoved`; `selectTab` calls
  `browser.tabs.update(tabId, { active: true })` and lets `onActivated` →
  `syncChatForActiveTab` swap the view (auto-follow).
- `src/services/chat/chatTabPolicy.js` — `mergeChatTabsWithBrowserTabs` builds the
  chat tab bar and **keeps only sessions whose tab still exists in the browser**.

**The problem.** Closing a browser tab runs `handleChatBrowserTabRemoved` →
`removeChatTabSession` (`chatStore.svelte.js:662-682`), which aborts any
in-flight reply, deletes the session (unsent draft included) and removes it from
the bar. The conversation survives in IndexedDB (reachable from
`ConversationMenu.svelte`), but to the user the chat dies with the page. That
fits the old one-summary-per-page model, not chat: a conversation outlives the
page it started on.

### Goal & scope decision (confirmed with user)

- **Keep auto-follow.** Switching browser tab still switches the chat view.
- **Closing a tab detaches the session** instead of killing it: it stays in the
  chat tab bar marked "page closed", a streaming reply keeps running, follow-ups work.
- **A detached session never grounds the live page.** Follow-ups use only the
  sources already in the conversation history. Explicit `@tab` attachments still work.
- **In-memory only (V1).** Detached sessions live exactly as long as live ones do
  today — they're gone when the side panel closes. Persisting sessions across
  side-panel close is a separate, later task.
- Only sessions with a conversation or an in-flight reply detach. A tab with no
  chat (or only an unsent draft) is dropped as today.
- No new dependencies; no IndexedDB schema change; no background-script change.

### Key design choice: the closed tabId stays the session key

Browser tab IDs are unique and never reused within a browser session (Chrome and
Firefox), and V1 sessions die with the side panel anyway. So a detached session
**keeps its old tabId as its key** and just gets `detached: true`.

Do **not** re-key detached sessions. `sendChatMessage`, `retryChatMessage`,
`regenerateChatMessage`, `continueChatMessage` capture `targetTabId = activeTabId`
at send time and write back with `writeSession(targetTabId, …)` for every chunk
and in `finally`. If the session moved to a new key, those writes would hit
`getSession(oldTabId)`, which silently creates a fresh empty session — the reply
would vanish.

Consequence: for live sessions "session key" == "browser tab id"; for detached
ones the key no longer names a live browser tab. Every place that uses the key
*as a browser tab* (source capture, `browser.tabs.update`) must check `detached`.

### Invariants to respect

- **No silent grounding of the wrong page.** `chatService.prepareGroundedAttachments`
  (`src/services/chat/chatService.js:185-197`) uses `activeSource.tabId/url` when
  given; otherwise it **falls back to `sourceService.getActiveTab()`** — whatever page
  the user is on now. A detached send must therefore go out with
  `sourceRequired: false` so this path is never reached.
- **Prompt-cache prefix stays byte-stable.** History sources are passed as
  `conversationSourceRefs: sourceIdsFrom(history)` (`chatService.js:293`);
  `src/lib/chat/contextPipeline/sourceResolver.js` emits conversation sources first
  and dedupes by sourceId. Dropping the live-page attachment on a detached turn
  leaves the source block identical to the previous turn. Do not add anything
  turn-varying to it (see `tests/chat/contextPipeline/`).
- **Layering** (`tests/architecture/layering.test.js`): `chatTabPolicy.js` is a pure
  service — keep it free of store imports. Component placement rules from
  `CLAUDE.md` apply (no new shared components needed).

## Phase 1 — Detach instead of remove (store core)

Files: `src/stores/chatStore.svelte.js`, `src/services/chat/chatTabPolicy.js`,
`tests/chat/chatStoreTabs.test.js`.

1. `createChatSessionState()`: add `detached: false` (with a short doc comment like
   its neighbours). Because `SESSION_KEYS = Object.keys(createChatSessionState())`,
   it automatically flows through `stashViewInto` / `projectSessionToView`, so
   `chatState.detached` is reactive.
2. Rewrite `handleChatBrowserTabRemoved(tabId)`:
   - Read the session (`tabId === activeTabId ? chatState : tabSessions.get(tabId)`).
   - If it has a conversation or a reply in flight — reuse
     `toChatTabRuntimeDescriptor(tabId, session)`'s `hasConversation || isLoading` —
     then: `writeSession(tabId, { detached: true, activeSourceEstimate: null })`,
     `chatSessionService.clearConversationId(tabId)`, **no abort**, leave
     `activeTabId` untouched (the browser fires `onActivated` for the next tab and
     `syncChatForActiveTab` stashes the detached view normally),
     `markChatTabsChanged()`; return `true`.
   - Otherwise keep today's path: `removeChatTabSession(tabId, { detachActiveTab: true })`.
3. `toChatTabRuntimeDescriptor` (`chatTabPolicy.js`): add `detached: Boolean(session?.detached)`,
   `title: session?.currentTitle || null`, `favIconUrl: session?.currentFavIconUrl || null`
   (a detached session has no browser tab to read a title from).
4. Tests — `tests/chat/chatStoreTabs.test.js`:
   - **Fix teardown first.** `afterEach` uses `handleChatBrowserTabRemoved(TAB_A/B/C)`
     to wipe sessions; that no longer clears sessions with conversations. Switch it
     to `removeChatTabSession(...)` (import it). Do the same in any other test file
     whose teardown relies on `handleChatBrowserTabRemoved`
     (`grep -rn handleChatBrowserTabRemoved tests/`).
   - Closing a tab whose session has a conversation keeps it in
     `getChatTabRuntimeDescriptors()` with `detached: true`, and its
     `abortController.abort` is not called.
   - Closing a tab with no conversation removes it (old behaviour).
   - A reply streaming when its tab closes still lands: start a send with a
     controllable `chatService.send` mock, close the tab, resolve the mock, assert the
     detached session holds the final messages and `isSending: false`.

**Verify:** `npm test -- tests/chat` passes, then the full `npm test` passes.

## Phase 2 — View switching for detached sessions (store)

Files: `src/stores/chatStore.svelte.js`, `tests/chat/chatStoreTabs.test.js`,
`tests/chat/chatTabScroll.test.js` (only if scroll behaviour needs a new case).

1. Extract the body of `syncChatForActiveTab` that swaps sessions — stash the current
   view (incl. `readViewportScroll()`), set `activeTabId`, `projectSessionToView`,
   `pendingScrollRestore`, `markChatTabsChanged`, lazy hydrate from
   `chatSessionService.getConversationId` — into a private helper. `syncChatForActiveTab`
   keeps setting `chatTabsState.activeBrowserTabId` and handling url/title/favicon on top.
2. Export `activateChatSession(key)`: calls the helper only. It must **not** change
   `chatTabsState.activeBrowserTabId` and must not refresh url/title/favicon. No-op if
   `key === activeTabId`.
3. **Generation ownership guard (do this before step 4).** `abort()` does not stop a
   generation's remaining writes: after a session is deleted, the `catch` and `finally`
   of each generation entry point still call `writeSession(targetTabId, …)` and
   `drainQueuedSend(targetTabId, …)` (and, if the service had already resolved,
   `reloadActivePath`). For a key that is no longer `activeTabId`, `writeSession` /
   `readSession` go through `getSession()`, which **re-creates** the deleted session.
   This already leaks today on tab close; with detached chats being removable while
   streaming it becomes visible.
   - In each of the five entry points — `sendChatMessage`, `retryChatMessage`,
     `regenerateChatMessage`, `editChatMessage`, `continueChatMessage` — capture the
     session object right after `targetTabId`: `const ownerRef = getSession(targetTabId)`
     (`getSession` returns the stable object stored in `tabSessions`; `stashViewInto`
     copies into that same object, and deletion + re-creation produces a new one).
   - Add a small private helper, e.g. `sessionStillOwns(key, ref)` →
     `ref == null || tabSessions.get(key) === ref`, and route every post-start write in
     those functions — the `onUserMessage` / `onChunk` / `onWarnings` / `onDiagnostics`
     callbacks, `reloadActivePath`, the `catch` write, the `finally` write and
     `drainQueuedSend` — through it: when it returns `false`, skip silently.
     A small local wrapper per entry point (`const write = (patch) => { if (sessionStillOwns(targetTabId, ownerRef)) writeSession(targetTabId, patch) }`)
     keeps the diff readable; `reloadActivePath` and `drainQueuedSend` get an early return
     on the same check.
   - Do **not** change `writeSession` / `getSession` themselves: `syncChatForActiveTab`,
     `updateChatTabMetadata` and `startConversationForActiveTab` rely on lazy creation.
   - `closeConversation` (deletes the active entry) is covered by the same guard: a reply
     from the closed conversation no longer writes into whatever the tab shows next.
4. Leaving a detached session that is on screen and being torn down — in
   `removeChatTabSession` (when `isActiveSession && session.detached`),
   `closeConversation`, and `archiveConversation` (via `closeConversation`): after the
   teardown set `activeTabId = null` and return the view to the browser's tab with
   `syncChatForActiveTab(chatTabsState.activeBrowserTabId)` (fire-and-forget with a
   `.catch` log, matching existing `[chatStore]` logging). Without this the view stays
   bound to a dead key and `getSession()` would resurrect an empty session for it.
5. Tests:
   - Removing a detached chat **while it streams**: start a send with a controllable
     `chatService.send` mock, close its tab (detach), activate tab B, remove the detached
     session, then resolve (and separately: reject) the mock → the detached key is absent
     from `getChatTabRuntimeDescriptors()` / not re-created, and `chatState` still shows
     B unchanged (messages, `isSending`, `error`). Cover at least `sendChatMessage` and one
     of retry/regenerate/edit/continue.
   - `closeConversation` during a stream: resolving the mock afterwards does not write
     into the tab's fresh session.
   - `activateChatSession(detachedKey)` projects that session's messages and leaves
     `chatTabsState.activeBrowserTabId` unchanged; `chatTabsState.activeSessionTabId`
     equals the detached key.
   - Auto-follow: after that, `syncChatForActiveTab(TAB_B)` shows B and the detached
     session's snapshot (messages, composer draft, scrollTop) is preserved for later.
   - Removing the on-screen detached session projects the active browser tab's session.

**Verify:** `npm test` passes.

## Phase 3 — No live-page grounding while detached (store)

Files: `src/stores/chatStore.svelte.js`, `tests/chat/chatQueuedSend.test.js`,
`tests/chat/chatStoreTabs.test.js`.

1. `ensureActiveSourceEstimate`: return `Promise.resolve(null)` when the owner session
   is `detached` (before any `captureTabSource`).
2. `sendChatMessage`: compute
   `sourceRequired = !chatState.activeSourceDismissed && !owner.detached`. With that,
   `preparedActiveSource` is `null` and `chatService.send` receives
   `sourceRequired: false`, so the `getActiveTab()` fallback in
   `chatService.prepareGroundedAttachments` is never reached. `pendingAttachments`
   (explicit `@tab`) are untouched.
   - **Re-check after the capture await.** `sendChatMessage` computes `sourceRequired`
     and `preparedActiveSource` before `await ensureActiveSourceEstimate(...)`. If the tab
     closes during that await, Phase 1's detach clears `activeSourceEstimate`, the estimate
     job sees its key gone and returns `null` — yet `preparedActiveSource` still carries the
     closed `tabId`/`url`, so `chatService` would try `captureTabSource` on a closed tab and
     fail instead of answering from history. So, right after the await (and the
     `abortController.signal.aborted` check), re-read `readSession(targetTabId)`: if it is
     now `detached` and `preparedActiveSource?.sourceId` is still empty, set
     `preparedActiveSource = null` and `sourceRequired = false` (make them `let`) before
     calling `chatService.send`. If the capture did produce a `sourceId` before the close,
     keep it — that content was read while the page was open.
   - Residual, accepted for V1: when no estimate ran (or it produced no `sourceId`) and the
     tab closes *inside* `chatService`'s own capture, the send fails with the normal
     capture error. Don't add retry machinery for it.
3. `retry` / `regenerate` / `edit` / `continue` already rebuild context from history
   without capturing the active page — confirm by reading their `chatService` paths
   (`chatService.js` ~434-630); change nothing if so.
4. Tests:
   - `ensureActiveSourceEstimate` on a detached session returns `null` and
     `chatSourceService.captureTabSource` is not called.
   - In `chatQueuedSend.test.js` (it already mocks `chatService.send`): sending from a
     detached session calls `send` with `activeSource: null` and `sourceRequired: false`;
     an explicit pending `@tab` attachment is still passed through.
   - Tab closes mid-capture: make `chatSourceService.captureTabSource` return a
     controllable promise, start `sendChatMessage` on a live tab, call
     `handleChatBrowserTabRemoved(tab)` while capture is pending, then resolve the capture
     → `chatService.send` receives `activeSource: null` and `sourceRequired: false`, and
     `captureTabSource` was called exactly once (no re-capture of the closed tab).

**Verify:** `npm test` passes, including `tests/chat/contextPipeline/` (cache-prefix guard).

## Phase 4 — Tab policy and tab bar

Files: `src/services/chat/chatTabPolicy.js`,
`src/entrypoints/sidepanel/components/chat/ChatTabTitleBar.svelte`,
`tests/chat/chatTabPolicy.test.js`.

1. `mergeChatTabsWithBrowserTabs({ runtimeTabs, browserTabs, activeBrowserTabId, activeSessionId })`:
   - Live established tabs: unchanged (browser order, browser title). Exclude
     `runtime.detached` from this pass.
   - Detached tabs (`runtime.detached && runtime.hasConversation`): appended **after**
     the live tabs, in descriptor order, `title: runtime.title || 'Untitled'`,
     `detached: true`, `removable: true`, plus `isLoading` / `hasError`.
   - Active-browser-tab placeholder: today added only when the result is empty. Also
     add it when `activeSessionId` is a detached tab and `activeBrowserTabId` is not
     already in the result — otherwise the user has no way back to the page they're on.
   - `getAdjacentChatTabId` needs no change.
2. `ChatTabTitleBar.svelte`:
   - Pass `activeSessionId: chatTabsState.activeSessionTabId` into the merge and add
     `chatTabsState.activeSessionTabId` to the `$effect` trigger list.
   - The id given to `SidepanelTabBar` as `activeTabId` (and used by
     `navigateByOffset`) becomes `chatTabsState.activeSessionTabId ?? chatTabsState.activeBrowserTabId`,
     so a detached chat is highlighted when shown.
   - `selectTab(id)`: return if `id === activeSessionId`; if the item is detached →
     `activateChatSession(id)`; else if `id === chatTabsState.activeBrowserTabId`
     (coming back from a detached view — `onActivated` won't fire) →
     `syncChatForActiveTab(id)`; else `browser.tabs.update(id, { active: true })` as today.
   - `removeTab` / `handleRemoved`: same calls; the store decides detach vs remove.
     In `handleRemoved`, drop the local `tabs = tabs.filter(...)` shortcut (it would hide
     the just-detached tab until the next recompute) and rely on `refreshTabsInfo()`.
3. Tests — `tests/chat/chatTabPolicy.test.js`:
   - Detached runtime tab with no browser counterpart appears after live tabs with its
     own title and `detached: true`.
   - Detached tab without a conversation is not shown.
   - Placeholder for the active browser tab appears when `activeSessionId` is detached
     and the active browser tab has no chat; not added twice when it already has one.

**Verify:** `npm test` passes; `npm run check` reports no new errors.

## Phase 5 — Visual markers and i18n

Files: `src/entrypoints/sidepanel/components/SidepanelTabBar.svelte`,
`src/entrypoints/sidepanel/components/chat/ChatComposer.svelte`, all 8
`src/lib/locales/*.json` (`de, en, es, fr, ja, ko, vi, zh-CN`).

1. `SidepanelTabBar.svelte` (also used by the summary `TabTitleBar.svelte`; same
   surface, so no placement issue): additive only — when `tab.detached`, dim the title
   and show a small leading icon (e.g. `carbon:unlink` — any icon whose prefix is in
   `KNOWN_PREFIXES` of `build/icons/scanIconNames.mjs`; `npm run dev` / `npm run icons:sync`
   adds it to `src/lib/icons/iconBundle.js`), with a `title` tooltip from i18n. Summary
   tabs never set `detached`, so they render unchanged.
2. `ChatComposer.svelte`: find the active-source chip (driven by
   `chatState.activeSourceEstimate` / `activeSourceDismissed`). When `chatState.detached`,
   render a static note instead — e.g. "Page closed — using earlier sources" — with no
   capture/dismiss controls.
3. Add the new keys (tab tooltip + composer note) to every locale file under the
   existing chat namespace; English text in `en.json`, real translations in the others
   (match the tone of neighbouring keys).

**Verify:** `npm run icons:sync` succeeds (no `not_found`); `npm test` passes; then the
manual pass in the final checklist.

## Out of scope (V1)

- Persisting sessions (live or detached) across side-panel close/reopen
  (`browser.storage.session`). Separate task.
- Same-tab navigation to a different URL ("soft detach"); `updateChatSessionUrl`
  behaviour stays as is.
- Caps, auto-archiving or auto-collapsing of detached sessions — the user closes them
  with ×.
- Re-attaching a detached chat when a tab with the same URL is reopened.
- Tabs moved to another window (`onDetached`), which never fired `onRemoved` before either.

## Final verification checklist

- [ ] `npm test` passes (incl. `tests/architecture/layering.test.js` and `tests/chat/contextPipeline/`).
- [ ] `npm run check` shows no new errors.
- [ ] `npm run dev`, load `.output/chrome-mv3` (or the dev output folder) unpacked, then:
  - [ ] Chat on page A, close tab A → the chat stays in the bar marked as closed; the view follows to the newly active tab.
  - [ ] Close tab A **while a reply is streaming** → the reply completes in the detached chat.
  - [ ] Open the detached chat while on page B and ask a follow-up → the answer uses A's content; the context/sources drawer shows no new capture of B. Attaching B with `@tab` still works.
  - [ ] From the detached chat, click B in the bar → view returns to B. Switching browser tabs also moves the view (auto-follow).
  - [ ] Close the detached chat with × → view returns to the active browser tab; the conversation is still in the conversation menu history.
  - [ ] Close and reopen the side panel → detached chats are gone (expected for V1).
- [ ] Spot-check the close-tab and follow-up flows in Firefox (`npm run dev:firefox`).

## Notable files

- `src/stores/chatStore.svelte.js` — `detached` session flag, detach-on-close, `activateChatSession`, view fallback, no-grounding guard.
- `src/services/chat/chatTabPolicy.js` — descriptor fields; merge appends detached tabs and the active-tab placeholder.
- `src/entrypoints/sidepanel/components/chat/ChatTabTitleBar.svelte` — highlight by session, three-way `selectTab`.
- `src/entrypoints/sidepanel/components/SidepanelTabBar.svelte` — optional detached marker.
- `src/entrypoints/sidepanel/components/chat/ChatComposer.svelte` — "page closed" state for the source chip.
- `src/services/chat/chatService.js` — read-only reference: the `getActiveTab()` fallback this plan must never reach.
- `tests/chat/{chatStoreTabs,chatQueuedSend,chatTabPolicy}.test.js` — new cases; `chatStoreTabs` teardown fix.
- `src/lib/locales/*.json` — new chat keys.
