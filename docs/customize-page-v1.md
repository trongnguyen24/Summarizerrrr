# Customize page (Prompts | Skills) — V1

> **How to use this doc:** Self-contained execution plan, intended to be run in
> a fresh session. Start at Phase 1 and go in order. Each phase ends with a
> verify step — don't move on until it passes. Read `CLAUDE.md` first (layering
> + component-placement rules matter here).

## Context

The `prompt` entrypoint (`src/entrypoints/prompt/`, served as `prompt.html`)
edits two unrelated-looking things:

- **Prompts** — the fixed set of summarize / custom-action prompt pairs stored in
  settings (`<x>CustomPromptContent` + `<x>CustomSystemInstructionContent`).
  Editor lives in `prompt/App.svelte` (641 lines), menu in `prompt/PromptMenu.svelte`.
- **Chat skills** — CRUD over `skillService` (`src/lib/chat/skills/skillService.js`).
  A whole separate page, `prompt/SkillsPage.svelte` + `prompt/components/SkillList.svelte`,
  swapped in by `App.svelte` via `view === 'skills'` / `?view=skills`.

Today's UI problems (the reason for this work):

1. Switching Prompts ↔ Skills is two 16px icons next to the heading
   (`prompt/components/PromptViewToggle.svelte`). They read as actions, not
   tabs, and Skills replaces the whole page with its own "back" flow.
2. Heading says "Prompts" even though the page also owns Skills.
3. **No mobile support:** both `App.svelte` and `SkillsPage.svelte` use
   `min-w-4xl`, a fixed `w-56` menu, and absolutely positioned decorative grid
   lines (`left-8`, `left-64`, `top-8`, …).
4. Bottom bar mixes "apply a template" (`<select>` + a button labelled
   **Import**, which reads like file import) with Discard/Save.
5. The ✦ prompt-enhance button floats unlabeled inside the textarea; the hints
   ("Optional: Skip if not needed.", `__CONTENT__`) are tiny and right-aligned;
   the whole page is `font-mono`.

The **archive** page (`src/entrypoints/archive/`) already has the layout we
want: left panel with a two-tab bar (History | Archive), drawer on mobile,
toggle button, decorative edge stripes. That shell is currently inlined:

- `archive/App.svelte` — owns `isSidePanelVisible`, `isMobile` (`< 768`),
  `handleResize`, `toggleSidePanel` (uses `animationService.show/hide` from
  `src/services/animationService.js`), the mobile overlay (`fadeOnly` from
  `src/lib/utils/slideScaleFade.js`), the fixed toggle button
  (`tabler:layout-sidebar-left-collapse` / `…-right-collapse`), the
  `top-stripes` edge columns, and the fixed `w-80` panel container. It also
  auto-closes the drawer on mobile after selecting an item, and passes
  `isSidePanelVisible` down to `SummaryDisplay` / `ConversationTranscript`.
- `archive/SidePanel.svelte` — header ("Summarizerrrr" + `KindFilter`), then
  `TabArchive`, then the scrolling list. Wrapped in a `slideScaleFade`
  transition, `w-80 h-lvh`.
- `archive/components/TabArchive.svelte` — the two-tab bar with the glowing
  active bar. Hard-coded to history/archive; bar position math assumes two
  tabs across `w-80` (`±translate-x-20`). **It also contains an `$effect`
  that syncs `svelte-i18n`'s `locale` with `settings.uiLang`** — that must not
  be lost when it's replaced.

Callers of the prompt page (must keep working):
- `src/entrypoints/settings/components/SummarySettings.svelte:221,242` →
  `prompt.html?promptKey=<key>`
- `src/entrypoints/background/index.js:918` → `prompt.html`
- Old `?view=skills` URLs (from `App.svelte`'s `openSkills()`).

### Goal & scope decision (confirmed with user)

- Page is renamed **"Customize"**, with two tabs **Prompts | Skills** that look
  and behave like History | Archive.
- The archive shell is **extracted to `src/components/ui/`** and used by both
  archive and prompt. With exactly 2 consumers it satisfies Rule 6 of
  `tests/architecture/layering.test.js`. Do not copy-paste the shell.
- **Mobile uses the drawer pattern** (same as archive, breakpoint 768px), not
  list→detail push navigation.
- Editor UX: "Load preset" menu replaces template `<select>` + Import; sticky
  Save/Discard bar shown only when dirty; hints moved under the textareas;
  ✦ button gets a visible "Improve" label; sans font for chrome, mono only
  inside textareas; drop `min-w-4xl` and the grid-line decoration.
- No new dependencies (`bits-ui` is already used — use its `DropdownMenu` for
  Load preset). No settings-schema, storage or `skillService` changes.

### Baseline note

The branch `V3.0-refactor-01` had uncommitted archive changes (unified list,
`ArchiveSearch.svelte`, `historyFilterStore` deletion) when this plan was
written. Make sure those are committed before starting, and run `npm test`
once to record the baseline (all green expected).

## Phase 1 — Extract the shell inside `archive/` (no behavior change)

Extract first *within* archive, so Rule 6 isn't triggered by a 1-consumer file
in `src/components/`. Phase 2 moves it.

1. Create `src/entrypoints/archive/components/SidebarLayout.svelte` (check the
   basename is unique under `src/` — guard test requires it). It owns
   everything shell-ish lifted from `archive/App.svelte`:
   - state: `isMobile`, `open` (= old `isSidePanelVisible`), resize listener,
     `toggle()`, overlay click → close, `animationService.show/hide` on the
     panel element;
   - markup: overlay, toggle button, both `top-stripes` columns, the fixed
     panel container (`left-2 sm:left-5 md:left-8`, `h-svh`, `w-px` divider),
     and the right column wrapper (`flex-1 … bg-surface-1`).
   - Props (Svelte 5 runes):
     - `open = $bindable()` (parents still need it — archive passes it to
       `SummaryDisplay`/`ConversationTranscript`);
     - `sidebar` snippet, called as `{@render sidebar({ closeOnMobile })}` where
       `closeOnMobile()` closes the drawer only when `isMobile`;
     - `children` snippet for the main column.
   - Keep the panel unmounted when closed (`{#if open}`), as today.
2. Create `src/entrypoints/archive/components/SidebarTabs.svelte`: a
   generalized `TabArchive`.
   - Props: `tabs` (`[{ id, label, icon, iconActive }]`), `activeTab`,
     `onSelectTab`.
   - Active-bar position computed from the active index (for 2 tabs over
     `w-80` this must reproduce `-translate-x-20` / `translate-x-20`; prefer an
     inline `style="transform: translateX(...)"` from index and tab count over
     hard-coded classes).
   - **No locale effect here.** Move TabArchive's `settings.uiLang → locale`
     `$effect` into `archive/App.svelte` (check `prompt/main.js` / `App.svelte`
     for an equivalent and add one there too in Phase 2 if missing).
3. Rewrite `archive/App.svelte` to use `<SidebarLayout bind:open>` with the
   existing `SidePanel` inside the `sidebar` snippet (its `selectItem` now calls
   `closeOnMobile()` instead of inline `isMobile && toggleSidePanel()`), and
   `SummaryDisplay` / `ConversationTranscript` + the bottom fade inside
   `children`. Keyboard nav, hash scrolling, data loading stay in App.
4. In `archive/SidePanel.svelte` replace `TabArchive` with `SidebarTabs`
   (history: `heroicons:clock` / `heroicons:clock-solid`; archive:
   `heroicons:archive-box` / `heroicons:archive-box-solid`; labels
   `archive.tab_history` / `archive.tab_archive`). Delete
   `archive/components/TabArchive.svelte`.

**Verify:**
- `npm test` passes (layering guard included).
- `npm run build` succeeds.
- `npm run dev`, load `.output/chrome-mv3-dev` unpacked, open the archive page:
  at desktop width the panel, tabs, active-bar animation, toggle button and
  arrow-key navigation look/behave exactly as before; at 375px width the panel
  starts closed, opens as a drawer with overlay, closes on overlay click and on
  item select. Change UI language in settings → archive tab labels update.

## Phase 2 — Move shell to `src/components/ui/` and rebuild the prompt page on it

1. `git mv` both files to `src/components/ui/SidebarLayout.svelte` and
   `src/components/ui/SidebarTabs.svelte`; update archive imports to
   `@/components/ui/…`.
2. Split the prompt page into pieces (all under `src/entrypoints/prompt/`):
   - `components/PromptList.svelte` — the two sections (Summarize / Custom
     actions) from `PromptMenu.svelte`, **without** the header or toggle.
     Restyle list rows to match `archive/components/ArchiveListItem.svelte`'s
     selected/hover look (sans font, `text-sm`), dropping the `.prompt-button`
     glow CSS if it no longer fits.
   - `components/SkillList.svelte` — keep, but remove its header, the
     `PromptViewToggle` and `onBack`. Put a full-width **"+ New skill"** button
     at the top of the list (calls `onCreate`).
   - `components/PromptEditor.svelte` — the right-column editor and enhance
     dialog moved out of `App.svelte` (props: `promptKey`, `title`; it owns
     current/initial prompt state, `loadPromptContent`, save/discard, enhance,
     template list). Exposes dirty state via a bindable `dirty` prop.
   - `components/SkillEditor.svelte` — the right column of `SkillsPage.svelte`.
   - Skill selection/draft state (`selectedId`, `creating`, `draft`,
     `baseline`, `errors`, `newSkill`, `saveSkill`, `deleteSkill`,
     `resetBuiltIn`) must be shared by `SkillList` (sidebar snippet) and
     `SkillEditor` (main snippet). Move it into
     `prompt/skillEditorState.svelte.js` (a factory returning a `$state`
     object + functions; entrypoint-local, so no layering concern) and create
     one instance in `App.svelte`.
   - Delete `PromptMenu.svelte`, `SkillsPage.svelte`,
     `components/PromptViewToggle.svelte`.
3. New `prompt/App.svelte`: keep toaster, theme, reduce-motion and
   overlay-scrollbar setup; replace the layout with
   ```
   <SidebarLayout bind:open>
     {#snippet sidebar({ closeOnMobile })}
       header: <h2>Customize</h2>   (same position/size as archive's "Summarizerrrr")
       <SidebarTabs tabs=[prompts (heroicons:document-text[-solid]),
                          skills (heroicons:sparkles[-solid])] … />
       {#if activeTab === 'prompts'} <PromptList …/> {:else} <SkillList …/> {/if}
     {/snippet}
     {#if activeTab === 'prompts'} <PromptEditor …/> {:else} <SkillEditor …/> {/if}
   </SidebarLayout>
   ```
   Selecting a prompt or skill calls `closeOnMobile()`.
4. URL state (replace the old `view` logic):
   - `?tab=prompts&promptKey=<key>` / `?tab=skills`; update with
     `history.replaceState` on tab/item change.
   - Back-compat: `?view=skills` → skills tab; bare `?promptKey=` → prompts tab.
   - No `promptKey` → select the first summarize prompt
     (`youtubeCustomPromptContent`) instead of showing an empty editor.
5. Remove `min-w-4xl`, `p-8` frame and all decorative `<span>` grid lines from
   both editors; the shell's stripes replace them. Editors fill the main column
   with responsive padding (`p-4 md:p-8`, content `max-w-4xl mx-auto`).
6. `prompt/index.html` `<title>` → `Customize`.

**Verify:**
- `npm test` passes — in particular Rule 6 now sees both shell files reachable
  from `archive/main.js` and `prompt/main.js`, and Rule 5/basename checks pass.
- `npm run build` succeeds.
- Manual (`npm run dev`):
  - Settings → Summary → each "edit prompt" link opens `prompt.html?promptKey=…`
    on the Prompts tab with that prompt selected.
  - `prompt.html?view=skills` opens the Skills tab.
  - Create, edit, pin, delete a user skill; edit + "Reset built-in" on a
    built-in skill — same results as before.
  - At 375px: no horizontal scroll, drawer opens/closes, selecting an item
    closes it, editors are usable.
  - Archive page still behaves as at the end of Phase 1.

## Phase 3 — Editor UX cleanup

Apply to both `PromptEditor.svelte` and `SkillEditor.svelte` unless noted.

1. **Sticky action bar.** New `prompt/components/EditorActionBar.svelte`
   (check basename unique): sticky at the bottom of the main column, shows
   **Discard** + **Save** only while dirty (`isPromptModified` / skill
   `isModified`), with a short "Unsaved changes" label. Reuse the existing
   button styling (bordered block + rotated corner `span`) from the current
   Save/Discard markup. Skill-only actions (Delete / Reset built-in) move to
   the editor header row, next to the Pin checkbox, not into the sticky bar.
2. **Load preset (prompts only).** Replace the `<select id="templateSelect">`
   + Import button with a `bits-ui` `DropdownMenu` button "Load preset" in the
   editor header (right of the title). Items = existing `allTemplates`. On pick:
   if dirty, `confirm()` first; then set system + user prompt (same as
   `handleImportTemplate` today). Remove `selectedTemplate` state.
3. **Hints under fields.** Move `prompts.system_note` and `prompts.user_note`
   (with the `<code>__CONTENT__</code>`) below their textareas as
   `text-xs text-text-secondary`. Do the same for the skill
   "Applied to a single turn only" hint. Keep the tab-style field labels.
4. **Improve button.** Replace the floating ✦ circle with a labelled button
   "✦ Improve" placed under the user-prompt textarea (right side of the hint
   row); keep `showEnhanceButton` gating, the existing dialog, and
   `handlePromptEnhance`.
5. **Fonts.** Remove `font-mono` from page wrappers; add `font-mono` only to
   the `<textarea>` / skill name input. Title stays `text-lg font-bold`
   (keep `TextScramble` on the title if it still reads well; drop it if it
   flickers with sans fonts).
6. **Unsaved-changes guard.** Switching prompt/skill or tab while dirty asks
   `confirm()` first (today it silently drops edits). Implement once in
   `App.svelte` using the editors' bindable `dirty`.
7. Textareas grow with available height on desktop (`flex-1 min-h-48`) and use
   a sensible min height on mobile (`min-h-[40vh]` for the user prompt).

**Verify:**
- `npm test` and `npm run build` pass.
- Manual: edit a prompt → sticky bar appears; Discard restores, Save persists
  (reload page, change survives) and the bar disappears. Load preset on a dirty
  prompt asks first. Improve button appears only after >2 words and the dialog
  still applies the result. Switching items while dirty asks to confirm.
  Same checks for a skill. Check at 1280px and 375px, light and dark theme.

## Phase 4 — i18n, docs

1. Locale keys in **all 8** files `src/lib/locales/{de,en,es,fr,ja,ko,vi,zh-CN}.json`:
   - `customize.title` ("Customize"), `customize.tabs.prompts`,
     `customize.tabs.skills`;
   - `prompts.buttons.load_preset`, `prompts.buttons.improve`,
     `prompts.unsaved_changes`, `prompts.confirm_discard`;
   - Remove `prompts.buttons.import` and `prompts.select_template` if nothing
     references them anymore (`grep -rn` first).
   Wire the new strings in place of the literals added in Phases 2–3.
2. Update `CLAUDE.md`:
   - "Where components go": `src/components` count (`ui` 6 → 8, total
     32 → 34 files) and mention `SidebarLayout` / `SidebarTabs` as the shell
     shared by archive and prompt.
   - Entrypoints list: `prompt/` → "Customize page: prompt editor + chat
     skills (tabs)".
3. Run `npm run icons:sync` (new `heroicons:*-solid` names) and commit the
   regenerated `src/lib/icons/iconBundle.js`.

**Verify:**
- `npm test`, `npm run build`, `npm run build:firefox` pass.
- Switch UI language to `vi` and `ja` in settings → Customize page title, tabs,
  Load preset, Improve, sticky bar text are translated.
- `grep -rn "PromptViewToggle\|SkillsPage\|PromptMenu\|TabArchive" src` returns
  nothing.

## Out of scope (V1)

- Translating the remaining hard-coded English strings inside the skill editor
  (Name, One-shot instruction, Pin, Built-in / User skills, error texts) beyond
  those touched above.
- List→detail push navigation on mobile; search inside prompt/skill lists.
- Any change to prompt storage keys, `skillService`, or settings schema.
- Adding new prompts, user-defined prompt slots, or import/export of prompts.
- Restyling archive content (`SummaryDisplay` etc.) beyond the shell swap.

## Final verification checklist

- [ ] `npm test` green (incl. `tests/architecture/layering.test.js`)
- [ ] `npm run build` and `npm run build:firefox` succeed
- [ ] `npm run check` shows no new errors vs. baseline
- [ ] Archive page unchanged in behavior (desktop + 375px drawer)
- [ ] Customize page: both tabs, deep links (`?promptKey=`, `?view=skills`),
      save/discard/preset/improve/skill CRUD work
- [ ] No horizontal scroll at 375px; light + dark themes OK
- [ ] All 8 locales have the new keys

## Notable files

- `src/components/ui/SidebarLayout.svelte` — **new**, shared shell (drawer,
  toggle, stripes, overlay); consumers: archive, prompt.
- `src/components/ui/SidebarTabs.svelte` — **new**, generalized two-tab bar
  (replaces `archive/components/TabArchive.svelte`).
- `src/entrypoints/archive/App.svelte`, `archive/SidePanel.svelte` — switched
  to the shared shell/tabs; locale-sync effect moved into App.
- `src/entrypoints/prompt/App.svelte` — slimmed to shell + tab/URL state.
- `src/entrypoints/prompt/components/{PromptList,PromptEditor,SkillEditor,EditorActionBar}.svelte`
  — **new**; `SkillList.svelte` simplified.
- `src/entrypoints/prompt/skillEditorState.svelte.js` — **new**, shared skill
  draft state.
- Deleted: `prompt/PromptMenu.svelte`, `prompt/SkillsPage.svelte`,
  `prompt/components/PromptViewToggle.svelte`,
  `archive/components/TabArchive.svelte`.
- `src/lib/locales/*.json`, `CLAUDE.md`, `src/lib/icons/iconBundle.js`.
