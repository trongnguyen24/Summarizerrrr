# Walkthrough - Phase 2: On-demand hydration

Phase 2 of the Lean Chat Cloud Sync V1 plan (`docs/chat-sync-lean.md`) lets a stub source (metadata synced, content omitted) be re-captured when the user sends in a conversation that references it. Hydration runs before the streaming bubble is created, keeps the source id, writes only while the record is still a stub, and failures become warnings without blocking the send.

## Changes Made

### 1. Shared content hash

#### [contentHash.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/utils/contentHash.js)
- New file. Exports `stableContentHash(content)`, the FNV-1a hash moved unchanged from `chatSourceService.js`, so the repository and the service share one implementation.

### 2. Repository

#### [conversationRepository.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/db/conversationRepository.js)
- Imports `isStubSource` from `conversationSyncMerge.js` and `stableContentHash` from `../utils/contentHash.js`.
- Added exported `hydrateSourceContent(id, rawContent)` in a single `readwrite` `runTransaction`. It reads the record and writes only if `isStubSource(existing)`. The write sets `rawContent`, `originalLength`, a new `contentHash`, `hydratedAt` and `contentOmitted: false`. `id` and `sourceKey` are kept. It returns the hydrated record, or `null` when nothing was written (missing, already has content, or empty input).
- Added `hydrateSourceContent` to the `conversationRepository` object export.
- The Phase 1 comment block in `applyConversationSyncChanges` is untouched.

### 3. Chat source service

#### [chatSourceService.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/services/chat/chatSourceService.js)
- Removed the local `stableContentHash`; imports it from `@/lib/utils/contentHash.js`.
- Added `hydrateSource(source, { timeoutMs = 15000 })` to the factory's return object. It never throws and returns `{ source } | { error: string }`.
  - `youtubeComments` returns `{ error: 'comments are not re-captured' }` without touching tabs.
  - An open tab whose normalized URL equals `source.normalizedUrl` is used and is never closed by this call.
  - Otherwise `tabs.create({ url, active: false })` opens a background tab, and the call waits for `status === 'complete'` through `tabs.onUpdated`, after one `tabs.get` check.
  - One `settled` flag and one idempotent `cleanup()` (clears the timer, removes the `onUpdated` listener, closes the created tab) are shared by success, failure and timeout.
  - A tab whose `tabs.create` resolves after the timeout is closed immediately, and nothing is captured from it.
  - `settled` is re-checked before `repository.hydrateSourceContent`, so a timed-out call never persists.

### 4. Resolver

#### [sourceResolver.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/chat/contextPipeline/sourceResolver.js)
- Imports `isStubSource` from `../../db/conversationSyncMerge.js` (lib to lib).
- In `resolveRef`, a stub source is treated as missing before the active-capture fallback. It is then reported as `source_unresolved` and omitted from the prompt.

### 5. Chat service

#### [chatService.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/services/chat/chatService.js)
- Imports `isStubSource` from `@/lib/db/conversationSyncMerge.js`.
- Added `hydrateStubSources(sourceIds, { onStatus })` inside `createChatService`. It deduplicates the ids, loads them with `repository.getSourcesByIds`, keeps only stubs, and calls `onStatus({ type: 'hydrating', titles })`. It runs `sourceService.hydrateSource` for each stub with `Promise.all`, then calls `onStatus(null)` in a `finally`. It returns the failure strings `Could not re-capture page content: <title> — <reason>`. It never emits warnings itself, and it catches repository errors (logged with `console.warn`) so they cannot block a send.
- `runGeneration` runs hydration before the `try` block, so before `createStreamingAssistantMessage`. Ids are `sourceIdsFrom(history)` plus `currentUserMessage.attachmentRefs`. Hydration warnings are emitted once right away when present.
- The continue path (`continueResponse`) runs hydration before its `buildPipeline(` call, with `sourceIdsFrom(historyWithPartial)` plus the original turn's `attachmentRefs`.
- In both paths the pipeline-warnings call and the reasoning-warnings merge emit through `withHydrationWarnings(...)`, which prepends the hydration failures. A later emission therefore does not wipe them out. With no hydration failures the emitted value is unchanged.
- `onStatus` is accepted by `send`, `retry`, `regenerate`, `edit` and `continueResponse` and passed to `runGeneration`.

### 6. Store and UI

#### [chatStore.svelte.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/stores/chatStore.svelte.js)
- Added `hydratingSources: null` to `createChatSessionState()`, so it is per tab like the other session fields.
- Each of the five chat calls (send, retry, regenerate, edit, continue) passes `onStatus: (status) => write({ hydratingSources: status?.type === 'hydrating' ? status.titles : null })`.

#### [ChatMessageList.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatMessageList.svelte)
- Imports `_` from `svelte-i18n`. After the message list it renders a muted `role="status"` line with `chat.hydratingSources` while `chatState.hydratingSources` is set. It is in `src/components` because both the side panel and the archive render this list.

#### Locales (8 files)
- [en.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/en.json), [de.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/de.json), [es.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/es.json), [fr.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/fr.json), [ja.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/ja.json), [ko.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/ko.json), [vi.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/vi.json), [zh-CN.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/zh-CN.json)
- Added `chat.hydratingSources` (one line inserted under `"chat"`). Each file still parses as JSON.

### 7. Tests

#### [chatSourceHydration.test.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/chatSourceHydration.test.js) (new)
- `hydrateSource`: uses an open tab and does not close it; creates and closes a background tab; closes the tab on capture failure; on timeout (fake timers) returns an error, closes the tab, removes the listener and never persists a late capture; closes a tab whose create resolves after the timeout; skips `youtubeComments`.
- `chatService`: stub sources are hydrated before the pipeline is built, and full sources are not; a failed hydration still generates and its warning survives the later pipeline warnings in the last `onWarnings` call; `retry` on a first turn hydrates the user message attachments; `continueResponse` hydrates the original turn's attachments before `buildPipeline`.
- `sourceResolver`: a stub is excluded and reported as unresolved, a full source is kept.

#### [hydrateSourceContent.test.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/hydrateSourceContent.test.js) (new)
- Against fake-indexeddb: a synced stub (built with `toStubSource` and applied through `applyConversationSyncChanges`) is filled with its `id` and `sourceKey` kept; a source that already has content is not overwritten; a second hydration does not clobber the first.

## Verification Results

### 1. Targeted test files
- Ran `npx vitest run tests/chat/chatSourceHydration.test.js` → 11 of 11 passed.
- Ran `npx vitest run tests/chat/hydrateSourceContent.test.js` → 3 of 3 passed.
- Two of the first-draft tests had test-setup mistakes (a tab in `loading` state so the capture never started, and a stream fake that emitted no content). Both were fixed in the test files, not in the implementation.

### 2. Full suite
- Ran `npm test` → `Test Files 76 passed (76)`, `Tests 786 passed (786)`. This includes `tests/architecture/layering.test.js`. Phase 1 baseline was 74 files and 772 tests; the difference is the two new files, 14 tests.

### 3. Type check
- Ran `npx svelte-check --threshold error` → `COMPLETED 1689 FILES 0 ERRORS 17 WARNINGS 9 FILES_WITH_PROBLEMS`. The 17 warnings are the same pre-existing ones (settings, archive, sidepanel components). None are in a file this phase touched.

### 4. Build
- Ran `npm run build` → `✔ Finished in 17.2 s`.

```sh
npx vitest run tests/chat/chatSourceHydration.test.js
npx vitest run tests/chat/hydrateSourceContent.test.js
npm test
npx svelte-check --threshold error
npm run build
```
Output:
```
 Test Files  1 passed (1)
      Tests  11 passed (11)

 Test Files  1 passed (1)
      Tests  3 passed (3)

 Test Files  76 passed (76)
      Tests  786 passed (786)

COMPLETED 1689 FILES 0 ERRORS 17 WARNINGS 9 FILES_WITH_PROBLEMS
✔ Finished in 17.2 s
```

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` green: 76 files, 786 tests, including the layering guard
- [x] `npx svelte-check --threshold error`: 0 errors
- [x] `npm run build`: succeeds
- [x] `hydrateSource` cancellation: timeout closes the tab, removes the listener and never persists a late capture (fake timers)
- [x] Repository conditional write: a non-stub or already-hydrated record is never overwritten
- [x] Stub sources are hydrated before generation on send, retry and continue, and a failed hydration does not block generation

### Still-Required Manual Verification (To Be Done by User)
- [ ] Real background-tab capture in Chrome (not testable headless here). Covered by Phase 5 check 2:
  1. Run `npm run dev` and load `.output/chrome-mv3` as an unpacked extension.
  2. Sync a conversation from another device (or from a backup) so its sources are stubs.
  3. With the article closed, send a follow-up. A background tab should open briefly, close again, and the answer should use the article text.
- [ ] Re-capturing a YouTube video that is not already open. Record the outcome in Phase 5 check 3.

## Known Follow-ups
- The plan's helper signature `hydrateStubSources(sourceIds, { onWarnings, onStatus })` was implemented as `hydrateStubSources(sourceIds, { onStatus })` returning the failure strings. The plan's own text says the helper must not emit warnings, and `onWarnings` would replace the store list, so the parameter was dropped.
- The timeout error text is `Timed out waiting for the page to load.` instead of the plan's `'timeout'`. The result shape `{ error }` is unchanged.
- The resolver reports a still-stub source as `source_unresolved`, and the hydration failure string is also shown. A user whose re-capture failed may see both messages for the same source. Acceptable for V1; the wording can be merged later.
- `hydrateSourceContent` writes through `runTransaction`, so once Phase 3 adds the revision counter, a hydration also bumps the revision. That is intended: the content changed.
