# Walkthrough - Phase 4: Integration & regression

This phase closes out the `docs/chat-toc-grouped-by-turn.md` plan (V1) with integration checks only. No source code changed in this phase: the `groupByTurn` prop was already wired in Phase 1, and the grouped rail and popup were built in Phases 2 and 3. The checks below confirm that the grouped TOC stays scoped to the archive chat transcript and that the flat summary TOC is unchanged.

## Changes Made

No source files were created or modified in this phase. The only new file is this walkthrough.

## Verification Results

### 1. Scope of `groupByTurn` (plan step 1)
- Ran `rg -n 'groupByTurn' src/` → the prop is used only in:
  - `src/entrypoints/archive/components/displays/ConversationTranscript.svelte:278` → `<TOC targetDivId="conversation-content" {activeTab} aboveComposer groupByTurn />`
  - `src/entrypoints/archive/components/TOCArchive.svelte` (the prop declaration and its branches).
- Ran `rg -n '<TOC\b|TOCArchive' src/entrypoints/archive src/components` → the only other mount is `src/entrypoints/archive/components/displays/SummaryDisplay.svelte:369` → `<TOC targetDivId="summary-content" {activeTab} />`. It does not pass `groupByTurn`, so the prop defaults to `false`.
- Result: confirmed. Summary items get the flat TOC.

### 2. Flat-mode code path review (plan step 2, summary regression)
Read `src/entrypoints/archive/components/TOCArchive.svelte` and confirmed the `groupByTurn = false` branches still behave as before:
- Nav visibility: `isTouchDevice() || groupByTurn ? (isNavOpen ? 'block opacity-100' : 'hidden opacity-0') : 'hidden group-hover:block opacity-0 group-hover:opacity-100'`. For a summary on desktop this is still the hover-to-open branch.
- Heading link `onclick` closes the nav only when `groupByTurn || isTouchDevice()`. On desktop summary views the popup does not close on click, as before.
- Footer close button renders only when `isTouchDevice() || groupByTurn`. Desktop summary views do not show it, as before.
- Backdrop renders only when `isNavOpen && (isTouchDevice() || groupByTurn)`. Desktop summary views get no backdrop, as before.

### 3. Automated Tests (plan step 3, incl. layering guard)
- Ran `npm test` → `Test Files  72 passed (72)`, `Tests  750 passed (750)`.
- `tests/architecture/layering.test.js` is part of that run and passes. The only output lines beyond the summary are jsdom `Not implemented: Window's scrollTo() method` messages from existing tests. They are not failures.

### 4. Type Checks & Compilation (plan step 4)
- Ran `npm run check` → `COMPLETED 1682 FILES 0 ERRORS 16 WARNINGS 8 FILES_WITH_PROBLEMS`.
- None of the 16 warnings is in `TOCArchive.svelte` or `ConversationTranscript.svelte`. They are the same pre-existing settings and sidepanel warnings as the Phase 1 to 3 baselines (for example `DeepDiveToolSettings.svelte`, `AppearanceSettings.svelte`, `cat.svelte`).
- Result: 0 errors, no new warnings in the touched files.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] Plan step 1: `groupByTurn` is passed only by `ConversationTranscript.svelte`. `SummaryDisplay.svelte` does not pass it.
- [x] Summary TOC code path (`groupByTurn = false`) reviewed: hover-to-open nav, no backdrop, no footer close button on desktop.
- [x] `npm test` passes all 72 files and 750 tests, including `tests/architecture/layering.test.js`.
- [x] `npm run check` reports 0 errors and no new warnings in the touched files.

### Still-Required Manual Verification (To Be Done by User)
- [ ] Opening a summary item in the Archive shows the old flat TOC with hover-to-open behavior.
  1. Run `npm run dev`, load the unpacked extension, and open the Archive.
  2. Open a summary item (not a chat). Hover the TOC rail on desktop. The popup should open on hover, without the `^`-only behavior.
  3. On a narrow or touch-emulated window, tap the TOC. The popup should open and close on heading tap, as before.
- [ ] Full checklist from the plan, in a browser: long conversation (one bar per turn, active turn expands, click jumps), `^` popup grouped by turn, dismissal on outside click, `Escape`, and `×`, low-height window with at least 30 turns, edit-label behavior (Phase 1 checks), a follow-up adds a new turn marker, a no-heading turn is clickable, and light and dark themes.
- [ ] Touch emulation: tap `^` opens the nav, and tap on a bar jumps to its turn.

## Known Follow-ups
- Carried over from Phase 3 and still open: the footer "Go to bottom" and "Go to top" links close the popup only on touch in grouped mode. The plan says to keep the footer as is, so this was left unchanged.
- Carried over from Phase 3: the popup scroll-into-view runs once per open and does not follow `activeTurnId` changes while the popup stays open.
