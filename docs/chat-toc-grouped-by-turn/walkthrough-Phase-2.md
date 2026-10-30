# Walkthrough - Phase 2: Grouped rail (collapsed view)

This phase implements Phase 2 of the `docs/chat-toc-grouped-by-turn.md` plan. When `groupByTurn` is set, the `TOCArchive` rail now renders one marker per chat turn, expands only the active turn's heading ticks, and opens the popup only through the `^` button. The non-grouped rail is unchanged.

## Changes Made

### 1. Grouped rail markup

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- Wraps the existing rail `<button>` in `{#if groupByTurn} … {:else} … {/if}`. The `{:else}` branch is the original button, with its markup and `group-hover:opacity-0` behavior unchanged.
- The grouped branch is a `<div>` with no hover fade, so markers stay visible under the pointer. It has two children:
  - A height-capped marker list (`max-h-[calc(100vh-240px-var(--chat-composer-h,0px))] overflow-hidden`), bound to `turnRailEl`.
  - The `^` as its own `<button class="shrink-0">` below the list, so it is never clipped.
- Each turn is a `<button class="shrink-0">` with `data-turn-id`, `title`/`aria-label` set to the turn label, `aria-current` on the active turn, and `onclick` → `scrollToTurn(turn)`. It holds a `w-0.5 h-8 rounded-full` bar, `bg-primary opacity-100` when active and `bg-text-secondary dark:bg-white opacity-50` otherwise.
- Only the active turn renders its heading ticks, using the existing `lvs{level}` classes and `activeHeadingId` highlight. They sit in a span with `transition:slide={{ duration: 150 }}`.

### 2. Popup opening and dismissal

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- The `^` button calls the existing `toggleNav()`, and `aria-expanded` reflects `isNavOpen`.
- The `<nav>` visibility condition is now `isTouchDevice() || groupByTurn`. In grouped mode it uses `isNavOpen ? 'block opacity-100' : 'hidden opacity-0'` for all devices. Hovering the rail does nothing. Non-grouped mode keeps the `group-hover` branch.
- The backdrop is `{#if isNavOpen && (isTouchDevice() || groupByTurn)}`. For non-grouped mode this is equivalent to the old condition, since `isNavOpen` is only set from touch.
- A `<svelte:window onkeydown={handleNavKeydown} />` closes the popup on `Escape`, only when `groupByTurn` is set and the popup is open.

### 3. Script helpers

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- Imports `slide` from `svelte/transition`. The repo already uses this package in `src/entrypoints/settings/components/Setting.svelte`.
- `let turnRailEl = $state(null)` is bound to the marker list. Declaring it `$state` avoids a `non_reactive_update` svelte-check warning.
- `keepActiveTurnVisible(id)` adjusts `turnRailEl.scrollTop` by the offsets of the active `[data-turn-id]` element, so the active marker stays in the capped list. It only scrolls when the marker is out of view. The list has `relative`, so `offsetTop` is measured from the list.
- A `$effect` on `activeTurnId` calls `keepActiveTurnVisible` in `requestAnimationFrame`, so the newly active turn's ticks are laid out first. The frame is cancelled on cleanup.

## Verification Results

### 1. Type Checks & Compilation
- Ran `npm run check` after the first edit → one new warning, `TOCArchive.svelte` 66:7 "`turnRailEl` is updated, but is not declared with `$state(...)`". Fixed by declaring `turnRailEl` as `$state(null)`.
- Ran `npm run check` after the fix → `1682 FILES 0 ERRORS 16 WARNINGS 8 FILES_WITH_PROBLEMS`.
- The warning list has no entries for `TOCArchive.svelte` or `ConversationTranscript.svelte`. The 16 warnings match the Phase 1 baseline (`0 ERRORS 16 WARNINGS`), all in other files.

### 2. Automated Tests (incl. layering guard)
- Ran `npm test` → `Test Files 72 passed (72)`, `Tests 750 passed (750)`. This includes `tests/architecture/layering.test.js`.

Output (tail):
```
 Test Files  72 passed (72)
      Tests  750 passed (750)
   Start at  15:26:04
   Duration  10.04s (transform 20.63s, setup 2.91s, import 32.23s, tests 5.45s, environment 18.52s)
```

### 3. Formatting
- `npx prettier --check` on the `.svelte` file reports `No parser could be inferred`, because this repo has no Svelte parser configured for Prettier. The new markup was formatted by hand to match the surrounding code.

### 4. Scope check
- `git status --short` → `TOCArchive.svelte` (Phase 1 and Phase 2 edits), `ConversationTranscript.svelte` (Phase 1), and the untracked `docs/chat-toc-grouped-by-turn/`. No other source files were touched.
- HEAD is still `bc0a9b3d04d3185f21ffbab9a3e503df358ef8f3`. No commit, stash, reset, or branch change was made.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm run check` → 0 errors, no new warnings in touched files.
- [x] `npm test` → 72 files, 750 tests pass, including the architecture layering guard.
- [x] Non-grouped branch is preserved verbatim inside `{:else}`, and summary views do not pass `groupByTurn`, so their TOC keeps the old behavior.

### Still-Required Manual Verification (To Be Done by User)
These need a browser and a real conversation, so the agent did not run them.

- [ ] Run `npm run dev`, load the unpacked extension, and open Archive → a conversation with at least 10 turns, in floating TOC mode (window narrower than 1280px, or switch to "archive" TOC mode).
  1. Confirm the rail shows one tall bar per turn.
  2. Scroll the conversation and confirm the primary bar changes, and only that turn expands its small heading ticks.
- [ ] Move the pointer onto a bar and confirm the rail does not hide. Click a bar and confirm it scrolls to that user message.
- [ ] Click `^` and confirm the popup opens. Then close it by clicking outside, pressing `Escape`, or the close control on touch.
- [ ] Low-screen check: resize to about 600px tall with at least 30 turns (or use DevTools device emulation with touch on).
  1. Confirm the markers are not squashed.
  2. Confirm the marker list clips and keeps the active bar in view as you scroll.
  3. Confirm `^` stays visible and a tap opens the popup.
- [ ] Light and dark theme: confirm the bars and ticks use the right colors.
- [ ] Non-grouped regression: open an Archive summary item and confirm its TOC still expands on hover, as before.

## Known Follow-ups
- The popup still lists flat headings. Turn grouping in the popup is Phase 3.
- The marker list uses `overflow-hidden` as the plan specifies, so markers beyond the cap are reached only by the automatic scroll that follows the active turn, not by a manual scroll. Revisit if this is hard to use with very long conversations.
- The `^` button and the whole rail sit under the backdrop while the popup is open, so clicking a marker while the popup is open closes the popup instead of jumping. This matches the touch behavior of the existing backdrop.
- Phase 1's changes were uncommitted in the working tree when this phase started. The orchestrator's prompt listed the pre-existing modifications as clean, but the diffs match Phase 1's walkthrough. This phase treats them as prior-phase output and builds on them.
