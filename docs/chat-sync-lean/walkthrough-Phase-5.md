# Walkthrough - Phase 5: Copy + manual end-to-end

Phase 5 of the Lean Chat Cloud Sync V1 plan (`docs/chat-sync-lean.md`) updates the Chat data paragraph in the settings Export/Import page so it describes the synced behaviour: conversations sync through Cloud sync, and page content is re-captured when a chat is continued on another device. The two-profile manual pass is listed below as user-run checks because it needs a browser, a logged-in Drive account and two Chrome profiles.

## Changes Made

### 1. Settings copy: Chat data paragraph

#### [ExportImport.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/settings/components/ExportImport.svelte)
- Replaced the Chat data description (around line 997) from "Conversations are included in local backups and synced by Cloud sync (Chats)." with "Conversations are included in local backups and synced by Cloud sync. Page content is re-captured when you continue a chat on another device."
- The string is hardcoded English in this component, like the surrounding copy, so no i18n key was added.

## Verification Results

### 1. Unit tests
- Ran `npm test` → 78 test files passed, 808 tests passed (includes `tests/architecture/layering.test.js`).

### 2. Type checks
- Ran `npx svelte-check --threshold error` → `COMPLETED 1691 FILES 0 ERRORS 17 WARNINGS 9 FILES_WITH_PROBLEMS`. 0 errors, which is the gate. The 17 warnings are below the error threshold and were not introduced by this phase's one-line copy change.

### 3. Build
- Ran `npm run build` → `✔ Finished in 17.8 s`, Chrome MV3 output written to `.output/chrome-mv3`. Total size 13.43 MB.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` green (808/808), including the layering guard.
- [x] `npx svelte-check --threshold error` reports 0 errors.
- [x] `npm run build` succeeds.
- [x] Chat data paragraph in `ExportImport.svelte` contains the new copy.

### Still-Required Manual Verification (To Be Done by User)
These are the plan's Phase 5 manual checks. They need `npm run dev`, two Chrome profiles signed in to the same Google Drive account, and Chats sync turned on in both.

- [ ] **Check 1: Sync and read on a second profile.**
  1. On profile A, open a normal article and chat about it. Wait for the reply.
  2. Trigger a sync on A (Settings → Cloud sync → Sync now).
  3. On profile B, sync. Confirm the conversation appears and its full message history reads correctly.

- [ ] **Check 2: Follow-up with the article not open on B.**
  1. On profile B, close every tab showing that article.
  2. Open the conversation and send a follow-up question.
  3. Confirm a background tab for the article opens, then closes, and the answer uses the article's content (not an empty source).
  4. Confirm no "Could not re-capture page content" warning appears.

- [ ] **Check 3: YouTube video.**
  1. Repeat step 1–2 of Check 2 with a chat about a YouTube video.
  2. If the transcript capture fails in the background tab, record the warning text here. The plan's fallback (open the tab with `active: true` for YouTube only and refocus the previous tab, or accept the warning) is a decision for the user; it is not implemented in this phase.

- [ ] **Check 4: Skip unchanged sync.**
  1. With no changes on either profile, click Sync now (or wait for auto-sync).
  2. In the debug log, confirm `Chats in sync (skipped).` appears.
  3. In the browser Network tab, confirm there is no download of `summarizerrrr-chats.jsonl.gz`.

- [ ] **Check 5: Drive file format and size.**
  1. Open Google Drive and locate `summarizerrrr-chats.jsonl.gz`.
  2. Confirm the file name ends in `.jsonl.gz`.
  3. Confirm its size is much smaller than the previous uncompressed `summarizerrrr-chats.jsonl` for the same data (record both sizes).
  4. Optionally, download it and confirm that decompressing it yields JSONL lines with no `rawContent` field on `chatSource` lines.

## Known Follow-ups
- The YouTube background-tab fallback (Check 3) is not implemented. It is only needed if Check 3 shows the transcript failing in a background tab.
