# Walkthrough - Phase 4: Archive renders ChatShell

Phase 4 of the Archive Inline Chat (detached) plan (`docs/archive-inline-chat-v1.md`) replaced the Archive page's hand-rolled transcript with the shared `ChatShell`, running the real `chatStore` in detached mode. The conversation is opened on select and closed on change or unmount, which releases its lock, and the archive list refreshes after each send.

## Changes Made

### 1. Conversation detail renders ChatShell

#### [ConversationTranscript.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/displays/ConversationTranscript.svelte)
- The message list, its per-message markup (skill chip, attachment chips, user bubble, `StreamingMarkdownV2` for assistant turns) and the `isRTL` handling were removed. The component now renders `<ChatShell />` inside `<div id="conversation-content" class="not-prose mt-10">`.
- The `id="conversation-content"` is kept on the wrapper, because `TOCArchive` and `TOCSidebar` look up headings by that id. The `not-prose` class stops the page's `prose` typography from reaching the chat markup.
- The header is unchanged: title and rename, date, source link, archived badge, display controls, and the action row (resume, archive, export Markdown and JSON, delete). Resume stays in the row until Phase 5.
- A `$effect` keyed on `conversationId` (a `$derived` of `conversation?.id`) calls `openConversation(id, { detached: true })` inside `untrack`. Its cleanup calls `closeConversation()`, which releases the conversation's lock. Keying on the id stops a same-conversation re-render from reopening it.
- A race guard: if the cleanup ran while `openConversation` was still in flight, the stale view is closed afterwards, but only when `chatState.activeConversationId` still equals that id. This stops a slow open from leaving an old conversation in the store.
- A second `$effect` watches `chatState.isSending`. On a true-to-false edge it calls `loadConversationArchive()`, so list ordering and timestamps update after a send. It only reads `isSending`, so the list refresh does not retrigger the open.
- The `sourcesById` derived was removed, because attachment chips now come from `ChatMessage`. `primarySource` and `sourceHost` remain for the header source link.
- The `messages` prop was removed. `selectedMessages` and `selectedSources` are no longer needed for rendering. `selectedSources` is still used for the header link.

#### [App.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/App.svelte)
- Removed the `messages={conversationArchiveStore.selectedMessages}` prop from the `<ConversationTranscript>` call, following the prop removal above.

### 2. Comment and docs

#### [navigationHandlers.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/background/handlers/navigationHandlers.js)
- Replaced the comment that said an archive page must never import chat state. The archive page now renders chat through `chatStore`, and the comment says the resume path still hands off to the side panel.

#### [CLAUDE.md](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/CLAUDE.md)
- The `src/components/*` counts were updated to the measured state: 7 folders and 59 files (`buttons` 9, `chat` 24, `icons` 5, `inputs` 3, `markdown` 3, `ui` 9, `welcome` 6). The count is of tracked files, so `.DS_Store` is excluded. `ui` is 9 because `Tooltip.svelte` moved in during Phase 1.

### Deliberate choices

- No `data-sticky-header` was added to the archive detail. The archive header is not sticky, so `ChatShell` reads an offset of 0 from its `document.querySelector('[data-sticky-header]')` lookup, which is correct for this page.
- `selectedMessages` is still loaded and exposed by `conversationArchiveStore`, but nothing reads it. Removing it would widen the diff for no behaviour change, so it is left as a follow-up.

## Verification Results

### 1. Full unit suite, including the layering guard
- Ran `npm test` (`vitest run`) → `Test Files 72 passed (72)`, `Tests 745 passed (745)`. This includes `tests/architecture/layering.test.js`, so Rule 6 (every file under `src/components/` reachable from two or more entrypoint roots) now passes. The archive is the second consumer of `ChatShell`.

### 2. Type checks (svelte-check)
- Ran `npm run check` → `1682 FILES 0 ERRORS 16 WARNINGS 8 FILES_WITH_PROBLEMS`. The baseline was 0 errors and 16 warnings, so there are no new errors or warnings.

### 3. Production build
- Ran `npm run build` → `✔ Finished in 14.9 s`, exit code `0`.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` is fully green, 72 files and 745 tests, including the layering guard
- [x] `npm run check` has 0 errors and 16 warnings, the same as baseline
- [x] `npm run build` succeeds (exit 0)

### Still-Required Manual Verification (To Be Done by User)
- [ ] Archive → select a conversation → ask a follow-up (`npm run dev`, load `.output/chrome-mv3`). The answer streams, uses only history sources, persists, and the list re-sorts.
  1. Open the Archive page and select a chat that has messages.
  2. Send a follow-up. Confirm the list row moves up and its timestamp changes once the send finishes.
- [ ] Layout at desktop width: the fixed composer from `ChatShell` is viewport-fixed. Check that it does not cover the archive's left sidebar (`SidePanel`) at `md` and wider. Check the TOC still lists the conversation's headings in both sidebar and inline modes.
  1. Toggle the archive sidebar open and closed and confirm the composer stays within the content column or below the sidebar.
  2. Open a conversation with headings, switch TOC mode, and click a TOC entry.
- [ ] Phone width: the composer and message list are usable with no horizontal page scroll (`resize_window` preset `mobile`).
- [ ] Switching between two conversations: the view changes, and the previous generation is stopped if one was streaming (this is the `closeConversation` behaviour on change).
- [ ] Typography controls (font size, width, font family) apply to the chat markup inside the archive detail.

## Known Follow-ups
- The fixed composer is viewport-fixed. If the manual check above finds it overlapping the archive sidebar, the fix is a layout change in `ChatComposer` or `ChatShell` that scopes the composer to its container. That is out of scope for this phase, which reuses the shared shell unchanged.
- `conversationArchiveStore.selectedMessages` is now unused by any renderer. Remove it in a cleanup pass.
- The resume button is still in the detail action row. Phase 5 removes it and makes resume open detached.
