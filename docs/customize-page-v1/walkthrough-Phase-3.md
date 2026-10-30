# Walkthrough - Phase 3: Editor UX cleanup

Phase 3 of the Customize page plan (`docs/customize-page-v1.md`) reworked the prompt and skill editors: a sticky Discard/Save bar that appears only when there are unsaved changes, a "Load preset" menu replacing the template `<select>` and Import button, field hints moved under their textareas, a labelled Improve button, font changes, growing textareas, and an unsaved-changes guard for tab, prompt and skill switches. Phase 4 (i18n keys, CLAUDE.md, icon sync) was not started, so the new strings are English literals.

## Changes Made

### 1. Sticky action bar

#### [EditorActionBar.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/components/EditorActionBar.svelte) (new)
- Props: `dirty`, `onDiscard`, `onSave`. Renders nothing unless `dirty` is true.
- Shows the literal label "Unsaved changes" with Discard and Save buttons, using the bordered-block and rotated corner `span` styling from the old bottom bar.
- Sticky at `bottom-0` with a top border and a translucent surface background. `mt-auto` pushes it to the bottom of the editor column when content is short.
- Basename is unique across `src/` (checked with `find`).

### 2. Prompt editor

#### [PromptEditor.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/components/PromptEditor.svelte)
- Header row: title on the left, a `bits-ui` `DropdownMenu` "Load preset" button on the right. Its items are the existing `allTemplates`.
- `handleLoadPreset(template)` calls `confirm()` first when `isPromptModified`. If the user accepts, it sets the system and user prompts, as `handleImportTemplate` did.
- Removed `selectedTemplate`, `handleTemplateChange`, `handleImportTemplate`, the `<select id="templateSelect">`, and the Import button.
- Bottom Discard/Save row replaced by `<EditorActionBar dirty={isPromptModified} onDiscard={handleDiscardChanges} onSave={handleSavePrompt} />`. `handleSavePrompt` and `handleDiscardChanges` are unchanged.
- Hints: `prompts.system_note` sits below the system textarea and `prompts.user_note` below the user textarea, as `text-xs text-text-secondary`. The `__CONTENT__` text is already inside the `user_note` string, so no separate `<code>` element was added.
- Improve: the floating ✦ circle is replaced by a labelled "Improve" button (sparkle icon) at the right of the user-note row. It keeps the `showEnhanceButton` gating (more than 2 words), `isOpen = true; handlePromptEnhance()`, and the existing enhance dialog, which is unchanged.
- Fonts: the wrapper no longer has `font-mono`. Both textareas have `font-mono`. The enhance dialog keeps its `font-mono`, since it is not a page wrapper.
- Growth: the user-prompt container is `flex-1 min-h-[40vh] md:min-h-48` and its textarea is `flex-1`. The system textarea has `min-h-32`. The wrapper is `flex-1` so it fills the column.
- Keeps `TextScramble` on the title. Whether it flickers with the sans font is a Tier B check.

### 3. Skill editor

#### [SkillEditor.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/components/SkillEditor.svelte)
- Header row: the title block on the left. On the right, the Delete (user skills) or Reset built-in (built-in skills) button, then the Pin checkbox. Delete and Reset are no longer in the bottom bar.
- Hint "Applied to a single turn only" moved below the instruction textarea as `text-xs text-text-secondary`. The tab-style labels are kept.
- `fieldClass` now includes `font-mono`, which applies to the skill name input and the instruction textarea. The wrapper no longer has `font-mono`.
- The bottom Discard/Save row is replaced by `<EditorActionBar dirty={editor.isModified} onDiscard={editor.discardChanges} onSave={editor.saveSkill} />`.
- Growth: the instruction container is `flex-1 min-h-[40vh] md:min-h-48` and its textarea is `flex-1 min-h-40`.
- `skillEditorState.svelte.js` is unchanged.

### 4. Shell: layout and unsaved-changes guard

#### [App.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/prompt/App.svelte)
- Main column is now `flex min-h-vh flex-col` so the editors can fill the height. The `md:pl-[25rem]` offset while the sidebar is open is unchanged.
- `canLeaveEditor()` checks the active editor's dirty state: `promptDirty` on the Prompts tab, `editor.isModified` on the Skills tab. If dirty, it calls `confirm('You have unsaved changes. Discard them?')`.
- `selectTab`, `selectPrompt`, `selectSkill` and `newSkill` run the guard before changing state, and return `false` when the user cancels. Selecting the current item or tab returns `true` without asking.
- The sidebar closures call `closeOnMobile()` only when the switch went through, so cancelling keeps the drawer open.
- The guard runs before the switch, so a cancelled switch leaves the URL and selection unchanged. The URL-sync effect is unchanged.

## Verification Results

### 1. Test suite (Tier A)
- Ran `npm test` → `Test Files 69 passed (69)`, `Tests 729 passed (729)`. This includes the layering guard `tests/architecture/layering.test.js`. The new `EditorActionBar.svelte` lives in `entrypoints/prompt/components/`, so no `src/components/` placement rule is affected.

```sh
npm test
```

Output:

```
 Test Files  69 passed (69)
      Tests  729 passed (729)
   Start at  16:23:39
   Duration  14.38s (transform 28.33s, setup 3.57s, import 45.18s, tests 8.08s, environment 26.09s)
```

### 2. Production build (Tier A)
- Ran `npm run build` → exit code 0, `✔ Finished in 26.5 s`, output in `.output/chrome-mv3`.
- The only warning is the `settingsStore.svelte.js` dynamic/static import chunking warning, which is pre-existing (it was also present in Phase 1 and 2). No `not_found` icon error and no Svelte compile warning from `entrypoints/prompt`.

```sh
npm run build
echo "exit=$?"
```

Output (relevant lines):

```
(!) …settingsStore.svelte.js is dynamically imported by …settingsPort.js … but also statically imported by … (entrypoints/prompt/App.svelte among many others) … dynamic import will not move module into another chunk.
✔ Finished in 26.5 s
exit=0
```

### 3. Type check (Tier A, supplementary)
- Ran `npm run check` → exit code 0, `COMPLETED 1677 FILES 0 ERRORS 13 WARNINGS 7 FILES_WITH_PROBLEMS`. Phase 2 reported `1676 FILES 0 ERRORS 13 WARNINGS 7 FILES_WITH_PROBLEMS`. The extra file is `EditorActionBar.svelte`. Grepping the full check log for `entrypoints/prompt` returns 0 lines, so none of the 13 warnings is in the prompt entrypoint. The tail line shown is one of the existing warnings in `sidepanel/components/cat.svelte`, which is outside this phase.

```sh
npm run check
```

Output (tail):

```
WARNING "src/entrypoints/sidepanel/components/cat.svelte" 225:3 "Unused CSS selector \"#fur4\"…
COMPLETED 1677 FILES 0 ERRORS 13 WARNINGS 7 FILES_WITH_PROBLEMS
```

### 4. Reference check (Tier A)
- `rg -n "handleImportTemplate|selectedTemplate|templateSelect|handleTemplateChange|prompts.buttons.import|prompts.select_template" src/entrypoints/prompt` → no matches, so the old template select, Import button and handlers are gone. The i18n keys themselves stay in the locale files until Phase 4.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` green (69 files, 729 tests), including the layering guard.
- [x] `npm run build` exits 0; no new warnings from the prompt entrypoint.
- [x] `npm run check` reports 0 errors and no warnings in the prompt entrypoint.
- [x] Template `<select>` and Import button removed from `PromptEditor.svelte`.
- [x] Discard/Save bottom rows replaced by `EditorActionBar` in both editors; Delete/Reset moved to the skill header.
- [x] Hints moved under their textareas; the floating ✦ circle is replaced by a labelled Improve button.
- [x] `canLeaveEditor()` guard wired into tab, prompt, skill and new-skill switches in `App.svelte`.

### Still-Required Manual Verification (To Be Done by User)
Not run by the agent (requires the built extension in a browser, `npm run dev` or `.output/chrome-mv3`).

- [ ] Prompts: edit a prompt → the sticky "Unsaved changes" bar appears at the bottom; Discard restores the saved text and hides the bar.
- [ ] Prompts: Save persists the change (reload the page, the change survives) and the bar disappears.
- [ ] Prompts: on a dirty prompt, pick a preset from "Load preset" → a confirm dialog appears; Cancel keeps the edits, OK replaces both fields.
- [ ] Prompts: on a clean prompt, "Load preset" applies the preset with no confirm.
- [ ] Prompts: the Improve button appears only after more than 2 words in the user prompt; clicking it opens the enhance dialog and "Apply Prompt" still writes the result into the user prompt.
- [ ] Skills: edit a skill → the sticky bar appears; Discard and Save behave as before. Delete (user skill) and Reset built-in sit in the header next to Pin.
- [ ] Guard: with unsaved edits, switch to another prompt, another skill, `+ New skill`, and the other tab. Each asks to confirm. Cancel keeps the edits and the selection; OK switches.
- [ ] Guard: with no unsaved edits, switching does not ask.
- [ ] Layout at 1280px: textareas fill the available height; the sticky bar stays at the bottom while scrolling.
- [ ] Layout at 375px: no horizontal scroll; the user-prompt textarea is at least 40vh; the drawer closes after an item is selected, and stays open when a confirm is cancelled.
- [ ] Fonts: the title is sans and still scrambles cleanly with `TextScramble`; the textareas and the skill name input are monospace.
- [ ] Light and dark themes: the sticky bar background, borders and buttons are readable in both.

## Known Follow-ups
- New strings are literals and must move to i18n keys in Phase 4: "Load preset", "Improve", "Unsaved changes", "Discard", "Save" (bar), the preset confirm text, and the navigation confirm text. The skill header labels ("Delete", "Reset built-in", "Pin") and the other skill-editor literals are out of scope for V1 per the plan.
- `prompts.buttons.import` and `prompts.select_template` are no longer referenced from the prompt editor. Phase 4 removes them after a `grep -rn` check.
- The `prompts.user_note` string already contains the `__CONTENT__` text, so no extra code element was added. If Phase 4 changes that string, keep `__CONTENT__` in it.
- The enhance dialog still uses `font-mono`, as before. Restyling it is not in this phase.
