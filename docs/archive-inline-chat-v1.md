# Archive Inline Chat (detached) + Per-Conversation Lock — V1

> **Step 0 for the executor:** this plan was written in plan mode. If it is not yet at
> `docs/archive-inline-chat-v1.md`, save it there first.
>
> **How to use this doc:** this is a self-contained execution plan, meant to be run in a fresh session.
> Start at Phase 1 and go in order. Each phase ends with a verify step; don't move on until it passes.

## Context

The Archive page (`src/entrypoints/archive/`) lists saved chat conversations next to summaries. Selecting a conversation shows `src/entrypoints/archive/components/displays/ConversationTranscript.svelte`, a read-only transcript with its own message rendering. Its main action is **"Resume in side panel"**:
- It calls `resumeArchivedConversation(id)` in `src/stores/conversationArchiveStore.svelte.js:91`.
- That sends `RESUME_CONVERSATION` to the worker (`src/entrypoints/background/handlers/navigationHandlers.js:22`).
- The worker posts `resumeConversation` to the side-panel port.
- `src/entrypoints/sidepanel/messageHandler.js:229` then calls `openConversation(id)`.

Two problems:
1. **Friction.** You can't ask a follow-up where you are reading; you have to jump to the side panel.
2. **Resume bug.** `openConversation()` (`src/stores/chatStore.svelte.js:622`) writes the conversation into the session of the **currently active browser tab** and does not set `detached`. On the next send, `sendChatMessage()` (`chatStore.svelte.js:859`, `sourceRequired = !activeSourceDismissed && !owner.detached`) grounds the answer on that unrelated live page. Example: resuming a Wikipedia chat while a YouTube tab is active feeds the YouTube transcript into the old conversation.

An archived conversation has no live page by nature. That is exactly the **detached** session mode the side panel already has (commit c96545e; `detached` field at `chatStore.svelte.js:43`): follow-ups use only history sources and never the live page.

### Goal & scope decision (confirmed with owner)
- **Chat directly in the Archive page**, running the real `chatStore` in detached mode. Edit, regenerate, branches, `@tab` mentions, skills and the model picker all work. There is no "current page" source.
- **Shared chat UI core.** Move the `ChatShell` component subtree from `src/entrypoints/sidepanel/components/chat/` to `src/components/chat/` so both surfaces render the same components. Do not build a second, lighter chat renderer.
- **Single writer per conversation.** If the same conversation is open in two extension pages (side panel + archive tab), the one that opened it **second is read-only** until the first releases it. Use the Web Locks API.
- **Resume stays, but as a secondary action**, and it opens the conversation **detached** so it never grabs the active tab as a source.
- This deliberately reverses a past choice. The comment in `navigationHandlers.js:27` ("so an archive page never needs to import chat state directly") must be updated.
- No new dependencies. No IndexedDB schema changes.

### Constraints the executor must respect (from `CLAUDE.md`)
- **Layering guard** `tests/architecture/layering.test.js`:
  - Rule 5: no cross-surface component imports.
  - Rule 6: every file under `src/components/` must be reachable from **≥2 entrypoint roots**.
  - Basenames of `.svelte` files must be unique.
- `services/` may import `lib`, `services`, and `stores/settingsStore` only.
- `CLAUDE.md` states the exact folder and file counts of `src/components/*`. Update them.

## Phase 1: Move the shared chat UI to `src/components/chat/`

Pure relocation, with no behaviour change.

**Move** these files from `src/entrypoints/sidepanel/components/chat/` to `src/components/chat/` (they form the `ChatShell` import tree):
- Shell and messages: ChatShell, ChatMessageList, ChatMessage, ChatMessageEditor, ChatThinkingIndicator, ChatDeepDive, ChatEmptyState, ChatContextWarning
- Composer: ChatComposer, ChatComposerInput, ChatRichTextInput, ChatContextBar, ChatContextGauge, ChatModelSelect, ChatSkillChip, SkillPicker, TabMentionMenu, ChatSourceIcon, ChatFavicon
- User messages: ChatUserBubble, ChatUserMarkdown, ChatUserHeading, ChatUserHr, ChatUserLink

**Also move** `src/entrypoints/sidepanel/components/Tooltip.svelte` → `src/components/ui/Tooltip.svelte`. It is used by ChatMessage and ChatDeepDive, and also by sidepanel's `SettingButton`, `ActionButtons` and `ActionButtonsMini`.

**Keep in sidepanel** (tab-bound, not in the ChatShell tree): ChatHeader, ConversationMenu, ChatTabTitleBar, ChatSourceDrawer, ChatMessageMeta.

Then update every import:
- Grep for `sidepanel/components/chat/` and `sidepanel/components/Tooltip` across `src/` and `tests/`.
- The `tests/chat/*.test.svelte.js` files import some of the moved components.

Rule 6 will **fail** until Phase 4 adds the archive as a second consumer. Do Phases 1–4 on one branch. During Phases 1–3, run the suite with the layering test excluded, then run the full suite at Phase 4.

**Verify:**
- `npx vitest run --exclude tests/architecture/**` passes.
- `npm run check` reports no new errors.
- `git grep "sidepanel/components/chat/Chat\(Shell\|Message\b\|Composer\)"` returns nothing.

## Phase 2: Open a conversation in detached mode (chatStore)

In `src/stores/chatStore.svelte.js`:
- Change the signature to `openConversation(id, { detached = false } = {})` and include `detached` in the `writeSession(activeTabId, {...})` patch.
- The Archive page never calls `syncChatForActiveTab`, so its `activeTabId` stays `null`. Audit that path:
  - `writeSession(null, …)` and `readSession(null)` already target `chatState` (`:196`, `:202`).
  - `sendChatMessage` skips `startConversationForActiveTab` because a conversation exists. `getSession(null)` returns `null`, so `sessionStillOwns` is true.
  - `drainQueuedSend` checks `tabId !== activeTabId`, and `null === null`, so it passes.
  - `ensureActiveSourceEstimate` already returns early when `owner.detached` (`:261`).
  - `closeConversation()` (`:662`) must not call `syncChatForActiveTab` when `activeTabId == null`. Today it is guarded by `activeTabId != null`; confirm it stays that way.
  - `setChatModel`, `retryChatMessage`, `regenerateChatMessage`, `editChatMessage`, `continueChatMessage`: confirm none of them assume a non-null tab, and none re-enable the live source for detached sessions.
- Add `tests/chat/chatStoreDetachedOpen.test.js`, modelled on `tests/chat/chatStoreTabs.test.js` / `chatQueuedSend.test.js`:
  - After `openConversation(id, { detached: true })` with no active tab, `sendChatMessage` calls `chatService.send` with `activeSource: null` and `sourceRequired: false`.

**Verify:** the new test passes, and `npx vitest run tests/chat` is green.

## Phase 3: Per-conversation lock (Web Locks API)

**New file** `src/services/chat/conversationLockService.js`:
- `acquire(conversationId)` calls `navigator.locks.request('chat-conv:' + id, { ifAvailable: true }, cb)`.
  - If `cb` receives `null`, return `{ held: false }`.
  - Otherwise keep the lock by returning a promise that only resolves when `release()` is called, and return `{ held: true, release }`.
- `waitFor(conversationId, onAcquired)` queues a normal (blocking) request. When it is granted, it calls `onAcquired(release)`. It returns a cancel function, implemented with an `AbortController` `signal`.
- If `navigator.locks` is missing, return `{ held: true, release: () => {} }` (no locking, same behaviour as today).
- Locks are shared across same-origin extension pages (side panel and archive tab), and the browser releases them automatically when a page closes.

**Integrate into `chatStore`:**
- Add `readOnly: false` to `createChatSessionState()`.
- Keep a `Map<conversationId, {release, cancelWait}>`.
- Acquire the lock in `openConversation` and `startConversationForActiveTab`.
- Release it in `closeConversation`, `removeChatTabSession`, and whenever a session switches to another conversation.
- If the lock is not held:
  - Set `readOnly: true` and call `waitFor`.
  - When the lock is granted, reload the path (`conversationRepository.getGenerationPath`, the same windowing as `openConversation`), because the other writer may have appended messages. Then set `readOnly: false`.
- Block writes while `readOnly`:
  - `canSendChat()` (`:324`) returns false.
  - `sendChatMessage`, `retryChatMessage`, `regenerateChatMessage`, `editChatMessage`, `continueChatMessage` and `switchBranch` return early.

**UI:**
- `src/components/chat/ChatComposer.svelte` shows a short banner and disables input when `chatState.readOnly`.
- `ChatMessage` hides its edit/regenerate actions in that state.
- Add i18n keys (e.g. `chat.read_only_elsewhere`) to every locale file under `src/lib/i18n/`.

**Tests:** add `tests/chat/conversationLockService.test.js` with a fake `navigator.locks`. It should cover:
- The second acquirer gets `held: false`.
- `waitFor` fires after the first holder calls `release`.
- The no-API fallback.

Also add a chatStore test: a conversation opened while locked is `readOnly`, and the send is a no-op.

**Verify:** the new tests pass, and `npx vitest run tests/chat` is green.

## Phase 4: Archive renders ChatShell

In `src/entrypoints/archive/components/displays/ConversationTranscript.svelte`:
- Keep the header: title and rename, date, archived badge, display controls, action row (archive, export, delete).
- Replace the hand-rolled message list with `<ChatShell />` from `@/components/chat/ChatShell.svelte`.
- Use an `$effect` on `conversation.id` that calls `openConversation(conversation.id, { detached: true })`. On change or unmount, call `closeConversation()`, which releases the lock.
- `ChatShell` scrolls the document and reads `[data-sticky-header]` (see `ChatShell.svelte:54-105`). Put `data-sticky-header` on the archive's sticky header, or confirm an offset of 0 is fine. Also check the TOC grid layout (`contentGridClass`) still works.
- After a successful send, refresh the archive list so ordering and timestamps update: call `loadConversationArchive()` from `conversationArchiveStore` when `chatState.isSending` flips from true to false.
- `conversationArchiveStore`'s `selectedMessages` / `selectedSources` are no longer needed for rendering. Keep them only if export uses them.
- Update the comment at `background/handlers/navigationHandlers.js:27`.
- Update the `src/components/*` folder and file counts in `CLAUDE.md` (a new `chat` folder, and `ui` +1).

**Verify:**
- `npm test`, including `tests/architecture/layering.test.js`, is fully green.
- `npm run check` passes.
- `npm run build` succeeds.

## Phase 5: Resume opens detached, and becomes secondary

- In `src/entrypoints/sidepanel/messageHandler.js` (case `resumeConversation`), call `openConversation(request.conversationId, { detached: true })`. The existing "return to browser" path in `closeConversation()` (`chatStore.svelte.js:664`) already brings the user back to the live tab's chat.
- Do the same for the pending-resume path in `background/index.js:744`. It posts the same port message, so no change is needed there; just confirm it.
- In the Archive:
  - Remove the "Resume in side panel" button from the main action row in `ConversationTranscript.svelte` (`~:242`) and from `ArchiveListItem.svelte` (`~:86`).
  - Keep it only in `ActionDropdownMenu.svelte`.

**Verify:**
- `npm test` is green.
- Manual check: with a YouTube tab active, resume a non-YouTube conversation and ask a question. In the background service worker console, the request must contain no transcript source.

## Out of scope (V1)
- Persisting detached sessions across side-panel reloads (tracked separately in `docs/chat-detached-sessions-v1.md`).
- Starting a **new** chat from the Archive page (V1 only continues existing conversations).
- Live mirroring of messages between two open views. The read-only side refreshes only when it acquires the lock.
- Any change to the context pipeline, budgeter, or IndexedDB schema.

## Final verification checklist
- [ ] `npm test` is fully green, including the layering guard.
- [ ] `npm run check` reports no new errors, and `npm run build` succeeds.
- [ ] Manual (`npm run dev`, load `.output/chrome`):
  - [ ] Archive → select a conversation → ask a follow-up. The answer streams, uses only history sources, persists, and the list re-sorts.
  - [ ] Edit, regenerate and branch switching work in the Archive.
  - [ ] Open the same conversation in the side panel while the archive has it: the side panel is read-only with a banner. Close the archive tab: the side panel unlocks and shows the new messages.
  - [ ] Reverse order: side panel first, then archive. The archive is read-only.
  - [ ] Resume from the dropdown opens the conversation detached in the side panel. "Return to browser" restores the tab's own chat.
  - [ ] `@tab` mention works from the Archive composer.
- [ ] Firefox build (`npm run dev:firefox`) passes the same smoke test. Web Locks need Firefox 96+.

## Notable files
- `src/components/chat/*` (new location): the shared chat UI moved from sidepanel. Entry point is `ChatShell.svelte`.
- `src/components/ui/Tooltip.svelte`: moved from `entrypoints/sidepanel/components/`.
- `src/stores/chatStore.svelte.js`: `openConversation(id, { detached })`, the `readOnly` state, lock acquire/release, write guards.
- `src/services/chat/conversationLockService.js` (new): Web Locks wrapper.
- `src/entrypoints/archive/components/displays/ConversationTranscript.svelte`: renders `ChatShell` in detached mode.
- `src/entrypoints/sidepanel/messageHandler.js`: resume opens detached.
- `src/entrypoints/archive/components/{ArchiveListItem,ActionDropdownMenu}.svelte`: Resume becomes secondary.
- `src/entrypoints/background/handlers/navigationHandlers.js`: comment update only.
- `CLAUDE.md`: `src/components/*` counts.
