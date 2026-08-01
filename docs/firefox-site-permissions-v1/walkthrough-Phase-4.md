# Walkthrough - Phase 4: New "Site Access" settings tab

Phase 4 of the `firefox-site-permissions-v1` plan adds a Firefox-only **Site
Access** settings tab (`SitePermissionsSettings.svelte`) that lets users
switch between "All sites" and "Selected sites only" and manage per-site
grants, wires it into `Setting.svelte` and `urlUtils.js` (tree-shaken out of
the Chrome build), deletes the old `<all_urls>` switch block from
`DataSyncSettings.svelte`, and fixes `FirefoxPermissionOverlay.svelte` so it
no longer nags Selected-sites-only users.

## Changes Made

### 1. New Site Access tab component

#### [SitePermissionsSettings.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/settings/components/SitePermissionsSettings.svelte)

**New file.** Placed under `src/entrypoints/settings/components/` (not
`src/components/`) per `CLAUDE.md` — it has exactly one consumer
(`Setting.svelte`), so Rule 6 of the architecture guard would fail if it were
placed under the shared `components/` tree. Basename is unique under `src/`.

- **State** (matches the plan's exact shape): `grantedSites = $state([])`,
  `allSites = $state(false)`, `newDomain = $state('')` (initialized to an
  empty string, not bare `$state()`, avoiding the `.trim()`-on-`undefined`
  bug the plan calls out in `FABSettings.svelte:18-19`), `errorKey =
  $state(null)`, and `mode = $derived(allSites ? 'all' : 'selected')`.
- `refreshState()` re-reads `hasAllSitesAccess()` and `listGrantedSites()`
  from Phase 1's `firefoxSitePermissionService.js`.
- An `$effect` calls `refreshState()` on mount and registers
  `browser.permissions.onAdded` / `onRemoved` listeners that also call
  `refreshState()`, with a cleanup function that removes both listeners — so
  a revocation performed externally in `about:addons` updates the list live
  without reopening the tab.
- `broadcastPermissionChange(value)` reuses the exact
  `updateFirefoxPermission('httpsPermission', value)` +
  `browser.runtime.sendMessage({ type: 'PERMISSION_CHANGED', ... })`
  try/catch pattern that used to live in `DataSyncSettings.svelte:52-89`.
- **Mode → All sites**: `grantAllSitesAccess()` then
  `broadcastPermissionChange(granted)`.
- **Mode → Selected sites only**: `revokeAllSitesAccess()` (no user gesture
  needed for `permissions.remove()`) then `broadcastPermissionChange(false)`.
- **Add domain**: validates with `isValidPermissionDomain`, dedupes against
  `grantedSites`, then `grantSite(domain)`. On denial, `newDomain` is left
  untouched and `errorKey` is set to `'settings.site_access.denied'` so an
  inline message can render; on success, `newDomain` is cleared and state is
  refreshed.
- **Remove domain**: `revokeSite(domain)` then `refreshState()`.
- **Markup**: copied the structure from `FABSettings.svelte:548-719` — the
  `ReusableSelect` mode dropdown, the `overflow-hidden … scale-75` shrink
  trick on the add-domain `<input>` (16px→12px without iOS zoom), the
  `heroicons:plus-circle-16-solid` add button, the dotted-background chip
  grid with rotated-45 corner notches, and the **blacklist** row variant
  (`<p class="flex-auto line-clamp-1">`) rather than the whitelist variant,
  per the plan's explicit instruction (whitelist fails to truncate long
  domains). `Enter` in the input also submits.
- Section-header `<label>` uses a dummy `for="site-access-settings-toggle"`
  attribute, matching the existing (non-functional but lint-satisfying)
  convention in `FABSettings.svelte`'s section headers — this avoids
  introducing a *new* `a11y_label_has_associated_control` warning (see
  Verification Results below).
- Uses `{$t('settings.site_access.…')}` keys throughout (title, description,
  `mode.all_sites`, `mode.selected_only`, `mode.aria_label`,
  `domain_input_placeholder`, `selected_helper`, `all_helper`,
  `invalid_domain`, `already_added`, `denied`) — **these keys do not exist in
  any locale file yet**; Phase 5 adds the `settings.site_access` namespace.
  Until then, `svelte-i18n` will render the raw key or a fallback for each
  string (see Known Follow-ups).

### 2. Wiring into `Setting.svelte`

#### [Setting.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/settings/components/Setting.svelte)

All 4 applicable items from the plan's "full checklist for a new settings
tab" (items 1-4; items 5-7 are in other files below):

1. Added `import SitePermissionsSettings from '@/entrypoints/settings/components/SitePermissionsSettings.svelte'`.
2. Spliced a `site-access` entry into `mainTabs`, immediately after `fab`,
   wrapped in `...(import.meta.env.BROWSER === 'firefox' ? [ … ] : [])`:
   `{ id: 'site-access', label: 'Site Access', iconSolid: 'heroicons:shield-check-solid', iconOutline: 'heroicons:shield-check' }`.
   Label is hardcoded English, matching the convention of every other entry
   in `mainTabs`/`footerTabs` (none of which are i18n keys).
3. Added `{:else if import.meta.env.BROWSER === 'firefox' && activeTab === 'site-access'} <SitePermissionsSettings />` to the render chain, immediately
   after the `fab` branch — guarded by the same env check so the branch (and
   therefore the otherwise-unreferenced import) is dead-code-eliminated for
   the Chrome build.
4. Added `'heroicons:shield-check-solid'` and `'heroicons:shield-check'` to
   the `loadIcons([...])` preload call.

### 3. `VALID_TABS`

#### [urlUtils.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/utils/urlUtils.js)

Item 5 of the checklist: added `'site-access'` to `VALID_TABS` conditionally
— `...(import.meta.env.BROWSER === 'firefox' ? ['site-access'] : [])` —
spliced in after `'fab'`. On the Chrome build this array does not contain
`'site-access'`, so `getTabFromURL()` falls back to `DEFAULT_TAB`
(`'ai-provider'`) for a `?tab=site-access` URL, matching the plan's
Chrome-regression requirement and avoiding the "valid tab that matches no
`{:else if}` branch" blank-content-area bug the plan warns about.

### 4. Deleting the old permission block

#### [DataSyncSettings.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/settings/components/DataSyncSettings.svelte)

Item 6 of the checklist (previously the largest remaining risk in this
phase). Deleted:

- The `updateFirefoxPermission` / `getFirefoxPermission` / `getCachedPermission`
  imports from `settingsStore.svelte.js`.
- The `checkSpecificPermission` / `requestSpecificPermission` /
  `removeSpecificPermission` imports from `firefoxPermissionService.js`.
- The `browser` import from `wxt/browser` (no longer used anywhere in this
  file) and the `SwitchPermission` import (still used by `ExportImport.svelte`,
  confirmed via `grep` — the component itself was **not** touched or
  deleted).
- All permission state (`httpsPermission`, `hasInitialized`), the
  `loadPermissionStates()` / `handleHttpsPermission()` functions, and the
  `$effect` that called `loadPermissionStates()` on the Firefox build.
- The `{#if import.meta.env.BROWSER === 'firefox'}` markup block rendering
  the `permissionWarning.*`-labelled `SwitchPermission` toggle.
- The now-unused `import { t } from 'svelte-i18n'` (no `$t(...)` call remains
  in this file).

`CloudSyncToolSettings` and `ExportImport` — both the imports and their
markup — were left untouched, per the plan. This also disposes of the latent
`loadPermissionStates` bug the plan calls out (`hasInitialized = true` sat
inside the non-cached branch, so the cached early-return never initialized
it) simply by deleting the whole code path.

**Kept, per the plan's explicit instruction:**
`settings.firefoxPermissions.httpsPermission` and `updateFirefoxPermission()`
remain in `src/stores/settingsStore.svelte.js` — unedited this phase — since
both `FirefoxPermissionOverlay.svelte` and the sidepanel's
`PermissionWarningPrompt.svelte` still read them.

### 5. Small fix while in the area

#### [FirefoxPermissionOverlay.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/settings/components/FirefoxPermissionOverlay.svelte)

- Added an import of `listGrantedSites` from
  `firefoxSitePermissionService.js`.
- Added `hasPerSiteGrants = $state(false)` and `refreshPerSiteGrants()`,
  which sets it from `(await listGrantedSites()).length > 0`.
- Wrapped a new `$effect` (Firefox-only, matching the existing
  `if (import.meta.env.BROWSER === 'firefox') { $effect(...) }` idiom already
  used lower in this file) that calls `refreshPerSiteGrants()` on mount and
  registers `browser.permissions.onAdded`/`onRemoved` listeners (with
  cleanup) so the flag stays live if grants change while the overlay is
  mounted.
- Changed the render guard from
  `{#if import.meta.env.BROWSER === 'firefox' && !httpsPermission && isTouchDevice()}`
  to
  `{#if import.meta.env.BROWSER === 'firefox' && !httpsPermission && !hasPerSiteGrants && isTouchDevice()}`
  — so a Firefox Android user who deliberately chose "Selected sites only"
  and has at least one per-site grant no longer sees the "Access your data
  for all URLs" nag sheet.

## Verification Results

### 1. Test Suite

```sh
npm test
```

Output:
```
 Test Files  61 passed (61)
      Tests  585 passed (585)
   Duration  8.17s
```

Matches the pre-phase baseline exactly (61 files / 585 tests, all green).
No test file references `SitePermissionsSettings`, `DataSyncSettings`,
`FirefoxPermissionOverlay`, `Setting.svelte`, or `urlUtils.js`'s `VALID_TABS`,
so this phase changes no test outcomes (formal component/service tests are
out of this phase's scope — Phase 6 covers `firefoxSitePermissionService.js`'s
pure helpers only).

### 2. Type Checks

```sh
npm run check
```

Output (before the `for="site-access-settings-toggle"` fix below):
```
1657 FILES 0 ERRORS 14 WARNINGS 8 FILES_WITH_PROBLEMS
```

This first run showed the same warning *count* as baseline (14) but a
**different composition**: deleting the `SwitchPermission` markup block from
`DataSyncSettings.svelte` removed one pre-existing
`a11y_label_has_associated_control` warning, while the new
`SitePermissionsSettings.svelte` section header introduced a fresh one at
line 126 (a `<label>` with no `for` and no wrapped control) — net zero
change in count, but a genuinely new warning source. Rather than accept a
new warning under cover of an unchanged total, added a dummy
`for="site-access-settings-toggle"` attribute to that label (mirroring the
exact non-functional-but-lint-satisfying pattern already used by every
section header in `FABSettings.svelte`, e.g. `for="fab-settings-toggle"`).
Re-ran:

```sh
npm run check
```

Output:
```
1657 FILES 0 ERRORS 13 WARNINGS 7 FILES_WITH_PROBLEMS
```

0 errors — **better than** the pre-phase baseline of 0 errors / 14 warnings /
8 files-with-problems (13 warnings / 7 files), because the deleted
`DataSyncSettings.svelte` permission block removed one pre-existing warning
and the new component introduces none. Per the run instructions, "anything
at or better than baseline is green" — no pre-existing warnings were touched
beyond the one that was structurally deleted along with its markup.

### 3. Firefox Build

```sh
npm run build:firefox
```

Output (tail):
```
Σ Total size: 12.96 MB
✔ Finished in 15.2 s
```

Build succeeded, exit code 0. Confirmed via a small Python snippet that
`.output/firefox-mv2/manifest.json` still declares:
```
manifest_version: 2
optional_permissions: ['<all_urls>']
```
— unchanged, as required (this phase does not touch `wxt.config.ts`).
Confirmed `.output/firefox-mv2/chunks/Setting-nPQ0o43Q.js` (the settings
bundle) contains the Site Access code (`grep -l SitePermissionsSettings`
matched it).

### 4. Chrome Build (tree-shaking check)

```sh
npm run build
```

Output (tail):
```
Σ Total size: 12.94 MB
✔ Finished in 15.7 s
```

Build succeeded, exit code 0. Ran:

```sh
grep -rl "site-access\|Site Access\|SitePermissionsSettings" .output/chrome-mv3/
```

Output: no matches (empty, exit code 1) — confirming `SitePermissionsSettings`,
the `'site-access'` tab id/string, and the `"Site Access"` label are fully
absent from the Chrome bundle. The `import.meta.env.BROWSER === 'firefox'`
guards around the `mainTabs` splice, the render branch, and `VALID_TABS`
were all sufficient for Rollup/Vite's dead-code elimination to also drop the
now-unreferenced `SitePermissionsSettings` import in `Setting.svelte`.

As in prior phases, both builds regenerated `.wxt/types/paths.d.ts` (a
WXT-generated type file reflecting the last-built browser target) as an
unrelated side effect; it was reverted with `git checkout -- .wxt/types/paths.d.ts`
after both builds so this phase's diff contains only the files listed above.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` — 61/61 files, 585/585 tests pass (matches baseline)
- [x] `npm run check` — 0 errors, 13 warnings, 7 files-with-problems (better
  than the 0-error/14-warning/8-file baseline; no pre-existing warning was
  "fixed" other than the one whose markup was structurally deleted)
- [x] `npm run build:firefox` — succeeds, exit code 0; confirmed
  `.output/firefox-mv2/manifest.json` is untouched (`manifest_version: 2`,
  `optional_permissions: ["<all_urls>"]`); confirmed the Site Access code is
  present in the Firefox settings bundle
- [x] `npm run build` (Chrome) — succeeds, exit code 0; confirmed via `grep`
  across `.output/chrome-mv3/` that `SitePermissionsSettings`, `site-access`,
  and `"Site Access"` are completely absent — the tab is tree-shaken out
- [x] Confirmed via `grep` that `SwitchPermission` (the component file
  itself) is still imported by `ExportImport.svelte`, so removing its import
  from `DataSyncSettings.svelte` does not orphan the component
- [x] Confirmed via `grep` that `permissionWarning.*` i18n keys are still
  referenced by `PermissionWarningPrompt.svelte` in the sidepanel, so leaving
  that namespace alone (per the plan's "Out of scope" note) does not orphan
  it
- [x] Confirmed via `grep` that `checkSpecificPermission` /
  `requestSpecificPermission` / `removeSpecificPermission` remain used
  elsewhere (`FirefoxPermissionOverlay.svelte` still calls
  `requestSpecificPermission`), so `firefoxPermissionService.js` itself did
  not need any edit this phase
- [x] Confirmed by reading the final files that all 7 checklist items are
  present: `Setting.svelte` import (1), Firefox-only `mainTabs` splice (2),
  Firefox-only render branch (3), icon preloads (4), Firefox-only
  `VALID_TABS` splice (5), the `DataSyncSettings.svelte` deletion (6), and
  the `FirefoxPermissionOverlay.svelte` per-site-grants gate (7's "small fix")

### Still-Required Manual Verification (To Be Done by User)

This phase's plan verify step requires a real Firefox browser session
(permission prompts, `about:addons`, and a bits-ui `Select` user-gesture
check), which this agent cannot run. Steps for the user:

- [ ] 1. Run `npm run build:firefox` (already done above; rebuild again for
  a fresh output folder if needed).
- [ ] 2. Open Firefox, navigate to `about:debugging#/runtime/this-firefox`,
  click **Load Temporary Add-on…**, and select
  `.output/firefox-mv2/manifest.json`.
- [ ] 3. Open the extension's Settings page. Confirm the **Site Access** tab
  appears in the sidebar immediately after **FAB**, and that the
  **Data & Sync** tab now shows no permission UI at all (only Cloud Sync
  tools and Export/Import).
- [ ] 4. **bits-ui `Select` user-gesture risk (Final verification checklist
  item, flagged in the plan as the main risk):** with no permissions
  granted, open Site Access and switch the dropdown to **All sites**.
  Confirm Firefox actually shows the native permission prompt for
  `<all_urls>` (i.e. selecting the item via `onValueChangeCallback` preserved
  user activation). If the prompt is **silently suppressed** instead, per
  the plan's fallback: replace the "All sites" selection path with the
  existing `src/entrypoints/settings/components/inputs/SwitchPermission.svelte`
  (a plain click handler) while keeping the dropdown for display purposes —
  this was **not** pre-emptively implemented in this phase since it is only
  needed if the risk materializes.
- [ ] 5. Type `news.ycombinator.com` into the add-domain input and press the
  `+` button (or Enter). Confirm Firefox prompts for that domain only, and
  a chip for `news.ycombinator.com` appears in the grid after accepting.
- [ ] 6. Remove that permission via `about:addons` → Summarizerrrr →
  Permissions (uncheck the per-site entry). Confirm the chip disappears from
  the Site Access tab **without reopening the tab** (the
  `permissions.onRemoved` listener should trigger a live refresh).
- [ ] 7. Switch the dropdown to **All sites** (accept the prompt from step 4
  if not already granted). Confirm the per-site chip grid is replaced by the
  "All sites" helper panel. Switch back to **Selected sites only**. Confirm
  in `about:addons` that `<all_urls>` was revoked, and that the granted-site
  list (if any per-site grants exist) reappears.
- [ ] 8. Type an invalid domain (e.g. `google.*` or a string with a space)
  and press `+`. Confirm an inline error message renders (currently the raw
  i18n key `settings.site_access.invalid_domain`, since Phase 5 has not
  landed yet — see Known Follow-ups) rather than silently failing.
- [ ] 9. Type a domain that's already in the granted list and press `+`.
  Confirm the `already_added` inline message path is hit (no duplicate
  network permission request).
- [ ] 10. **Firefox Android** (`npm run android`): with **Selected sites
  only** mode and at least one per-site grant, confirm the
  `FirefoxPermissionOverlay` bottom sheet does **not** appear (the "Small
  fix while in the area" from this phase). With zero grants in Selected mode,
  confirm it **does** still appear (regression check for the added
  `!hasPerSiteGrants` condition).
- [ ] 11. **Chrome regression** (already build-verified above, but worth a
  quick manual pass): load `.output/chrome-mv3` in `chrome://extensions`,
  open Settings, confirm there is no Site Access tab, and that navigating to
  `?tab=site-access` directly falls back to the default `AI Provider` tab
  content rather than a blank area.

## Known Follow-ups

- **Phase 5 dependency (expected, not a defect):** `SitePermissionsSettings.svelte`
  references `settings.site_access.title`, `.description`, `.mode.all_sites`,
  `.mode.selected_only`, `.mode.aria_label`, `.domain_input_placeholder`,
  `.selected_helper`, `.all_helper`, `.invalid_domain`, `.already_added`, and
  `.denied` via `$t(...)`. None of these keys exist in any locale file yet —
  per this phase's instructions, locale files are explicitly Phase 5's job
  and were not touched here. Until Phase 5 lands, `svelte-i18n` will render
  these as missing-key fallbacks (typically the raw key string) rather than
  human-readable text; this is expected and does not indicate a Phase 4 bug.
- Phase 5 will also need to leave `permissionWarning.*` alone, per the plan
  — confirmed still in active use by the sidepanel prompt (see Verification
  Results above).
- Phase 6 will add `tests/settings/firefoxSitePermissionService.test.js`;
  this phase adds no test coverage for the new Svelte component itself (out
  of scope — the plan's Phase 6 only covers the Phase 1 service's pure
  helpers).
- The bits-ui `Select` user-gesture risk called out in the plan's Final
  verification checklist (item 4 in the manual-verification list above) is
  the single highest-risk unverified behavior in this phase. If it fails in
  manual testing, the plan's own fallback (swap in `SwitchPermission.svelte`
  for the all-sites grant path) is the prescribed fix — deliberately not
  pre-built here since the plan frames it as a conditional fallback, not a
  default implementation.
