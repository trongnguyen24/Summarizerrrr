# Walkthrough - Phase 1: Stub sources in sync

Phase 1 of the Lean Chat Cloud Sync V1 plan (`docs/chat-sync-lean.md`) made the chats cloud file carry source metadata only: `mergeChatData` now maps every source it pushes or returns for application through a new `toStubSource`, so `rawContent` and `condensedContent` never reach the Drive file. The local DB behaviour is unchanged, with a comment added to `applyConversationSyncChanges` recording that existing source ids are never downgraded.

## Changes Made

### 1. Shared Merge Module (stub conversion)

#### [conversationSyncMerge.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/db/conversationSyncMerge.js)
- Added exported `toStubSource(source)` returning `id`, `sourceKey`, `normalizedUrl`, `url`, `title`, `sourceType`, `contentHash`, `originalLength`, `capturedAt`, `contentOmitted: true`, plus `commentLimit`, `replyLimit`, `fetchedCount` only when defined. `rawContent`, `condensedContent` and `tabIdHint` are dropped.
- Added exported `isStubSource(source)`, true when `contentOmitted === true` and neither `rawContent` nor `condensedContent` is set.
- In `mergeChatData`, each source kept in the returned `sources` map is now `toStubSource(source)`. `sourcesToApply` is derived from that map, so it contains stubs too. `hasChanges` still compares ids and counts only, so its result is unaffected.

### 2. Repository (comment only)

#### [conversationRepository.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/db/conversationRepository.js)
- Added a comment above the source loop in `applyConversationSyncChanges` stating that cloud sources are stubs and that an existing id is skipped, so a local full source is never downgraded. No logic change.

### 3. Tests

#### [conversationSyncMerge.test.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/api/conversationSyncMerge.test.js)
- Imports `isStubSource` and `toStubSource`.
- New `describe('source stubs')` block with 5 tests:
  - `toStubSource` keeps metadata and provenance and drops `rawContent`, `condensedContent`, `tabIdHint`.
  - `isStubSource` is false for a full source, or for a stub that still has content.
  - Pushed sources have no `rawContent` and have `contentOmitted: true`. Checked with `JSON.stringify` to confirm no content string leaks.
  - `sourcesToApply` entries are stubs.
  - A local full source referenced by a conversation is pushed as a stub, and it is not added to `sourcesToApply`.

## Verification Results

### 1. Baseline before edits
- Ran `npm test` on the untouched tree → 74 files, 767 tests passed.

### 2. Targeted test file
- Ran `npx vitest run tests/api/conversationSyncMerge.test.js` → 15 of 15 passed (10 existing, 5 new).

### 3. Full suite, type check, build
- Ran `npm test` → 74 files passed, 772 tests passed (includes `tests/architecture/layering.test.js`).
- Ran `npx svelte-check --threshold error` → `COMPLETED 1686 FILES 0 ERRORS 17 WARNINGS 9 FILES_WITH_PROBLEMS`. The 17 warnings are pre-existing and below the error threshold; none are in the touched files.
- Ran `npm run build` → `✔ Finished in 17.4 s`, output written to `.output/` (git-ignored).

```sh
npx vitest run tests/api/conversationSyncMerge.test.js
```
Output:
```
 Test Files  1 passed (1)
      Tests  15 passed (15)
```

```sh
npm test
npx svelte-check --threshold error
npm run build
```
Output:
```
 Test Files  74 passed (74)
      Tests  772 passed (772)
1793246805649 START "/Users/nguyenle/Documents/GitHub/Summarizerrrr"
1793246805658 COMPLETED 1686 FILES 0 ERRORS 17 WARNINGS 9 FILES_WITH_PROBLEMS
✔ Finished in 17.4 s
```

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` green: 74 files, 772 tests
- [x] `npx vitest run tests/api/conversationSyncMerge.test.js`: 15 passed
- [x] `npx svelte-check --threshold error`: 0 errors
- [x] `npm run build`: succeeds
- [x] Layering guard (`tests/architecture/layering.test.js`) passes as part of `npm test`; no new imports were added across layers

### Still-Required Manual Verification (To Be Done by User)
- None for Phase 1. The chats file contents on Drive are only checked end to end in Phase 5.

## Known Follow-ups
- `hasChatChanges` compares only ids and counts, so a cloud file still holding full sources from before this phase will not be rewritten just because they are now stubbed in memory. This is the expected behaviour for Phase 1; Phase 3 changes the sync flow and should be checked for it.
