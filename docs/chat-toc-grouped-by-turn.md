# Grouped Chat TOC (archive conversation view) — V1

> **How to use this doc:** Self-contained execution plan, intended to be run in
> a fresh session. Start at Phase 1 and go in order. Each phase ends with a
> verify step — don't move on until it passes.

## Context
In the Archive page, opening a chat conversation renders
`src/entrypoints/archive/components/displays/ConversationTranscript.svelte`, which mounts
`<TOC targetDivId="conversation-content" {activeTab} aboveComposer />` (line ~278) where `TOC` is
`src/entrypoints/archive/components/TOCArchive.svelte`.

`TOCArchive` today:
- `updateTOC()` collects every `h2,h3,h4` inside `#conversation-content` into a flat `headings` array (assigning ids via `generateId()`), re-run by a `MutationObserver` on the target div.
- `highlight()` (throttled, on `scroll`/`resize`) sets `activeHeadingId` = last heading whose `getBoundingClientRect().top <= 100`.
- The collapsed "rail" is a single `<button>` containing one tiny horizontal tick per heading (`lvs2/3/4` widths) plus a `^`; hovering (or tapping on touch) shows a `<nav>` popup (`#toc-scroll`, OverlayScrollbars) listing all headings, plus bottom/top/sidebar-mode buttons.

Problem: in a long conversation the rail becomes one very long column of identical ticks and you can't tell which tick belongs to which chat turn.

DOM facts the plan relies on:
- Every chat message is a `div[data-message-role][data-message-id][data-message-status]` (`src/components/chat/ChatMessage.svelte:141-146`); `role` is `user` or `assistant`. User text renders inside `ChatUserBubble` (`data-testid="chat-user-bubble"`).
- Headings only come from assistant markdown: user-message headings are rendered as `<p># …</p>` by `src/components/chat/ChatUserHeading.svelte`.

### Goal & scope decision (confirmed with user)
- Chat mode only: each chat turn is **one big marker** (a vertical bar ~`h-8`). The turn currently in the viewport **expands** to show its small heading ticks; other turns stay collapsed. Clicking a big marker scrolls to that turn. In grouped mode the rail never hides on hover; the full popup opens only from the `^` button.
- A "turn" = one `[data-message-role="user"]` element + all headings inside the assistant messages after it, up to the next user message. Turns without headings still get a marker. Headings before the first user message (rare) go into a leading turn anchored at the first message.
- Opt-in via a new prop `groupByTurn`; summary views using `TOCArchive` keep today's behavior unchanged.
- No new dependencies. Don't touch `TOCSidebar.svelte`, sidepanel `TOC.svelte`, or content-script TOCs.

## Phase 1 — Build turn data in `TOCArchive`
File: `src/entrypoints/archive/components/TOCArchive.svelte`.
1. Add `groupByTurn = false` to the `$props()` destructure, and **wire it now** so every later verify step can be run: in `src/entrypoints/archive/components/displays/ConversationTranscript.svelte` change the mount to `<TOC targetDivId="conversation-content" {activeTab} aboveComposer groupByTurn />`.
2. Add state: `let turns = $state([])`, `let activeTurnId = $state(null)`, plus a plain (non-reactive) `const turnLabels = new Map()` caching the last good label per message id.
3. In `updateTOC()`, after building `headings` (keep that as is), when `groupByTurn`:
   - Iterate `targetDiv.querySelectorAll('[data-message-role]')` in document order.
   - On a `user` element, start a new turn `{ id: el.dataset.messageId, label, headings: [] }`. Label resolution (the bubble is **not** always present — `ChatMessage.svelte:147-161` swaps `ChatUserBubble` for `ChatMessageEditor` while editing, and the `MutationObserver` re-runs `updateTOC()` at that moment):
     - `const bubble = el.querySelector('[data-testid="chat-user-bubble"]')`.
     - If `bubble` exists, clean its `innerText` the same way headings are cleaned (strip `\p{Extended_Pictographic}`, collapse whitespace, trim), truncate to ~80 chars; if the result is non-empty, store it in `turnLabels` and use it.
     - Otherwise (editing, or emoji/whitespace-only text) use `turnLabels.get(id)`; if still empty, fall back to `Turn ${n}` (1-based turn index).
   - On an `assistant` element, for each `h2,h3,h4` inside it, push the matching entry from `headings` (match by id) into the current turn. If no turn exists yet, create a leading turn keyed by that assistant message's id with label `Turn 1` (anchor = that message).
   - Assign `turns`. Use `data-message-id` as the turn id — never random — so `activeTurnId` survives re-runs.
4. In `highlight()`, when `groupByTurn`, also compute `activeTurnId` = id of the last user message whose `rect.top <= threshold`, falling back to `turns[0]?.id`.
5. Add `scrollToTurn(turn)`: find `[data-message-id="<id>"]` in the target div, `scrollIntoView({ behavior: 'smooth', block: 'start' })`, reuse the existing `animate-pulse` flash from `scrollToHeading`. Give the user message a top offset (inline `scroll-margin-top: 80px` set on the element in code, or a scoped style) so it's not glued to the top edge.

**Verify:** `npm run check` passes with no new errors in `TOCArchive.svelte`; temporary `$inspect(turns)` (remove after) in `npm run dev` shows one entry per user message with the right headings when opening a multi-turn conversation in Archive. Edit a user message (pencil) → no console error and that turn keeps its old label while the editor is open; Cancel → label unchanged; Save → label updates to the new text. A message of only emoji gets a `Turn N` label, never an empty one. (The rail still looks flat until Phase 2 — that's expected.)

## Phase 2 — Grouped rail (collapsed view)
Same file, markup only for `groupByTurn` (keep the existing `{#each headings}` branch for non-grouped):
1. Structure. The rail container is currently a `<button>` that fades out on `group-hover` (`TOCArchive.svelte:272-275`) — fine for flat ticks, but in grouped mode it would hide the markers the moment the pointer reaches them. So in grouped mode:
   - Render the rail as a `<div class="flex flex-col items-end gap-2 py-2 px-4">` **without** `group-hover:opacity-0`; markers stay visible and clickable at all times.
   - Split it into two children: (a) a **marker list** `<div>` that is height-capped (step 3), and (b) the `^` as its own `<button class="shrink-0">` **outside** that list, so it can never be clipped.
   - The popup is opened **only via `^`** in grouped mode (desktop and touch): click toggles `isNavOpen` (`toggleNav()`), and the nav uses the `isNavOpen ? 'block opacity-100' : 'hidden opacity-0'` branch for all devices instead of the `group-hover:block` branch. Render the existing backdrop (`fixed inset-0 z-10`, currently touch-only at `isTouchDevice() && isNavOpen`) whenever `isNavOpen` in grouped mode, and close on `Escape`. Hovering the rail does nothing in grouped mode.
   - Non-grouped mode keeps today's `<button>` + hover behavior exactly.
2. For each turn (inside the marker list):
   - A `<button>` marker with class `shrink-0` (so the capped flex column never squashes it): vertical bar `w-0.5 h-8 rounded-full`, `bg-primary opacity-100` when `turn.id === activeTurnId`, else `bg-text-secondary dark:bg-white opacity-50`; `title={turn.label}`; `aria-label` with the label; `onclick` → `scrollToTurn(turn)`. Give it a slightly wider transparent hit area (e.g. `px-1.5 py-0.5`).
   - Only for the active turn: below the bar, the existing small horizontal ticks for `turn.headings` (reuse the current tick markup and `lvs2/3/4` classes, highlighting `activeHeadingId`). Wrap in a container with a short `transition` on `max-height`/`opacity` (or Svelte `slide` from `svelte/transition`) so expand/collapse is smooth.
3. Cap only the **marker list**: `max-h-[calc(100vh-240px-var(--chat-composer-h,0px))] overflow-hidden flex flex-col items-end gap-1.5` (the extra 40px vs. the nav's 200px leaves room for the `^`). When `activeTurnId` changes, set the list's `scrollTop` so the active marker is in view (e.g. `activeEl.scrollIntoView({ block: 'nearest' })` scoped to the list, or compute `offsetTop` manually to avoid scrolling the page). The `^` sits below the list and is always visible.
4. Non-grouped mode: keep the `^` and the `group-hover:opacity-0` / nav-reveal behavior unchanged.

**Verify:** `npm run dev`, Archive → conversation with ≥10 turns, floating TOC mode (window < 1280px, or toggle to "archive" TOC mode): rail shows one tall bar per turn; scrolling changes which bar is primary and only that one expands its small ticks; moving the pointer onto a bar does **not** hide the rail, and clicking it scrolls to that user message; clicking `^` opens the popup, clicking outside / `Escape` closes it. Low-screen check: resize the window to ~600px tall with a ≥30-turn conversation (or DevTools device emulation, touch on) — markers are not squashed, the marker list clips/scrolls to keep the active bar visible, and `^` stays visible and opens the popup by tap.

## Phase 3 — Grouped nav popup
Same file, inside `#toc-scroll` when `groupByTurn`:
1. For each turn render a header row (`<a>`/`<button>`, `font-mono text-sm/5 px-3 py-2 text-text-primary line-clamp-2`) with `turn.label`, `onclick` → `scrollToTurn(turn)` (and close nav on touch, mirroring heading links). Active turn header gets `bg-black/5 dark:bg-white/5`.
2. Under each header, the turn's heading links using the existing heading `<a>` markup (`lv2/3/4`, `activeHeadingId` highlight, `scrollToHeading`).
3. When `isNavOpen` becomes true (the only opener in grouped mode), scroll the active turn header into view inside `#toc-scroll` (`block: 'nearest'`). Turn-header and heading clicks close the nav (`isNavOpen = false`) on all devices in grouped mode, since there's no hover-out to dismiss it.
4. Keep the footer buttons (sidebar toggle, bottom, top) as is; show the close button in grouped mode on all devices, not only touch.

**Verify:** click `^` → popup lists turns with their headings; clicking a turn header and a heading both jump correctly; the active turn is highlighted and visible when opened mid-conversation.

## Phase 4 — Integration & regression
(The prop was already wired in Phase 1.)
1. Confirm other `TOCArchive` users (e.g. `src/entrypoints/archive/components/displays/SummaryDisplay.svelte`) don't pass `groupByTurn`.
2. Run the full checklist below end to end.

**Verify:** `npm test` passes (incl. `tests/architecture/layering.test.js`); `npm run check` passes; opening a summary item in Archive shows the old flat TOC with the old hover-to-open behavior.

## Out of scope (V1)
- Grouping in `TOCSidebar.svelte` (desktop pinned sidebar mode) — can reuse the same `turns` logic later.
- Sidepanel chat, sidepanel `TOC.svelte`, content-script `TOCMobile.svelte`.
- Persisting expand state or adding keyboard shortcuts for turn navigation.

## Final verification checklist
- [ ] `npm test` passes
- [ ] `npm run check` has no new errors
- [ ] Long conversation: one bar per turn, active turn expands, click jumps to turn
- [ ] Rail stays visible under the pointer; `^` (click/tap) opens popup grouped by turn, links work, active turn visible; outside click / `Escape` / close button dismiss it
- [ ] ~600px-tall window, ≥30 turns: markers not squashed, active bar visible, `^` visible and working (also with touch emulation)
- [ ] Edit a user message: no error, label kept while editing; Cancel keeps it; Save updates it; emoji-only message shows `Turn N`
- [ ] Sending a follow-up in Archive adds a new turn marker (MutationObserver path)
- [ ] Turn with no headings still shows a bar and is clickable
- [ ] Summary items in Archive: TOC unchanged
- [ ] Light + dark theme look right; touch emulation: tap `^` opens nav, tap bar jumps

## Notable files
- `src/entrypoints/archive/components/TOCArchive.svelte` — all logic + markup changes (new `groupByTurn` prop).
- `src/entrypoints/archive/components/displays/ConversationTranscript.svelte` — passes `groupByTurn`.
- `src/components/chat/ChatMessage.svelte` — read-only reference for `data-message-role` / `data-message-id` and the bubble ↔ editor swap while editing.
