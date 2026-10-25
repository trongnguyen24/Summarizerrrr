# Walkthrough - Phase 2: Move shell to `src/components/ui/` and rebuild the prompt page on it

Phase 2 of the Customize page plan (`docs/customize-page-v1.md`) moved `SidebarLayout` and `SidebarTabs` to `src/components/ui/` so archive and prompt share them, and rebuilt the prompt page as a Customize page with Prompts | Skills tabs on that shell. Phase 3 (sticky action bar, Load preset, hint placement, Improve button, unsaved-changes guard) and Phase 4 (i18n, CLAUDE.md) were not started.

## Changes Made

### 1. Shared shell moved to `src/components/ui/`

#### [SidebarLayout.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/ui/SidebarLayout.svelte)
- Moved with a plain `mv` from `archive/components/` (the file was untracked, so `git mv` did not apply). Content unchanged from Phase 1.

#### [SidebarTabs.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/components/ui/SidebarTabs.svelte)
- Moved with a plain `mv` from `archive/components/`. Content unchanged from Phase 1.

#### [archive/App.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/App.svelte)
- The `SidebarLayout` import now points at `@/components/ui/SidebarLayout.svelte`.

#### [archive/SidePanel.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/archive/SidePanel.svelte)
- The `SidebarTabs` import now points at `@/components/ui/SidebarTabs.svelte`.

### 2. Prompt page split into pieces

#### [prompt/App.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/App.svelte)
- Rewritten as the shell plus tab and URL state. It renders `<SidebarLayout bind:open={sidebarOpen}>` with a `sidebar` snippet (header `Customize`, `SidebarTabs` with Prompts and Skills, then `PromptList` or `SkillList`) and a main column holding `PromptEditor` or `SkillEditor`.
- Tab and selection state: `activeTab` (`prompts` | `skills`) and `promptKey`. The URL is kept in step by a `$effect` that calls `history.replaceState` with `?tab=prompts&promptKey=<key>` or `?tab=skills`.
- Back-compat: `?view=skills` opens the Skills tab; a bare `?promptKey=` opens the Prompts tab. With no `promptKey`, the first summarize prompt (`youtubeCustomPromptContent`) is selected.
- Selecting a prompt or skill calls `closeOnMobile()`.
- Adds the `settings.uiLang` → `$locale` sync effect that Phase 1 said was missing from `prompt/`, copied from `archive/App.svelte`.
- Keeps the Toaster, theme init, reduce-motion effect and overlay scrollbars. Removes the `min-w-4xl` frame and all decorative grid-line spans.
- The main column wrapper uses `p-4 md:p-8`, plus `md:pl-[25rem]` while the sidebar is open on desktop so the fixed panel does not cover the editor.
- Header text is the literal `Customize`, and tab labels are the literals `Prompts` and `Skills`. Phase 4 replaces these with i18n keys.

#### [components/PromptList.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/components/PromptList.svelte) (new)
- The Summarize and Custom Actions sections from the old `PromptMenu.svelte`, without the header and toggle.
- Rows restyled to match `ArchiveListItem`'s selected and hover look (`list-button`, `text-sm`, sans font). The `.prompt-button` glow CSS is dropped.

#### [components/SkillList.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/components/SkillList.svelte)
- Header, `PromptViewToggle` and `onBack` are removed. A full-width `+ New skill` button sits at the top and calls `onCreate`.
- Built-in and User skills sections restyled as in `PromptList`. Props are `skills`, `selectedId`, `onSelect`, `onCreate`.

#### [components/PromptEditor.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/components/PromptEditor.svelte) (new)
- The right-column editor and the enhance dialog moved out of `App.svelte` unchanged in behavior: current and initial prompt state, `loadPromptContent`, save and discard, enhance, and the template `<select>` with Import.
- Props: `promptKey`, `title`, and `dirty = $bindable(false)`. `dirty` mirrors `isPromptModified`.
- The title is scrambled through `bind:this` instead of a `querySelector`.
- Bottom bar and hint placement are unchanged on purpose; Phase 3 changes them.

#### [components/SkillEditor.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/components/SkillEditor.svelte) (new)
- The right column of the old `SkillsPage.svelte`. It takes an `editor` prop (the state object from `skillEditorState`) and binds fields to `editor.draft.*`.
- Same markup and behavior as before, with the `min-w-4xl`, `p-8` frame and grid lines removed.

#### [skillEditorState.svelte.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/skillEditorState.svelte.js) (new)
- `createSkillEditorState()` factory. It holds `selectedId`, `creating`, `draft`, `baseline`, `errors` as `$state`, plus `skills` and `isModified` as `$derived`, and the sync `$effect`.
- Exposes getters (`skills`, `selectedId`, `draft`, `errors`, `isModified`) and actions (`selectSkill`, `newSkill`, `saveSkill`, `discardChanges`, `deleteSkill`, `resetBuiltIn`). Logic is copied from `SkillsPage.svelte`.
- Called once from `prompt/App.svelte` during component init, so its `$effect` belongs to that component.

#### [prompt/index.html](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/index.html)
- `<title>` changed from `Prompt templates` to `Customize`.

### 3. Superseded files removed

- `src/entrypoints/prompt/PromptMenu.svelte` — deleted (tracked file with the user's uncommitted `PromptViewToggle` edit; superseded by `PromptList` and the sidebar tabs).
- `src/entrypoints/prompt/SkillsPage.svelte` — deleted (replaced by `SkillEditor` and the `App` shell).
- `src/entrypoints/prompt/components/PromptViewToggle.svelte` — deleted (untracked; replaced by `SidebarTabs`).
- Pre-change copies of these three files, and of `prompt/App.svelte`, `prompt/components/SkillList.svelte` and `prompt/index.html`, were saved to `/private/tmp/claude-501/-Users-nguyenle-Documents-GitHub-Summarizerrrr/396a30ca-f551-4f17-9f5f-859167b82af5/scratchpad/phase2-backup/` before any edit.

### 4. Generated

#### [iconBundle.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/icons/iconBundle.js)
- Regenerated by the build's icon plugin (not hand-edited). The new name `heroicons:document-text-solid` was added; `heroicons:sparkles-solid` and `heroicons:document-text` were already present. The change is additive. Phase 4 still runs `npm run icons:sync` as planned.

## Verification Results

### 1. Test suite (Tier A)
- Ran `npm test` → `Test Files 69 passed (69)`, `Tests 729 passed (729)`. This includes the layering guard `tests/architecture/layering.test.js` (Rules 1–6), so the shared-shell placement and the `archive`/`prompt` reachability of `src/components/ui/Sidebar*.svelte` passed.

```sh
npm test
```

Output:

```
 Test Files  69 passed (69)
      Tests  729 passed (729)
   Start at  16:19:15
   Duration  13.63s (transform 26.79s, setup 3.22s, import 42.06s, tests 6.82s, environment 26.51s)
```

### 2. Production build (Tier A)
- Ran `npm run build` → exit code 0, `✔ Finished in 30.1 s`. The same chunking warning as in Phase 1 appears (`settingsStore.svelte.js` dynamically and statically imported). It is pre-existing and not a failure. No `not_found` icon error.

```sh
npm run build
echo "exit=$?"
```

Output (relevant lines):

```
(!) …settingsStore.svelte.js is dynamically imported by …settingsPort.js … but also statically imported by … dynamic import will not move module into another chunk.
✔ Finished in 30.1 s
exit=0
```

### 3. Type check (Tier A, supplementary)
- Ran `npm run check` → exit code 0, `COMPLETED 1676 FILES 0 ERRORS 13 WARNINGS 7 FILES_WITH_PROBLEMS`. None of the warnings are in the prompt page, the shell components, or the archive files touched here.

```sh
npm run check
```

Output (tail):

```
1792920020625 COMPLETED 1676 FILES 0 ERRORS 13 WARNINGS 7 FILES_WITH_PROBLEMS
```

### 4. Reference check (Tier A)
- Ran `rg -n "PromptMenu|SkillsPage|PromptViewToggle|TabArchive" src tests` → no hits. The only `onBack` substring matches are in `ConversationBackup` names in unrelated services.
- `archive/components/SidebarLayout.svelte` and `SidebarTabs.svelte` no longer exist; both imports resolve to `@/components/ui/`.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` green (69 files, 729 tests), including the layering guard.
- [x] `npm run build` exits 0.
- [x] `npm run check` reports 0 errors; no warnings in touched files.
- [x] `PromptMenu.svelte`, `SkillsPage.svelte`, `PromptViewToggle.svelte` removed and have no remaining importers.
- [x] `SidebarLayout.svelte` and `SidebarTabs.svelte` live in `src/components/ui/`, imported by both `archive` and `prompt`.
- [x] `prompt/index.html` title is `Customize`.

### Still-Required Manual Verification (To Be Done by User)
Not run by the agent (requires a browser and the built extension, `npm run dev`, `.output/chrome-mv3-dev`).

- [ ] Settings → Summary → each "edit prompt" link opens `prompt.html?promptKey=…` on the Prompts tab with that prompt selected.
- [ ] `prompt.html?view=skills` opens the Skills tab; `prompt.html?tab=skills` also works.
- [ ] Prompts: pick several items in the sidebar; the editor follows, the URL updates (`?tab=prompts&promptKey=…`), and the mobile drawer closes after selection.
- [ ] Save and Discard on a prompt behave as before (save persists after reload).
- [ ] Skills: create a user skill with `+ New skill`, edit, pin, save, then delete it.
- [ ] Skills: edit a built-in skill, use `Reset built-in`, and confirm the result matches the previous behavior.
- [ ] At 375px: no horizontal scroll; the drawer opens and closes via the toggle and the overlay; selecting an item closes it; editors are usable.
- [ ] At 1280px: the editor is offset to the right of the open sidebar and not covered by it.
- [ ] Archive page still behaves as at the end of Phase 1 (tabs, active-bar animation, drawer at 375px, language switch).

## Known Follow-ups
- Phase 3 replaces the bottom bar, moves the hints, adds Load preset and Improve, and adds the unsaved-changes guard. The `dirty` binding from `PromptEditor` is in place for that guard but unused for now (`promptDirty` in `App.svelte`).
- Tab labels and the `Customize` header are English literals until Phase 4 moves them to i18n keys.
- `Logdev.svelte` still exists under `prompt/components/`; it is no longer imported (its only use was a commented-out line in the old `App.svelte`). Left in place, not in this phase's list.
