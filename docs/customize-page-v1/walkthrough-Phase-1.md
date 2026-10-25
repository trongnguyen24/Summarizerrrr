# Walkthrough - Phase 1: Extract the shell inside `archive/` (no behavior change)

Phase 1 of the Customize page plan (`docs/customize-page-v1.md`) lifted the archive page's sidebar shell out of `archive/App.svelte` into a reusable `SidebarLayout.svelte`, and generalized `TabArchive.svelte` into `SidebarTabs.svelte`. The new components live inside `archive/` so Rule 6 is not triggered yet; Phase 2 moves them to `src/components/ui/`.

## Changes Made

### 1. Shell component (drawer, toggle, stripes, panel container)

#### [SidebarLayout.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/SidebarLayout.svelte) (new)
- Owns `isMobile`, the `window` resize listener (registered in `$effect`, removed on cleanup), `toggle()` (wraps `animationService.show/hide` on the panel element), `closeOnMobile()`, and the overlay-click close.
- Props: `open = $bindable()`, a `sidebar` snippet rendered as `{@render sidebar({ closeOnMobile })}` only while `open`, and a `children` snippet for the main column.
- Markup is lifted verbatim from `archive/App.svelte`: mobile overlay (`fadeOnly`), toggle button (`tabler:layout-sidebar-left/right-collapse`), left and right `top-stripes` columns, the fixed panel container with the `w-px` divider, and the `flex-1 … bg-surface-1` main column.
- The panel container stays mounted; only the sidebar content is unmounted when closed, as before.

### 2. Generalized tab bar

#### [SidebarTabs.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/SidebarTabs.svelte) (new)
- Props: `tabs` (`[{ id, label, icon, iconActive }]`), `activeTab`, `onSelectTab`.
- The active bar is positioned with an inline `left: ((index + 0.5) / count) * 100%` plus `translateX(-50%)`, with `transition-[left]` for the same 400ms ease-out animation. For two tabs this gives 25% and 75% of the bar, which is the same centre as the old `±translate-x-20` (80px either side of the centre of a 320px `w-80` panel).
- No locale effect here: the `settings.uiLang → locale` sync was moved to `archive/App.svelte`.

#### [TabArchive.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/components/TabArchive.svelte) (deleted)
- Removed with `rm`. Nothing else imported it (`rg` over `src/` and `tests/` returns no hits after the change).

### 3. Archive page rewired to the shell

#### [App.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/App.svelte)
- Replaced `isSidePanelVisible`, `isMobile`, `sidePanel`, `toggleSidePanel`, `handleResize`, and `handleOverlayClick` with a single `sidebarOpen = $state(window.innerWidth >= 768)` bound to `<SidebarLayout bind:open={sidebarOpen}>`.
- The `sidebar` snippet renders `SidePanel`. Its `selectItem` now calls `closeOnMobile()` in place of `isMobile && isSidePanelVisible && toggleSidePanel()`.
- The main column (`ConversationTranscript`, `SummaryDisplay`, bottom fade) is passed as the `children` of `SidebarLayout`. `isSidePanelVisible` is passed as `sidebarOpen`.
- Added the `settings.uiLang → $locale` `$effect` (moved from the old `TabArchive`), with `locale` imported from `svelte-i18n`.
- Removed the now-unused `Icon`, `fadeOnly`, and `animationService` imports. The `applyReduceMotionToDOM` dynamic import is unchanged.
- Keyboard navigation, hash scrolling, data loading, and the `<main>` wrapper are unchanged.

#### [SidePanel.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/SidePanel.svelte)
- Replaced the `TabArchive` import and usage with `SidebarTabs`.
- Added a `tabs` `$derived` with the history and archive entries: icons `heroicons:clock` / `heroicons:clock-solid` and `heroicons:archive-box` / `heroicons:archive-box-solid`; labels `$t('archive.tab_history')` and `$t('archive.tab_archive')`.
- The rest of `SidePanel.svelte` is unchanged.

## Verification Results

### 1. Test suite (Tier A)
- Ran `npm test` before any edit → `Test Files 69 passed (69)`, `Tests 729 passed (729)`. This is the baseline.
- Ran `npm test` after the edits (and after deleting `TabArchive.svelte`) → `Test Files 69 passed (69)`, `Tests 729 passed (729)`. The layering guard (`tests/architecture/layering.test.js`, Rules 4–6) is included in those 69 files and passed.

```sh
npm test
```

Output:

```
 RUN  v4.1.10 /Users/nguyenle/Documents/GitHub/Summarizerrrr

 Test Files  69 passed (69)
      Tests  729 passed (729)
   Start at  16:13:44
   Duration  17.48s
```

### 2. Production build (Tier A)
- Ran `npm run build` → exit code 0, `✔ Finished in 35.2 s`, output in `.output/chrome-mv3`.
- The build printed one chunking warning: `settingsStore.svelte.js is dynamically imported … but also statically imported by …` (the list includes `archive/App.svelte`). This is pre-existing: `archive/App.svelte` imported `settingsStore` statically before this phase, and the warning is about the store's chunking, not the shell change. It was not treated as a failure.

```sh
npm run build
echo "exit=$?"
```

Output (relevant lines):

```
(!) …settingsStore.svelte.js is dynamically imported by …settingsPort.js … but also statically imported by … (archive/App.svelte among many others) … dynamic import will not move module into another chunk.
✔ Finished in 35.2 s
exit=0
```

### 3. Reference check (Tier A)
- Ran `rg -n 'TabArchive' src tests` → no hits left in code, only a comment in `archive/App.svelte` (`moved from the old TabArchive`). `docs/` mentions are historical and were not edited.
- Ran `rg -n 'isSidePanelVisible|isMobile|toggleSidePanel|handleOverlayClick|handleResize|sidePanel\b' src/entrypoints/archive/App.svelte` → only `isSidePanelVisible={sidebarOpen}` prop passes to `SummaryDisplay` and `ConversationTranscript`.

Not run: `npm run check` (svelte-check). The touched Svelte files are `// @ts-nocheck`, so it was not used as a gate for this phase.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` green before and after the change (69 files, 729 tests), including the layering guard.
- [x] `npm run build` exits 0.
- [x] `TabArchive.svelte` removed and has no remaining importers.
- [x] `archive/App.svelte` no longer references the removed state or handlers.
- [x] `SidebarLayout.svelte` and `SidebarTabs.svelte` basenames are unique under `src/` (the guard's Rule 4 passed).

### Still-Required Manual Verification (To Be Done by User)
Not run by the agent (requires a browser and the built extension). The plan's Phase 1 manual checks:

- [ ] Run `npm run dev` and load `.output/chrome-mv3-dev` as an unpacked extension. Open the archive page at desktop width (≥ 768px).
  1. The left panel, the History | Archive tabs, and the toggle button look and behave as before.
  2. The active-bar animation between tabs is the same as before (400ms ease-out slide, centred under each tab).
  3. Clicking the toggle button hides and shows the panel.
  4. Arrow-key navigation (← / →) still moves between items.
- [ ] At 375px width (or the mobile preset in DevTools):
  1. The panel starts closed.
  2. Tapping the toggle opens the panel as a drawer with the dark overlay.
  3. Clicking the overlay closes the drawer.
  4. Selecting an archive item closes the drawer.
- [ ] Change the UI language in settings, then reopen the archive page. The History and Archive tab labels update to the new language.
- [ ] Resize the window across 768px. The panel opens or closes as the device class changes (the old `handleResize` behavior).

## Known Follow-ups
- Phase 2 moves `SidebarLayout.svelte` and `SidebarTabs.svelte` to `src/components/ui/` once the prompt page is a second consumer (Rule 6). Phase 2 also needs a locale sync in `prompt/` if it is missing (the plan's note).
- The `<main>` wrapper stays in `archive/App.svelte`. Phase 2 can decide whether the shell should own it when the prompt page reuses the component.
