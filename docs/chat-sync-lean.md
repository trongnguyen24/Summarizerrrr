# Lean Chat Cloud Sync — V1

> **How to use this doc:** Self-contained execution plan, intended to be run in
> a fresh session. Start at Phase 1 and go in order. Each phase ends with a
> verify step — don't move on until it passes.

## Context

Chat conversations recently gained Google Drive cloud sync (currently **uncommitted**
on branch `V3.0-refactor-01`). The current design:

- `src/lib/db/conversationSyncMerge.js` — pure merge logic.
  `buildLocalChatItems(snapshot)` turns `exportConversationBackup()` output into
  sync items `{ id, updatedAt, deleted, conversation, messages }`. The unit of
  sync is a whole conversation (record + all messages, all branches). The
  conversation's timestamp is the newest of its own and its messages' timestamps.
  Conversations with a `streaming` message are held back as `pendingIds`.
  `mergeChatData({ cloudItems, cloudSources, local, tombstoneTtlMs })` uses Last
  Write Wins per conversation, expires 30-day tombstones, keeps sources only when
  a live conversation references them, and returns
  `{ items, sources, upserts, purgeIds, sourcesToApply, hasChanges }`.
- `src/lib/db/conversationRepository.js` — `applyConversationSyncChanges({ upserts, purgeIds, sources })`
  writes merge results. It skips conversations that changed locally after the
  snapshot was taken, or that are streaming. It remaps a duplicate `sourceKey` to
  the local source id. There is also `softDeleteAllConversations()`, which is
  what the "Clear chat data" button calls.
- `src/services/cloudSync/cloudSyncService.svelte.js` — `syncChats(accessToken, cloudFile)`
  runs inside `pullData()` when the `chats` sync preference is on. It uses file
  `FILES.CHATS = 'summarizerrrr-chats.jsonl'`.
- `src/services/cloudSync/googleDriveAdapter.js` — `getFileJsonl` / `saveFileJsonl`
  understand a chats format: lines with `_type: 'conversation'` and
  `_type: 'chatSource'`, returned as `{ meta, conversations, chatSources }`.
- Sync is triggered after every chat turn (`finalizeStreaming` wrapper +
  `onPersisted` dependency in `src/services/chat/chatService.js`) and after
  rename, archive or delete in `src/stores/conversationArchiveStore.svelte.js`.
- Tests: `tests/api/conversationSyncMerge.test.js`. `tests/api/cloudSyncReauth.test.js`
  mocks `@/lib/db/conversationRepository.js`.

**Problem:** the chats file carries every source's `rawContent`, the full page
text or YouTube transcript captured in `src/services/chat/chatSourceService.js`
(`persistSnapshot`). Sources can be hundreds of KB each. Any change rewrites the
whole file, and every sync (auto-sync runs every 10 minutes) downloads the whole
file even when nothing changed.

Key facts the design relies on:
- No UI renders `source.rawContent`. It is used only by the context pipeline
  (`src/lib/chat/contextPipeline/sourceResolver.js` `resolveRef`,
  `contextBudgeter.js` `selectedSourceContent`) and for token estimates in
  `src/stores/chatStore.svelte.js`. Dropping it from synced data loses nothing
  when *reading* a conversation.
- `chatSourceService.capturePageContent(tab, sourceKind)` captures **any tab by
  id** (via `getPageContent({ tabId, url, contentType })` in
  `src/services/contentService.js`) and already runs the Firefox site-permission
  check.
- When the user continues a chat, `chatService.runGeneration` (and the continue
  path around `buildPipeline(` near line ~637) pass
  `conversationSourceRefs: sourceIdsFrom(history)` to the pipeline. These are
  the sources that need content.

### Goal & scope decision (confirmed with user)
- **Always sync sources as stubs** (metadata only, no `rawContent` /
  `condensedContent`). Rejected: syncing full content for archived chats only,
  because it is too much state-transition complexity for little value.
- **Hydrate on demand:** when the user *sends* in a conversation whose
  history references stub sources, re-capture the content. Use an already-open
  tab with that URL if there is one; otherwise open a **background tab**
  (`active: false`), capture, then close it. Write the content into the stub
  record **keeping its id**. On failure, still send and show a warning.
  Never hydrate just because a conversation was opened.
- **Skip unchanged syncs:** download nothing when neither the cloud file nor
  local chat data changed since the last chat sync.
- **Gzip** the chats file only. History and library files stay as they are.
- Chat sync is unreleased, so **no migration** is needed: just rename the file.
- No new dependencies.

## Phase 1 — Stub sources in sync

`src/lib/db/conversationSyncMerge.js`:
- Add exported `toStubSource(source)`, returning
  `{ id, sourceKey, normalizedUrl, url, title, sourceType, contentHash, originalLength, capturedAt, contentOmitted: true }`
  plus small provenance fields if present (`commentLimit`, `replyLimit`,
  `fetchedCount`).
- Add exported `isStubSource(source)` →
  `source?.contentOmitted === true && !source.rawContent && !source.condensedContent`.
- In `mergeChatData`, every source placed in the returned `sources` map (the
  pushed set) goes through `toStubSource`. `sourcesToApply` may therefore be
  stubs. That is intended.

`src/lib/db/conversationRepository.js` `applyConversationSyncChanges`: no logic
change is needed. An existing id is still skipped, so a local full source is
never downgraded. Add a comment saying so.

Tests in `tests/api/conversationSyncMerge.test.js`:
- Pushed sources contain no `rawContent` and have `contentOmitted: true`.
- `sourcesToApply` entries are stubs.

**Verify:** `npx vitest run tests/api/conversationSyncMerge.test.js` passes.

## Phase 2 — On-demand hydration

1. **Repository.** Add `hydrateSourceContent(id, rawContent)` to
   `conversationRepository.js` (and to the `conversationRepository` object
   export). It sets `rawContent`, `originalLength`, a new `contentHash`,
   `hydratedAt` and `contentOmitted: false`, and **keeps `id` and `sourceKey`**.
   The `sourceKey` index is unique, so it must not change. Reuse the FNV hash by
   moving `stableContentHash` from `chatSourceService.js` into a small lib util,
   or pass the hash in from the service.

2. **Service.** Add `hydrateSource(source, { timeoutMs = 15000 } = {})` to
   `createChatSourceService` in `src/services/chat/chatSourceService.js`. Use the
   injected `browserApi`. It never throws; it returns
   `{ source } | { error: string }`.
   - `source.sourceType === SOURCE_KINDS.youtubeComments` → return an error
     ("comments are not re-captured").
   - Look for an open tab: `browserApi.tabs.query({})`, matching
     `normalizeUrl(tab.url) === source.normalizedUrl`.
   - If none: `browserApi.tabs.create({ url: source.url, active: false })`, then
     wait for `status === 'complete'` via `tabs.onUpdated` (also check `tabs.get`
     once in case it already loaded).
   - `capturePageContent(tab, source.sourceType)`, then
     `repository.hydrateSourceContent(source.id, content)`.
   - **Timeout must actually cancel, not just race.** A bare `Promise.race`
     leaves the capture running: it can still write to the DB after the caller
     was told it failed, and a `finally` inside the hung task never runs. Use one
     `settled` flag plus a single `cleanup()`:
     - `cleanup()` is idempotent. It clears the timer, removes the `onUpdated`
       listener, and closes the background tab if this call created it and its
       id is known. It is used by success, failure and timeout alike.
     - When the timer fires: set `settled = true`, call `cleanup()`, resolve
       `{ error: 'timeout' }`.
     - If `tabs.create` resolves **after** the timeout, close that tab
       immediately.
     - Re-check `settled` before `hydrateSourceContent`. Once timed out, never
       persist.
     - Never close a tab that was already open (found via `tabs.query`).
   - Make `hydrateSourceContent` conditional in its own transaction: write only
     if the record is still a stub. This prevents a late or duplicate hydration
     from clobbering anything.

3. **Resolver.** In `src/lib/chat/contextPipeline/sourceResolver.js` `resolveRef`,
   if the stored source is still a stub (no `rawContent`/`condensedContent`,
   `contentOmitted`), treat it as missing (return null) so empty sources never
   reach the prompt. Do not import from `services/`; lib can only import lib (see
   CLAUDE.md layering), so `isStubSource` lives in lib (Phase 1), which is fine.

4. **Chat service.** In `src/services/chat/chatService.js`, add a helper
   `hydrateStubSources(sourceIds, { onWarnings, onStatus })`:
   - `repository.getSourcesByIds(ids)` → filter with `isStubSource` → run
     `sourceService.hydrateSource` in parallel (`Promise.all`).
   - Before starting, call `onStatus?.({ type: 'hydrating', titles })`. After
     finishing, call `onStatus?.(null)`.
   - The helper **returns** failure strings
     (`Could not re-capture page content: <title> — <reason>`). It must not emit
     them on its own: `onWarnings` *replaces* the list in the store
     (`chatStore.svelte.js`, `onWarnings: (warnings) => write({ contextWarnings: warnings })`),
     and `runGeneration` later calls `onWarnings?.(pipeline.warnings)`, which
     would wipe them out. Instead, keep `hydrationWarnings` in the generation
     scope and, everywhere that function emits warnings (the pipeline-warnings
     call and the reasoning-warnings merge), emit
     `[...hydrationWarnings, ...thoseWarnings]`. If hydration produced warnings,
     also emit them once right away so the user sees them during the wait.
   - **Ids to hydrate:** the deduped union of `sourceIdsFrom(history)` **and**
     `currentUserMessage.attachmentRefs`. Retry/regenerate pass the user message
     separately (`retry` → `getGenerationContextForUser`), and continue passes the
     original turn's attachments as `newAttachmentRefs`. On a conversation's
     first turn `history` can be empty, so history alone misses its sources.
     Freshly captured attachments of a new send are not stubs, and the
     `isStubSource` filter drops them at no cost.
   - Call it in `runGeneration` **before**
     `repository.createStreamingAssistantMessage`, so the streaming bubble does
     not sit empty while tabs load. Also call it in the continue path, with
     history plus that turn's attachment refs, before its `buildPipeline(` call.
   - Thread a new optional `onStatus` callback the same way `onWarnings` is
     threaded through the public methods.

5. **UI.** In `src/stores/chatStore.svelte.js`, pass `onStatus` and store it in a
   reactive field (e.g. `chatState.hydratingSources = titles | null`). Find the
   component that shows the pending/streaming state for the assistant reply
   (start from `src/components/chat/` — e.g. the message list / streaming
   placeholder) and render a muted line like "Re-capturing page content…" while
   it is set. Add i18n key `chat.hydratingSources` to all 8 locales in
   `src/lib/locales/*.json`.

6. **Tests**, with fake `browserApi` and repository:
   - `hydrateSource`:
     - uses an existing tab, doesn't create one, and doesn't close it;
     - creates and closes a background tab;
     - closes the tab on capture failure;
     - on timeout (fake timers): returns `{ error }`, closes the tab, removes the
       `onUpdated` listener, and **does not** call `hydrateSourceContent` even if
       the capture resolves later;
     - closes a tab whose `tabs.create` resolves after the timeout;
     - skips `youtubeComments`.
   - `chatService`:
     - stub sources trigger hydration before generation;
     - a failed hydration still lets generation run, and its warning is
       **still present in the last `onWarnings` call** after the pipeline emits
       its own warnings;
     - `retry` on a first turn (empty history) hydrates the user message's
       attachment refs;
     - `continue` hydrates the original turn's attachments.
   - `sourceResolver`: stub source excluded.
   - Look at existing tests under `tests/chat/` for the factories and mocks to
     reuse.

**Verify:** `npm test` passes; `npx svelte-check --threshold error` reports 0 errors.

## Phase 3 — Skip unchanged syncs

1. `googleDriveAdapter.js`: `findFile` already requests
   `fields=files(id,modifiedTime)`. Extract `findFileMeta(accessToken, filename)`
   → `{ id, modifiedTime } | null` and make `findFile` use it. Export it.
   `saveFileJsonl` (both PATCH and multipart POST) appends
   `&fields=id,modifiedTime` to the URL and returns `{ id, modifiedTime }` from
   the response.
2. **Local revision counter, not a timestamp fingerprint.** A
   `count:count:maxTimestamp` fingerprint misses edits: if a conversation synced
   from another device carries a timestamp ahead of the local clock, renaming a
   different conversation (`updateConversationMetadata` stamps local
   `new Date()`) changes neither the counts nor the max. So:
   - `src/lib/db/indexedDBService.js`: bump `DB_VERSION` 11 → 12 and create a
     `chat_meta` object store (`keyPath: 'key'`) in `onupgradeneeded`, guarded
     by `!db.objectStoreNames.contains(...)` like the other stores. Export
     `CHAT_META_STORE_NAME`.
   - `conversationRepository.js` `runTransaction`: when `mode === 'readwrite'`,
     add `chat_meta` to the transaction's store list. After the callback
     succeeds, increment `{ key: 'revision', value }` **inside the same
     transaction**. Every chat write goes through `runTransaction`, so it is
     covered atomically. Read-only transactions are untouched.
   - Add `getChatRevision()`. `exportConversationBackup()` should return
     `revision` too, read in the same readonly transaction (include `chat_meta`
     in that transaction), so the snapshot and its revision are consistent.
   - Writes that bypass the repository (`dataIntegrityService.js` clear-all,
     which clears the chat stores directly) must clear `chatSyncMarker` (see
     below) so the next sync does a full reconcile.
3. **Make `applyConversationSyncChanges` report `skipped`** (conversations it
   left alone because they changed locally or are streaming), next to
   `applied` and `purged`.
4. `cloudSyncService.svelte.js`:
   - Add `chatSyncMarker: null` to the `syncStorage` default value. Shape:
     `{ cloudModifiedTime, localRevision }`.
   - In `pullData`, take chats out of the `Promise.all` file download. Fetch
     `findFileMeta(accessToken, FILES.CHATS)` instead, and include it in
     `hasCloudData`.
   - `syncChats(accessToken, cloudMeta)` returns the marker to persist, or
     `null` meaning "still dirty":
     - **Skip:** if `cloudMeta?.modifiedTime === marker.cloudModifiedTime` and
       `getChatRevision() === marker.localRevision`, log
       `Chats in sync (skipped).` and return the existing marker.
     - **Otherwise:** take the snapshot with its revision `R0`, download,
       merge, apply, and push if `hasChanges`. Then read `Rend = getChatRevision()`.
     - Commit a new marker **only if** `skipped === 0` **and**
       `Rend === R0 + (applied + purged > 0 ? 1 : 0)`. The apply is a single
       transaction, so it bumps the revision exactly once. Any other difference
       means the user wrote during the sync, and that write is not in the
       uploaded payload. The new marker is
       `{ cloudModifiedTime: <upload's modifiedTime, or cloudMeta's if not pushed>, localRevision: Rend }`.
     - If the condition fails, return `null`. The next sync then reconciles
       fully. It never marks unsynced work as synced.
   - **Persisting (fixes the overwrite).** `pullData` currently ends with
     `syncStorage.setValue({ ...stored, lastSyncTime })`, where `stored` was
     read at the start of the run, so anything written during the run is lost.
     Change it to re-read storage immediately before writing:
     `const latest = await syncStorage.getValue()`, then
     `setValue({ ...latest, lastSyncTime, chatSyncMarker })`. Collect the marker
     returned by `syncChats` and write it in this same final write. Do the same
     re-read wherever else this file spreads a stale `stored`.
   - `pushAllData` still works: call `syncChats(accessToken, null)` and persist
     its marker the same way.
   - Clear `chatSyncMarker` in `logout`, on login (account switch), in
     `setSyncPreferences` when `chats` is turned off, and from the clear-all
     path in `dataIntegrityService.js`.
5. Tests (extend `tests/api/cloudSyncReauth.test.js` mocks: `findFileMeta`,
   `getChatRevision`, revision in `exportConversationBackup`):
   - **Two consecutive real `pullData()` runs:** the first does a full sync and
     persists a marker; the second skips (no `getFileJsonl` call for chats).
     Don't only test against a hand-built marker.
   - **Write during upload:** make the mocked `saveFileJsonl` bump the mocked
     revision before resolving. The marker must not be committed, and the next
     `pullData()` must do a full chats sync.
   - **Skipped conversation:** `applyConversationSyncChanges` returns
     `skipped: 1` → no marker.
   - Repository (`fake-indexeddb` is already wired in `tests/setup/vitest.js`): every readwrite repository call bumps the revision
     exactly once; a readonly call doesn't. Include the clock-skew case:
     conversation A with a future `updatedAt`, rename B → revision changes.

**Verify:** `npm test` passes.

## Phase 4 — Gzip the chats file

- Rename to `FILES.CHATS = 'summarizerrrr-chats.jsonl.gz'`.
- `googleDriveAdapter.js`:
  - Extract the line-parsing loop of `getFileJsonl` into `parseJsonl(text)`.
  - Add an options argument `{ gzip = false }` to `getFileJsonl` and
    `saveFileJsonl`.
    - Save: `new Response(new Blob([jsonl]).stream().pipeThrough(new CompressionStream('gzip'))).blob()`,
      uploaded with `Content-Type: application/gzip`. The multipart metadata
      uses `mimeType: 'application/gzip'`.
    - Read: `new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text()`,
      then `parseJsonl`.
- `syncChats` passes `{ gzip: true }`.
- Test: gzip round-trip with a fake `fetch` that captures the uploaded body and
  serves it back. If `CompressionStream` is missing in the vitest environment,
  take it from `node:stream/web` in the test setup.

**Verify:** `npm test` passes; `npm run build` succeeds.

## Phase 5 — Copy + manual end-to-end

- `src/entrypoints/settings/components/ExportImport.svelte`, Chat data paragraph:
  "Conversations are included in local backups and synced by Cloud sync. Page
  content is re-captured when you continue a chat on another device."
- Manual test with `npm run dev`, two Chrome profiles, same Drive account,
  Chats sync on:
  1. On profile A, chat on a normal article. Sync. On B, the conversation
     appears and reads fully.
  2. On B, with that article **not** open, send a follow-up. A background tab
     opens and closes, and the answer uses the article content.
  3. Repeat with a YouTube video. If the transcript fails in a background tab,
     record it. Fallback: for YouTube only, open the tab with `active: true` and
     refocus the previous tab afterwards, or accept the warning.
  4. With nothing changed, wait for auto-sync or click Sync now. The debug log
     shows `Chats in sync (skipped).` and the Network tab shows no chats file
     download.
  5. In Drive, the chats file is `.jsonl.gz` and is much smaller than before.

**Verify:** all five manual checks behave as described.

## Out of scope (V1)
- Syncing full source content for any conversation (archived or not).
- Hydrating on conversation open or prefetching.
- Re-capturing YouTube comments, or making Udemy/Coursera re-capture succeed
  (these fall back to a warning).
- Gzip or skip logic for history/library/settings files.
- Per-conversation Drive files.
- Refreshing an open side panel when sync rewrites the conversation shown in it.

## Final verification checklist
- [ ] `npm test` green (includes `tests/architecture/layering.test.js`)
- [ ] `npx svelte-check --threshold error` → 0 errors
- [ ] `npm run build` succeeds
- [ ] Manual two-profile pass (Phase 5) done
- [ ] Chats file on Drive contains no `rawContent`

## Notable files
- `src/lib/db/conversationSyncMerge.js` — stub conversion, `isStubSource`.
- `src/lib/db/conversationRepository.js` — `hydrateSourceContent` (conditional), revision bump in `runTransaction`, `getChatRevision`, `skipped` count.
- `src/lib/db/indexedDBService.js` — `DB_VERSION` 12, `chat_meta` store.
- `src/services/chat/chatSourceService.js` — `hydrateSource` (background-tab capture).
- `src/services/chat/chatService.js` — hydrate before generation; `onStatus`.
- `src/lib/chat/contextPipeline/sourceResolver.js` — drop stub sources.
- `src/services/cloudSync/googleDriveAdapter.js` — `findFileMeta`, `parseJsonl`, gzip.
- `src/services/cloudSync/cloudSyncService.svelte.js` — marker/skip, re-read storage before the final write, `.gz` file.
- `src/services/dataIntegrityService.js` — clear-all also clears `chatSyncMarker`.
- `src/stores/chatStore.svelte.js` + a chat UI component, `src/lib/locales/*.json` — "re-capturing" status.
