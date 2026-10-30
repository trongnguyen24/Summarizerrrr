# Walkthrough - Phase 2: Open a conversation in detached mode (chatStore)

Phase 2 of the Archive Inline Chat (detached) plan (`docs/archive-inline-chat-v1.md`) gave `openConversation` a `detached` option, so a saved conversation opened without a live page never grounds follow-ups on the active browser tab.

## Changes Made

### 1. `openConversation` accepts `{ detached }`

#### [chatStore.svelte.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/stores/chatStore.svelte.js)
- Signature changed from `openConversation(id)` to `openConversation(id, { detached = false } = {})`, with a doc comment describing the detached semantics.
- The `writeSession(activeTabId, {...})` patch now includes `detached`. Opening a conversation without the option writes `detached: false`, so a session that was previously detached is reset when a normal conversation is opened in the same tab.

### 2. Audit of null-tab and detached paths (no code change needed)

The Archive page never calls `syncChatForActiveTab`, so `activeTabId` stays `null` there. The phase's audit items were checked by reading the code:

- `writeSession(null, …)` and `readSession(null)` target `chatState`. `getSession(null)` returns `null`, so `sessionStillOwns(null, null)` is true and `drainQueuedSend` passes.
- `sendChatMessage` skips `startConversationForActiveTab` when a conversation is already set. `sourceRequired` is `!activeSourceDismissed && !owner.detached`, so a detached view gets `sourceRequired: false`, and the `latestOwner?.detached` guard clears `preparedActiveSource`.
- `ensureActiveSourceEstimate` returns early for `owner.detached`.
- `closeConversation()` calls `syncChatForActiveTab` only when `activeTabId != null` and `chatState.detached`, so the Archive page path never touches the browser-tab sync.
- `regenerateChatMessage`, `editChatMessage`, `continueChatMessage` and `switchBranch` do not pass an `activeSource` to `chatService`, so they cannot re-enable the live page for a detached session. They write through `writeSession(activeTabId, …)`, which resolves to `chatState` when `activeTabId` is `null`.
- `setChatModel` writes through `writeSession(activeTabId, …)` with the same null-safe routing.

### 3. New test: detached open does not use a live source

#### [chatStoreDetachedOpen.test.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/chatStoreDetachedOpen.test.js)
- New file, modelled on `chatQueuedSend.test.js` and `chatStoreTabs.test.js`. It mocks `chatService`, `conversationRepository`, `chatSourceService`, `deepDiveStore` and `settingsStore`.
- Four cases:
  - Archive-style open with no active tab, then `sendChatMessage` calls `chatService.send` with `activeSource: null` and `sourceRequired: false`. This is the Phase 2 target case.
  - Regression for the resume bug: a live YouTube tab is active with a `currentUrl`, then `openConversation(id, { detached: true })` and a send. The send has no source.
  - `openConversation(id)` with no option leaves `detached` false.
  - Opening a conversation normally after a detached one resets `detached` to false.

## Verification Results

### 1. Unit Tests (layering guard excluded, as the plan prescribes for Phases 1-3)
- Ran `npx vitest run tests/chat/chatStoreDetachedOpen.test.js` → 1 file, 4 tests passed.
- Ran `npx vitest run --exclude 'tests/architecture/**'` → 68 test files passed, 725 tests passed, 0 failed.
- Ran `npx vitest run tests/chat` → 42 test files passed, 412 tests passed, 0 failed.

### 2. Type Checks (svelte-check)
- Ran `npm run check` → `1679 FILES 0 ERRORS 16 WARNINGS 8 FILES_WITH_PROBLEMS`. The baseline was 0 errors and 16 warnings, so there are no new errors or warnings. The 16 warnings are the same pre-existing settings and sidepanel warnings as before.

### 3. Production Build
- Ran `npm run build` → `✔ Finished in 14.7 s`. A second run exited with code `0`.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `openConversation(id, { detached: true })` writes `detached: true` to the session, and the send path produces `activeSource: null` and `sourceRequired: false`
- [x] `npx vitest run tests/chat` is green (42 files, 412 tests)
- [x] Full unit suite green with the layering guard excluded (68 files, 725 tests)
- [x] `npm run check`: 0 errors, 16 warnings (same as baseline)
- [x] `npm run build` succeeds
- [x] Null-tab audit of `chatStore` paths listed in Changes Made, by code reading

### Still-Required Manual Verification (To Be Done by User)
- [ ] Phase 2 has no UI, so the manual check is deferred to Phase 5. In `npm run dev`, load `.output/chrome-mv3` and confirm that a detached resume with a YouTube tab active sends no transcript source, as the plan's Phase 5 verify describes.
