# Walkthrough - Phase 2: Retarget the inline permission request to the current site

Phase 2 of the `firefox-site-permissions-v1` plan rewrites `getRequiredPermission(url)` in
`firefoxPermissionService.js` to request a single site's origin pattern (derived from
Phase 1's `firefoxSitePermissionService.js` helpers) instead of the literal `<all_urls>`,
and removes the stale hardcoded 3-domain shortcut in `PermissionWarningPrompt.svelte` in
favor of always calling `checkPermission(url)`.

## Changes Made

### 1. Per-site permission targeting

#### [firefoxPermissionService.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/services/firefoxPermissionService.js)

- Added imports of `urlToDomain`, `domainToOriginPattern`, `originPatternToDomain`, and
  `getManifestOriginPatterns` from the sibling `firefoxSitePermissionService.js` (Phase 1).
- Added `isCoveredByManifest(domain)`: builds a `Set` of manifest-declared domains by mapping
  `getManifestOriginPatterns()` through `originPatternToDomain`, then returns `true` when
  `domain === manifestDomain || domain.endsWith('.' + manifestDomain)`. This replaces the
  hardcoded `youtube.com` / `udemy.com` / `coursera.org` / `reddit.com` / `wikipedia.org`
  string-`includes()` list that lived in `getRequiredPermission()`.
- Rewrote `getRequiredPermission(url)` to:
  1. `urlToDomain(url)` — return `null` immediately for non-`http(s)` URLs (nothing can be
     requested for those).
  2. `isCoveredByManifest(domain)` — return `null` when the site already has a static host
     permission (functionally equivalent to the old list, but now derived from the manifest
     instead of duplicated by hand — one of the four divergent copies the plan calls out).
  3. Otherwise return `domainToOriginPattern(domain)` — a single-site match pattern such as
     `*://*.news.ycombinator.com/*` — instead of the previous literal `'<all_urls>'`.
- **Signatures of `checkPermission()` and `requestPermission()` are unchanged** — both still
  call `getRequiredPermission(url)` internally and branch on `null` vs. a pattern string
  exactly as before, so no other file needed edits: this includes all six call sites in
  `src/stores/summaryStore.svelte.js` (`fetchAndSummarize`, `fetchChapterSummary`,
  `fetchCourseConcepts`, `fetchAndSummarizeStream`, `executeCustomAction`,
  `fetchCommentSummary`) and the seventh in `src/services/chat/tabMentionService.js:109-113`.

### 2. Inline warning prompt

#### [PermissionWarningPrompt.svelte](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/sidepanel/components/PermissionWarningPrompt.svelte)

- Removed the local hardcoded `isEducationalSite` check (`currentUrl.includes('youtube.com') ||
  .includes('udemy.com') || .includes('coursera.org')`), which only covered 3 of the 5
  manifest-granted domains (missing `reddit.com` and `wikipedia.org`, as the plan notes).
- The permission-check `$effect` now always falls through to the cache-then-`checkPermission(url)`
  path. `checkPermission()` already resolves to `true` immediately for manifest-covered domains
  (since `getRequiredPermission()` returns `null` for them per the Phase 2 change above), so
  behavior for YouTube/Udemy/Coursera/Reddit/Wikipedia is preserved with zero special-casing,
  and the previously-missing Reddit/Wikipedia cases are now also handled correctly for the first
  time.
- No changes to the component's props, exports, or markup — only the internal `$effect` body.

## Verification Results

### 1. Test Suite

```sh
npm test
```

Output:
```
 Test Files  61 passed (61)
      Tests  585 passed (585)
   Duration  8.38s
```

Matches the pre-phase baseline exactly (61 files / 585 tests, all green) — no new test files
were added (that's Phase 6) and no existing test imports either changed file.

### 2. Type Checks

```sh
npm run check
```

Output:
```
1656 FILES 0 ERRORS 14 WARNINGS 8 FILES_WITH_PROBLEMS
```

0 errors (matches the pre-phase baseline of 0 errors / 14 warnings). File count matches Phase
1's post-phase count (1656 — no new files added this phase). The 14 warnings are the same
pre-existing ones from the baseline (unused CSS selectors, a11y label associations, a
non-`$state` reactive update in unrelated files); none reference either file touched in this
phase.

### 3. Firefox Build

```sh
npm run build:firefox
```

Output (tail):
```
Σ Total size: 12.95 MB
✔ Finished in 15.2 s
```

Build completed with exit code 0. The only warning emitted was a pre-existing Rollup
dynamic/static dual-import notice about `src/stores/settingsStore.svelte.js` (unrelated to this
phase's files, present before this change). Confirmed the generated
`.output/firefox-mv2/manifest.json` still declares `manifest_version: 2` and
`optional_permissions: ["<all_urls>"]` unchanged — this phase makes no manifest edits, exactly
as the plan requires.

Note: running `npm run build:firefox` regenerated `.wxt/types/paths.d.ts` (a WXT-generated type
file that reflects whichever browser target was last built) as an unrelated side effect. That
file was reverted with `git checkout -- .wxt/types/paths.d.ts` after the build so this phase's
diff contains only the two files listed above.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` — 61/61 files, 585/585 tests pass (matches baseline)
- [x] `npm run check` — 0 errors, 14 warnings (matches baseline exactly; same file count as
  Phase 1's end state)
- [x] `npm run build:firefox` — succeeds, exit code 0; confirmed
  `.output/firefox-mv2/manifest.json` is untouched (`manifest_version: 2`,
  `optional_permissions: ["<all_urls>"]`)
- [x] Confirmed `checkPermission()` / `requestPermission()` signatures are unchanged and all
  seven known call sites (`summaryStore.svelte.js` x6, `tabMentionService.js` x1) require no
  edits, by reading each call site
- [x] Confirmed via code reading that `getRequiredPermission()` for a manifest-covered domain
  (e.g. `youtube.com`) still returns `null` — the same externally-observable behavior as before,
  now derived from `getManifestOriginPatterns()` instead of a hardcoded list

### Still-Required Manual Verification (To Be Done by User)

This phase's plan verify step requires a real Firefox browser session, which this agent cannot
run. Steps for the user:

- [ ] 1. Run `npm run build:firefox` (already done above; rebuild again if you want a fresh
  output folder).
- [ ] 2. Open Firefox, navigate to `about:debugging#/runtime/this-firefox`, click
  **Load Temporary Add-on…**, and select `.output/firefox-mv2/manifest.json`.
- [ ] 3. Ensure no permissions are currently granted for the test site (a fresh Firefox profile,
  or manually remove any prior grant via `about:addons` → Summarizerrrr → Permissions).
- [ ] 4. Open `https://news.ycombinator.com` (a non-privileged site with no host permission) and
  open the extension's side panel.
- [ ] 5. Trigger a summarize action. Confirm the Firefox permission dialog names **only**
  `news.ycombinator.com` (or `*.news.ycombinator.com`) — not "all websites" / "your data for all
  websites".
- [ ] 6. Accept the dialog. Confirm the summary proceeds **without requiring a tab reload**
  (per the plan: page extraction via `browser.scripting.executeScript` works immediately once
  the host permission is granted).
- [ ] 7. Confirm the load-bearing assumption the plan calls out: if a user already has
  `<all_urls>` granted (e.g. from before this change, or via the Data & Sync toggle),
  `permissions.contains({origins:['*://*.example.com/*']})` must return `true` via pattern
  subsumption, so such users are **not** re-prompted per site. This can be checked by granting
  `<all_urls>` first (via the existing Data & Sync switch) and then visiting a fresh
  non-privileged site — no permission dialog should appear.

## Known Follow-ups

- Phase 3 will teach the background worker's dynamic content-script registration
  (`registerDynamicContentScript()` / `permissions.onAdded` / `onRemoved`) about per-site grants
  — today it still only reacts to `<all_urls>` / `*://*/*`, so the FAB will not yet appear on a
  page granted only a single-site permission by this phase's flow, pending Phase 3.
- Phase 4 will add the new "Site Access" settings tab and move the `<all_urls>` switch out of
  Data & Sync; this phase does not touch `DataSyncSettings.svelte` or any settings component.
