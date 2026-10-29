# Walkthrough - Phase 1: Build turn data in `TOCArchive`

This phase implements Phase 1 of the `docs/chat-toc-grouped-by-turn.md` plan. `TOCArchive` now builds a `turns` array (one entry per user message, with the assistant headings that follow it) when the new opt-in `groupByTurn` prop is set. The prop is wired on the archive conversation transcript only. The rail markup is unchanged, so it still looks flat until Phase 2.

## Changes Made

### 1. Opt-in prop and wiring

#### [ConversationTranscript.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/displays/ConversationTranscript.svelte)
- Mounts `<TOC targetDivId="conversation-content" {activeTab} aboveComposer groupByTurn />` so every later phase can be verified in the archive chat view.

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- Destructures `groupByTurn = false` from `$props()` (the destructure is now multi-line; behavior of the existing props is unchanged).

### 2. State and label cache

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- Adds `turns = $state([])` and `activeTurnId = $state(null)`.
- Adds a plain, non-reactive `turnLabels = new Map()` keyed by message id, plus a `TURN_LABEL_MAX = 80` constant.

### 3. Turn building in `updateTOC()`

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- Flat `headings` collection is unchanged. When `groupByTurn` is set, `updateTOC()` then assigns `turns = buildTurns(targetDiv, headings)` before `highlight()`. The missing-target early return also clears `turns`.
- `buildTurns()` walks `[data-message-role]` in document order. A `user` element starts a new turn keyed by `data-message-id`. An `assistant` element pushes each `h2,h3,h4` (matched by id to the flat list) into the current turn.
- Headings that appear before the first user message go into a leading turn keyed by that assistant message's id, labelled `Turn 1`. This turn is created only when such a heading exists.
- `resolveTurnLabel()` reads `[data-testid="chat-user-bubble"]`, strips emoji and collapses whitespace, and truncates to 80 characters (with `…`). A non-empty result is cached in `turnLabels`. When the bubble is absent (the editor is open) or the text is empty after cleaning, it uses the cached label, then falls back to `Turn N` (the 1-based position of the turn).
- `cleanText()` is a small helper with the same emoji/whitespace rules as heading text.

### 4. Active turn in `highlight()`

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- When `groupByTurn` is set, `highlight()` sets `activeTurnId` to the last `[data-message-role="user"]` element whose `getBoundingClientRect().top` is at or above the existing 100px threshold, scanning in document order and stopping at the first element below it. If none qualifies, it falls back to `turns[0]?.id`.

### 5. `scrollToTurn(turn)`

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- Finds `[data-message-id="<id>"]` inside the target div (using `CSS.escape`), sets an inline `scrollMarginTop = '80px'`, calls `scrollIntoView({ behavior: 'smooth', block: 'start' })`, and reuses the `animate-pulse` flash for 4 seconds, matching `scrollToHeading`.
- The inline style is safe because `ChatMessage.svelte`'s root element has no `style` attribute of its own (checked at `src/components/chat/ChatMessage.svelte:141-146`).

## Verification Results

### 1. Type Checks & Compilation
- Ran `npm run check` before edits → `1682 FILES 0 ERRORS 16 WARNINGS 8 FILES_WITH_PROBLEMS` (baseline).
- Ran `npm run check` after edits → `1682 FILES 0 ERRORS 16 WARNINGS 8 FILES_WITH_PROBLEMS`. Diffing the ERROR/WARNING lines against the baseline shows no new problems. No warnings reference `TOCArchive.svelte` or `ConversationTranscript.svelte`.

### 2. Automated Tests (incl. layering guard)
- Ran `npm test` before edits → `Test Files 72 passed (72)`, `Tests 750 passed (750)`, exit 0.
- Ran `npm test` after edits → `Test Files 72 passed (72)`, `Tests 750 passed (750)`, exit 0. This includes `tests/architecture/layering.test.js`.

Output (after edits, tail):
```
 Test Files  72 passed (72)
      Tests  750 passed (750)
   Start at  15:23:47
   Duration  9.36s
exit 0
```

### 3. Scope check
- `git status --short` → only `TOCArchive.svelte` and `ConversationTranscript.svelte` are modified (118 insertions, 2 deletions). HEAD is unchanged at `bc0a9b3`. No commit, stash, or branch change was made.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm run check` shows no new errors or warnings in the touched files.
- [x] `npm test` passes (72 files, 750 tests), including the architecture layering test.
- [x] Only the two planned files changed; no plan, prior walkthrough, or index was edited.

### Still-Required Manual Verification (To Be Done by User)
These need the browser and a real chat conversation, so they were not run by the agent. The temporary `$inspect(turns)` step from the plan was not added, since it needs a browser session to read.

- [ ] Run `npm run dev`, load the unpacked extension, and open a multi-turn conversation in Archive.
  1. Confirm the console shows no errors, then add a temporary `$inspect(turns)` in `TOCArchive.svelte` if you want to inspect the data (remove it afterwards).
  2. Confirm there is one entry per user message, and each entry's `headings` match the assistant headings that follow it.
- [ ] Edit a user message (pencil icon).
  1. While the editor is open, confirm there is no console error and the turn keeps its previous label.
  2. Click Cancel and confirm the label is unchanged.
  3. Edit the message to new text, click Save, and confirm the label updates to the new text.
- [ ] Send a text-only message that is emoji only (for example one emoji) in a new conversation, and confirm its turn label is `Turn N`, not empty.
- [ ] Confirm the flat rail and popup still look exactly as before (expected, since rendering is unchanged in this phase).

## Known Follow-ups
- Editing a message from text to emoji-only keeps the previously cached text label (the plan's wording caches on the editing and emoji-only path). The spec says emoji-only messages should show `Turn N`, so this edge case may need a follow-up. It cannot happen on first load, where the cache is empty.
- The leading turn (headings before any user message) is created only when such a heading exists, not for every leading assistant message without headings. This is the lazy reading of the plan's step 3.
- `scrollToTurn` relies on `CSS.escape`, which is available in the extension's target browsers. Not exercised in jsdom tests.
