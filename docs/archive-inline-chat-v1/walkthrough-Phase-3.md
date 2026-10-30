# Walkthrough - Phase 3: Per-conversation lock (Web Locks API)

Phase 3 of the Archive Inline Chat (detached) plan (`docs/archive-inline-chat-v1.md`) added a single-writer lock per conversation, built on the Web Locks API. When the same conversation is open in two extension pages, the page that opens it second is read-only until the first one releases it.

## Changes Made

### 1. Lock wrapper service

#### [conversationLockService.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/services/chat/conversationLockService.js) (new)
- `acquire(conversationId)` calls `navigator.locks.request('chat-conv:' + id, { ifAvailable: true }, cb)`. A `null` lock resolves `{ held: false, release: noop }`. A granted lock is kept by a pending promise that settles only when `release()` is called, and the call resolves `{ held: true, release }`.
- `waitFor(conversationId, onAcquired)` queues a blocking request with an `AbortController` signal. When the lock is granted it calls `onAcquired(release)`. It returns a cancel function that aborts a request still in the queue. A lock that was already granted is not released by cancel, so the caller must call the `release` it received.
- When `navigator.locks` is missing, `acquire` resolves `{ held: true, release: noop }` and `waitFor` calls `onAcquired` on the next microtask. Behaviour is the same as before the lock existed.
- The module has no imports, so it respects the `services/` layering rule.

### 2. Lock bookkeeping and read-only state in chatStore

#### [chatStore.svelte.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/stores/chatStore.svelte.js)
- `createChatSessionState()` gained `readOnly: false`, with a doc comment. It is in the session snapshot, so each browser-tab session and the standalone view carry their own flag.
- A module-level `conversationLocks: Map<conversationId, { release, cancelWait }>` tracks locks held or queued by this page. The entry is registered synchronously before the await, so a concurrent claim sees it.
- `claimConversationLock(conversationId, tabKey)` takes the lock. It returns `true` when writable. When another page holds the lock, it queues `waitFor` in the background and returns `false`. If the entry was released while the acquire was in flight, the new lock is given back immediately.
- `reloadAfterLockGranted(tabKey, conversationId)` runs when a queued lock is granted. It reuses `reloadActivePath` (the same windowing and committed-source resolution as `openConversation`) to pick up messages the other writer appended. It only writes if the session still shows that conversation, and it always clears `readOnly` in `finally`.
- `releaseConversationLock(id)` cancels a queued wait or releases a granted lock. `releaseConversationLockIfUnused(id)` does this only when no session on the page still shows the conversation, so two tabs on one page share one lock.
- Acquire sites:
  - `openConversation` claims the lock before loading the path, writes `readOnly: !writable`, and releases the previously shown conversation if it differs.
  - `startConversationForActiveTab` claims the lock for the new conversation.
  - `activateChatSessionInternal` (the restore path for a browser tab whose conversation is reloaded from `chatSessionService`) also claims the lock. The plan named only the first two sites. This restore path is a third place where a conversation enters a session, so it would otherwise be a second writer. It is a deliberate addition.
- Release sites:
  - `closeConversation` releases the lock of the conversation it closes, after `resetView()`.
  - `removeChatTabSession` releases the lock of the removed session's conversation.
  - `openConversation` releases the previous conversation's lock on a switch.
- Write guards:
  - `canSendChat()` returns false while `readOnly`.
  - `sendChatMessage`, `retryChatMessage`, `regenerateChatMessage`, `editChatMessage` and `continueChatMessage` return `null` early while `readOnly`.
  - `switchBranch` returns early while `readOnly`.

### 3. Read-only UI

#### [ChatComposer.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatComposer.svelte)
- A banner (`data-testid="read-only-banner"`, `role="status"`) above the context bar shows `chat.read_only_elsewhere` while `chatState.readOnly`.
- Both the rich-text input and the plain-textarea fallback are disabled while `chatState.readOnly`, alongside the existing `queuedSend` lock. The send button already follows `canSendChat()`.

#### [ChatMessage.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatMessage.svelte)
- New `readOnly = false` prop. The "Edit message" button and the "Regenerate" / "Continue" buttons are hidden while it is true.
- The component does not import `chatState` directly. The existing test `tests/chat/ChatMessageActions.test.svelte.js` mocks `chatStore.svelte.js` with only four spies, so a direct `chatState` read broke five of its tests. Passing the flag as a prop keeps that user-owned test file untouched.

#### [ChatMessageList.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatMessageList.svelte)
- Passes `readOnly={chatState.readOnly}` to each `ChatMessage`.

### 4. i18n

The plan says `src/lib/i18n/`, but the locale JSON files live in `src/lib/locales/` (`src/lib/i18n/i18n.js` only registers them). The key was added in that directory.

#### [en.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/en.json), [vi.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/vi.json), [es.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/es.json), [zh-CN.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/zh-CN.json), [de.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/de.json), [fr.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/fr.json), [ja.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/ja.json), [ko.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/ko.json)
- Added `chat.read_only_elsewhere` as the first key of the top-level `chat` object. Each file was inserted as a single line and re-parsed as valid JSON. The English text is "This conversation is open in another window. It is read-only here." Other locales are translated. These translations were written by the agent and have not been reviewed by a native speaker.

### 5. Tests

#### [conversationLockService.test.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/conversationLockService.test.js) (new)
- A fake `navigator.locks` (`ifAvailable`, queued blocking requests, `AbortController` signal) drives the tests.
- Covers: the second acquirer gets `held: false`; different conversations do not block each other; the lock can be re-acquired after release; `waitFor` fires only after the holder releases; cancelling a queued wait means `onAcquired` never runs; without `navigator.locks`, acquire always holds and `waitFor` runs right away.

#### [chatStoreConversationLock.test.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/chatStoreConversationLock.test.js) (new)
- Uses the same mocks as `chatStoreDetachedOpen.test.js`, plus the fake lock manager with another page holding `chat-conv:conv-locked`.
- Covers: opening a held conversation sets `readOnly` and `sendChatMessage` returns `null` without calling `chatService.send`; `retryChatMessage` is blocked; when the other page releases, the view becomes writable, the path is reloaded, and a send goes through; a free conversation is writable; closing a read-only view cancels its queued wait, so a later release grants nothing to this page.

## Verification Results

### 1. Unit tests (layering guard excluded, as the plan prescribes for Phases 1-3)
- Ran `npx vitest run tests/chat/conversationLockService.test.js tests/chat/chatStoreConversationLock.test.js` → 2 files, 12 tests passed.
- Ran `npx vitest run tests/chat` → 44 files, 424 tests passed, 0 failed.
- Ran `npx vitest run --exclude 'tests/architecture/**'` → 70 files, 737 tests passed, 0 failed.
- Note on the intermediate state: the first full run had 5 failures in `tests/chat/ChatMessageActions.test.svelte.js`, caused by the direct `chatState` read in `ChatMessage`. They were fixed by the `readOnly` prop change described above, not by editing the test.

### 2. Architecture guard (expected partial failure)
- Ran `npx vitest run tests/architecture` → 1 failed, 7 passed. The failing test is `Rule 6: every file in src/components/ is reachable from 2+ entrypoint surfaces`. This is the expected failure the plan names for Phases 1-3, and it is fixed in Phase 4. The other seven rules pass, including the layering rule for `services/chat/conversationLockService.js`.

### 3. Type checks (svelte-check)
- Ran `npm run check` → `1682 FILES 0 ERRORS 16 WARNINGS 8 FILES_WITH_PROBLEMS`. The baseline was 0 errors and 16 warnings, so there are no new errors or warnings.

### 4. Production build
- Ran `npm run build` → `✔ Finished in 15.1 s`, exit code `0`. The icon bundle (`src/lib/icons/iconBundle.js`) was not changed, because the new UI uses no new Iconify icon.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `conversationLockService` acquire, waitFor, cancel and no-API fallback (12 new tests across both files, passing)
- [x] A conversation held by another page opens read-only, and send, retry and the other write paths are no-ops
- [x] A queued lock is granted, the path reloads and the view becomes writable
- [x] `npx vitest run tests/chat` is green (44 files, 424 tests)
- [x] Full unit suite green with the layering guard excluded (70 files, 737 tests)
- [x] `npm run check`: 0 errors, 16 warnings (same as baseline)
- [x] `npm run build` succeeds (exit 0)

### Still-Required Manual Verification (To Be Done by User)
- [ ] Two-page lock in a real browser. This needs `npm run dev`, then load `.output/chrome-mv3`, because it depends on real extension pages sharing `navigator.locks`.
  1. Open the side panel on a conversation. Then open the Archive page and select the same conversation. The Archive view shows the read-only banner, and its input and edit/regenerate buttons are disabled or hidden.
  2. Close the Archive tab. The side panel is still writable, and it shows any messages added in the meantime after the grant reload.
  3. Reverse the order: open the Archive first, then the side panel on the same conversation. The side panel is read-only.
- [ ] Banner text and layout in the other locales (ko, ja, zh-CN and others). These strings are agent-translated.
- [ ] Firefox (`npm run dev:firefox`): confirm `navigator.locks` behaves the same as in Chrome. Web Locks need Firefox 96+.

## Known Follow-ups
- `navigator.locks` is per origin, so the lock covers extension pages only. It does not cover two separate browser profiles, which is the same scope the plan set.
- Read-only views do not refresh live while the other page writes. They refresh only when the lock is granted, as the plan's Out of scope section says.
- Lock bookkeeping lives in a module-level Map and is not persisted. A page reload releases everything, which is the same as the browser releasing the lock on page close.
