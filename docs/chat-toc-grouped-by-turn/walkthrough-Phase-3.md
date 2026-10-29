# Walkthrough - Phase 3: Grouped nav popup

This phase implements Phase 3 of the `docs/chat-toc-grouped-by-turn.md` plan. When `groupByTurn` is set, the `TOCArchive` popup (`#toc-scroll`) lists one header per chat turn, with that turn's heading links nested under it. Non-grouped popups are unchanged.

## Changes Made

### 1. Turn headers and nested heading links

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- The popup list is now `{#if groupByTurn} … {:else} … {/if}`. The `{:else}` branch renders the original flat `{#each headings}` list.
- The grouped branch loops over `turns`. Each turn gets a `<button type="button" data-turn-header-id={turn.id}>` with `font-mono text-sm/5 text-text-primary`, a `line-clamp-2` span holding `turn.label`, and `aria-current="true"` when active.
- The active turn header gets `bg-black/5 dark:bg-white/5`. Other headers get a hover background. Alignment follows `isRTL`.
- `onclick` on a turn header calls `scrollToTurn(turn)` and sets `isNavOpen = false`, so the popup closes on all devices.
- Under each header, the turn's `turn.headings` render through the shared `headingLink` snippet.

### 2. Shared heading-link snippet

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- The existing heading `<a>` markup moved into `{#snippet headingLink(heading)}`, placed just before `<nav>`. Both the flat and grouped lists render it with `{@render headingLink(heading)}`, so the link markup exists once.
- The snippet keeps the `href="#{heading.id}"`, the `lv{level}` classes, the `activeHeadingId` highlight, and the `scrollToHeading` call.
- Its `onclick` closes the popup when `groupByTurn || isTouchDevice()`. For non-grouped mode this is the same condition as before.

### 3. Opening the popup scrolls the active turn into view

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- `toggleNav()` is the only opener in grouped mode. When it opens the popup with `groupByTurn` set, it runs `scrollActiveTurnHeaderIntoView` in `requestAnimationFrame`, so the nav's display change is laid out first.
- `scrollActiveTurnHeaderIntoView()` finds `#toc-scroll [data-turn-header-id="<activeTurnId>"]` and calls `scrollIntoView({ block: 'nearest' })`. It does nothing when no turn is active.
- Choice: this runs from `toggleNav()` rather than from a `$effect` on `isNavOpen`. The effect would also re-run on every `activeTurnId` change, and the plan only asks for the scroll when the popup opens.

### 4. Close control on all devices in grouped mode

#### [TOCArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TOCArchive.svelte)
- The footer close button condition is now `{#if isTouchDevice() || groupByTurn}`. Desktop grouped mode gets the close control too.
- The sidebar toggle, "Go to bottom", and "Go to top" buttons are unchanged, as the plan asks. In grouped mode the "Go to" links do not close the popup on desktop, because their `onclick` still checks `isTouchDevice()` only. This is a known gap, listed under Known Follow-ups.

## Verification Results

### 1. Type Checks & Compilation
- Ran `npm run check` → `1793003250162 START …` then `COMPLETED 1682 FILES 0 ERRORS 16 WARNINGS 8 FILES_WITH_PROBLEMS`.
- None of the 16 warnings is in `TOCArchive.svelte` or `ConversationTranscript.svelte`. The 16 warnings are the same pre-existing settings and sidepanel warnings as the Phase 1 and Phase 2 baselines.

### 2. Automated Tests (incl. layering guard)
- Ran `npm test` → `Test Files  72 passed (72)`, `Tests  750 passed (750)`.
- `tests/architecture/layering.test.js` is included in that run and passes. The change adds no imports.
- The `Not implemented: Window's scrollTo() method` lines in the output are jsdom messages from existing tests. They are not failures.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm run check` reports 0 errors and no new warnings in the touched files.
- [x] `npm test` passes all 72 files and 750 tests, including the architecture guard.
- [x] The flat (non-grouped) popup markup is unchanged apart from the heading-link snippet, which keeps the same markup and behavior for non-grouped mode.

### Still-Required Manual Verification (To Be Done by User)
- [ ] Open a conversation with 10 or more turns in the Archive, using floating TOC mode (window under 1280px, or switch to "archive" TOC mode).
  1. Click `^`. The popup lists one header per turn, with that turn's headings nested under it.
  2. Click a turn header. The page smooth-scrolls to that user message and the popup closes.
  3. Reopen the popup, then click a heading link. The page jumps to the heading and the popup closes.
- [ ] Open the popup mid-conversation. The active turn's header is highlighted and scrolled into view inside the popup.
  1. Scroll to the middle of a long conversation.
  2. Click `^`. The highlighted turn header should be visible without manual scrolling.
- [ ] Dismissal. The popup closes on backdrop click, on `Escape`, and on the close `×` button, which now shows on desktop too.
- [ ] Summary item in the Archive still opens the old flat TOC with hover-to-open behavior (Phase 4 covers this check).
- [ ] Touch emulation: tap `^` opens the popup, and tapping a turn header or heading closes it.

## Known Follow-ups
- The footer "Go to bottom" and "Go to top" links close the popup only on touch in grouped mode. The plan says to keep the footer as is. If a desktop popup should also close on these links, change their `onclick` guard to `isTouchDevice() || groupByTurn`. This was not changed here because the plan says to keep the footer as is.
- The popup scroll-into-view runs once per open. It does not follow `activeTurnId` changes while the popup stays open.
