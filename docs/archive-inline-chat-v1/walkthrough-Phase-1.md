# Walkthrough - Phase 1: Move the shared chat UI to `src/components/chat/`

Phase 1 of the Archive Inline Chat (detached) plan (`docs/archive-inline-chat-v1.md`) relocated the `ChatShell` component tree and `Tooltip.svelte` into shared component folders, with no behaviour change.

## Changes Made

### 1. Chat UI moved to the shared folder (`src/components/chat/`)

Moved 24 files from `src/entrypoints/sidepanel/components/chat/` to `src/components/chat/` (plain filesystem moves; HEAD and the git index were not touched). Only the import specifiers inside them changed; no component logic, markup or styles were edited.

- Shell and messages: `ChatShell`, `ChatMessageList`, `ChatMessage`, `ChatMessageEditor`, `ChatThinkingIndicator`, `ChatDeepDive`, `ChatEmptyState`, `ChatContextWarning`
- Composer: `ChatComposer`, `ChatComposerInput`, `ChatRichTextInput`, `ChatContextBar`, `ChatContextGauge`, `ChatModelSelect`, `ChatSkillChip`, `SkillPicker`, `TabMentionMenu`, `ChatSourceIcon`, `ChatFavicon`
- User messages: `ChatUserBubble`, `ChatUserMarkdown`, `ChatUserHeading`, `ChatUserHr`, `ChatUserLink`

#### [ChatShell.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatShell.svelte)
- Relocated from `sidepanel/components/chat/`. Its imports now use `@/components/chat/...` paths, and the `ErrorDisplay` import was already `@/components/ui/...`.

#### [ChatMessage.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatMessage.svelte)
- Relocated. Imports of `Tooltip`, `ChatUserBubble`, `ChatMessageEditor`, `ChatDeepDive` and `ChatThinkingIndicator` now point at the new locations.

#### [ChatComposer.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatComposer.svelte)
- Relocated. Its nine composer sub-component imports now point at `@/components/chat/...`.

#### [TabMentionMenu.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/TabMentionMenu.svelte) and [ChatSourceIcon.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatSourceIcon.svelte)
- Relocated. Their intra-chat imports were rewritten to `@/components/chat/...`.

The remaining moved files (`ChatMessageList`, `ChatDeepDive`, `ChatUserBubble`, `ChatUserMarkdown`, and the other composer and message leaves) were relocated with only their internal `@/entrypoints/sidepanel/components/chat/` import paths rewritten.

### 2. Tooltip moved to the shared UI folder

#### [Tooltip.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/ui/Tooltip.svelte)
- Moved from `src/entrypoints/sidepanel/components/Tooltip.svelte`. The component is unchanged.

Consumers now import it from `@/components/ui/Tooltip.svelte`:
- [App.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/sidepanel/App.svelte)
- [SettingButton.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/sidepanel/components/SettingButton.svelte)
- [ActionButtons.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/sidepanel/components/ActionButtons.svelte)
- [ActionButtonsMini.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/sidepanel/components/ActionButtonsMini.svelte)
- [ChatMessage.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatMessage.svelte) and [ChatDeepDive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/chat/ChatDeepDive.svelte)

### 3. Kept in the sidepanel (tab-bound, not in the ChatShell tree)

These five files were left in `src/entrypoints/sidepanel/components/chat/`, as the plan specifies:
- `ChatHeader.svelte`, `ConversationMenu.svelte`, `ChatTabTitleBar.svelte`, `ChatSourceDrawer.svelte`, `ChatMessageMeta.svelte`

Their importers in the sidepanel (`App.svelte`, `ChatTabTitleBar`, `ChatHeader`) were not changed.

### 4. Test imports updated

Path-only edits (no test logic changed) in the tests that import moved components:
- [ChatShellScroll.test.svelte.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/ChatShellScroll.test.svelte.js) (including its four `vi.mock` paths)
- [ChatContextGauge.test.svelte.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/ChatContextGauge.test.svelte.js), [ChatMessageActions.test.svelte.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/ChatMessageActions.test.svelte.js), [ChatEmptyState.test.svelte.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/ChatEmptyState.test.svelte.js), [ChatUserBubble.test.svelte.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/chat/ChatUserBubble.test.svelte.js)
- Under `tests/chat/composer/`: `ChatContextBar`, `ChatMessageEditor`, `ChatModelSelect`, `ChatRichTextInput`, `ChatUserMarkdown`, `SkillPicker`, `TabMentionMenu` tests

A total of 26 files under `src/` and `tests/` had import paths rewritten (14 under `src/`, 12 under `tests/`), and `ChatMessageMeta` was not moved.

## Verification Results

### 1. Unit Tests (layering guard excluded, as the plan prescribes for Phases 1-3)
- Ran `npx vitest run --exclude 'tests/architecture/**'` → 67 test files passed, 721 tests passed, 0 failed.

### 2. Type Checks (svelte-check)
- Ran `npm run check` → `1678 FILES 0 ERRORS 16 WARNINGS 8 FILES_WITH_PROBLEMS`. The baseline before this phase was 0 errors and 16 warnings, so there are no new errors and no new warnings. All 16 warnings are in pre-existing settings and sidepanel files that this phase did not touch.

### 3. Production Build
- Ran `npm run build` → `✔ Finished in 15.0 s`, exit code 0 (confirmed by a second run that printed `0`).

### 4. Layering Guard (expected to fail until Phase 4)
- Ran `npx vitest run tests/architecture/layering.test.js` → 6 passed, 1 failed. The failure is Rule 6 only.
- Rule 6 flags every moved component as "reachable from 1 surface (sidepanel)". The 24 moved `components/chat/*` files and `components/ui/Tooltip.svelte` are the expected failures. The plan says Rule 6 fails until Phase 4 adds the archive as a second consumer.
- Rules 1-5 and the basename-uniqueness check all pass.

### 5. Plan grep check
- Ran `git grep -nE 'sidepanel/components/chat/Chat(Shell|Message\b|Composer)' -- src tests` → no matches.
- The same pattern across the whole repo matches only four historical docs: `docs/chat-detached-sessions-v1.md`, `docs/chat-detached-sessions-v1/walkthrough-Phase-5.md`, `docs/refactor/walkthroughs-02b/walkthrough-Phase-5.md`, `docs/refactor/walkthroughs-02b/walkthrough-Phase-8.md`. These are prior plans and walkthroughs, which the procedure forbids editing, so they were left unchanged.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] Full unit suite green with the layering guard excluded (67 files, 721 tests)
- [x] `npm run check`: 0 errors, 16 warnings (same as baseline)
- [x] `npm run build` succeeds (Chrome MV3 target)
- [x] Layering guard: only Rule 6 fails, as the plan expects
- [x] No remaining imports of the moved paths from `src/` or `tests/`
- [x] Basenames of the moved `.svelte` files are unique (no collisions)
- [x] Moved files import no sidepanel-only component (no `src/components` → `entrypoints` import)

### Still-Required Manual Verification (To Be Done by User)
- [ ] Load `.output/chrome-mv3` as an unpacked extension (`npm run dev` or `npm run build`), open the side panel, and confirm chat renders identically to before: messages, composer, model picker, `@tab` mention menu, skill picker, and the deep-dive tooltip all work. This is a relocation, so it should look and behave exactly as before.
