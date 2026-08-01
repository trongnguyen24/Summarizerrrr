# Walkthrough - Phase 3: Background: register content scripts for granted origins

Phase 3 of the `firefox-site-permissions-v1` plan replaces the background
worker's `<all_urls>`-only dynamic content-script registration with a
`syncDynamicContentScripts()` function that recomputes `matches` from the
current permission grants (all-sites or per-site), and wires it into the
`permissions.onAdded` / `onRemoved` listeners and worker startup so per-site
grants make the FAB content script appear, not just `<all_urls>`.

## Changes Made

### 1. Background worker dynamic content-script registration

#### [src/entrypoints/background/index.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/entrypoints/background/index.js)

- Added an import of `ALL_URLS`, `hasAllSitesAccess`, `listGrantedSites`, and
  `domainToOriginPattern` from Phase 1's
  `src/services/firefoxSitePermissionService.js`.
- Replaced `registerDynamicContentScript()` with `syncDynamicContentScripts()`:
  - Computes `matches`: `[ALL_URLS]` if `hasAllSitesAccess()` resolves `true`;
    otherwise the granted per-site domains from `listGrantedSites()`, each
    mapped through `domainToOriginPattern()` into a match pattern (and
    `null`s filtered out); otherwise `[]`.
  - If `matches` is empty, calls the existing `unregisterDynamicContentScript()`
    and returns — no content script should be registered when nothing is
    granted.
  - Otherwise **unregisters, then registers** under the existing
    `DYNAMIC_SCRIPT_ID`, preserving the current `excludeMatches` (the 5
    statically-scripted domains), `runAt: 'document_end'`, and
    `persistAcrossSessions: true` — only the `matches` array is now computed
    live instead of hardcoded to `['<all_urls>']`.
  - Removed the old early-return that checked
    `getRegisteredContentScripts({ ids: [DYNAMIC_SCRIPT_ID] })` and bailed if
    something was already registered — the whole point of this function is to
    refresh `matches` on every call, so a stale registration must never be
    left in place.
  - Unregister-then-register (rather than `browser.scripting.updateContentScripts()`)
    is used per the plan, since `updateContentScripts()` has been historically
    unreliable in Firefox for `matches` changes, and this path also naturally
    covers the "not currently registered" state after a worker restart
    (`unregisterDynamicContentScript()` already swallows the "wasn't
    registered" error).
- `permissions.onAdded` listener: dropped the `o === '<all_urls>' || o === '*://*/*'`
  filter; now calls `syncDynamicContentScripts()` whenever `permissions.origins?.length`
  is truthy, so a single-site grant triggers a resync too.
- `permissions.onRemoved` listener: same change — any origin removal (not
  just `<all_urls>`) triggers `syncDynamicContentScripts()`.
- Worker startup: replaced the
  `browser.permissions.contains({ origins: ['<all_urls>'] }).then(...)` check
  (which only ever called `registerDynamicContentScript()` for all-sites
  access) with a direct call to `syncDynamicContentScripts()`, which now
  handles the all-sites, per-site, and no-grant cases itself.

No changes were made to `src/entrypoints/content/main.js` (the plan states
none are needed — its `CHECK_FIREFOX_PERMISSION` round-trip already resolves
through `checkPermission()`, made per-site in Phase 2) or to `wxt.config.ts`
(deliberately unchanged per the plan).

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
`tests/background/messageRouter.test.js` (which does not touch the dynamic
content-script logic) is included in this run and passes. No test files
reference `registerDynamicContentScript` / `syncDynamicContentScripts` /
`DYNAMIC_SCRIPT_ID` (confirmed via `grep -rn` across `src` and `tests`
beforehand), so this phase changes no test outcomes — formal coverage for
this area, if any, is out of this phase's scope.

### 2. Type Checks

```sh
npm run check
```

Output:
```
1656 FILES 0 ERRORS 14 WARNINGS 8 FILES_WITH_PROBLEMS
```

0 errors (matches the pre-phase baseline of 0 errors / 14 warnings). File
count matches Phase 2's post-phase count (1656 — no new files added this
phase, only an edit to the existing `background/index.js`). The 14 warnings
are the same pre-existing ones from the baseline (unused CSS selectors, a11y
label associations, a non-`$state` reactive update in unrelated files); none
reference `background/index.js`.

### 3. Firefox Build

```sh
npm run build:firefox
```

Output (tail):
```
Σ Total size: 12.95 MB
✔ Finished in 15.4 s
```

Build completed with exit code 0. Confirmed the generated
`.output/firefox-mv2/manifest.json` still declares `manifest_version: 2` and
`optional_permissions: ["<all_urls>"]` unchanged (parsed via a small Python
snippet):

```
manifest_version: 2
optional_permissions: ['<all_urls>']
```

As in Phase 2, running the build regenerated `.wxt/types/paths.d.ts` (a
WXT-generated type file reflecting the last-built browser target) as an
unrelated side effect; it was reverted with `git checkout -- .wxt/types/paths.d.ts`
afterward so this phase's diff contains only `src/entrypoints/background/index.js`.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` — 61/61 files, 585/585 tests pass (matches baseline);
  `tests/background/messageRouter.test.js` included and passing
- [x] `npm run check` — 0 errors, 14 warnings (matches baseline exactly; same
  file count as Phase 2's end state)
- [x] `npm run build:firefox` — succeeds, exit code 0; confirmed
  `.output/firefox-mv2/manifest.json` is untouched (`manifest_version: 2`,
  `optional_permissions: ["<all_urls>"]`)
- [x] Confirmed via `grep -rn` that no other file (component, handler, or
  test) references `registerDynamicContentScript`, so replacing it entirely
  with `syncDynamicContentScripts()` has no other call sites to update
- [x] Confirmed by reading the final file that all three wiring points named
  in the plan (`permissions.onAdded`, `permissions.onRemoved`, worker
  startup) call `syncDynamicContentScripts()`, and that the old
  already-registered early-return was removed

### Still-Required Manual Verification (To Be Done by User)

This phase's plan verify step requires a real Firefox browser session with
the `browser.scripting` API, which this agent cannot run. Steps for the user:

- [ ] 1. Run `npm run build:firefox` (already done above; rebuild again for a
  fresh output folder if needed).
- [ ] 2. Open Firefox, navigate to `about:debugging#/runtime/this-firefox`,
  click **Load Temporary Add-on…**, and select
  `.output/firefox-mv2/manifest.json`.
- [ ] 3. Ensure no permissions are currently granted for the test site (fresh
  profile, or remove any prior grant via `about:addons` → Summarizerrrr →
  Permissions).
- [ ] 4. Grant exactly one site — either via the Phase 2 inline summarize
  flow on a non-privileged site (e.g. `https://news.ycombinator.com`), or via
  `about:addons` → Summarizerrrr → Permissions → adding the site manually if
  the UI supports it at this point in the plan.
- [ ] 5. **Reload that granted page.** Confirm the FAB (floating action
  button) now appears — it only appears on the next navigation after a grant,
  per the plan's "declarative content script" note.
- [ ] 6. Navigate to a **different, ungranted** non-privileged site. Confirm
  the FAB does **not** appear there.
- [ ] 7. Open the background service worker's console (from
  `about:debugging#/runtime/this-firefox`, click **Inspect** next to the
  extension) and run:
  ```js
  await browser.scripting.getRegisteredContentScripts()
  ```
  Confirm the returned entry for `dynamic-content-script` has `matches`
  containing the granted origin's per-site pattern (e.g.
  `*://*.news.ycombinator.com/*`) — **not** `<all_urls>`.
- [ ] 8. (Optional, cross-checks Phase 1/2 assumptions.) Grant **All sites**
  access instead (via whatever surface currently exposes it — the Data & Sync
  toggle, since Phase 4's dedicated Site Access tab hasn't landed yet) and
  re-run step 7: `matches` should now show `['<all_urls>']`, and the FAB
  should appear on any site after reload.
- [ ] 9. Revoke the granted site's permission via `about:addons` →
  Summarizerrrr → Permissions, then reload that page again. Confirm the FAB
  no longer appears (the `permissions.onRemoved` listener should have fired
  `syncDynamicContentScripts()` and unregistered the script, or narrowed
  `matches` to exclude that site if another grant remains).

## Known Follow-ups

- Phase 4 will add the "Site Access" settings tab (mode dropdown, add/remove
  chips) that gives users a UI to grant/revoke per-site access outside of the
  inline summarize-prompt flow and `about:addons`; this phase only makes the
  background worker's FAB registration *react correctly* to whatever grants
  already exist.
- Phase 4 also deletes the Firefox permission block from
  `DataSyncSettings.svelte`; this phase does not touch that file.
- Manual Firefox verification of the FAB appearing/disappearing per grant
  (listed above) is still required — this agent has no way to run a real
  browser session with the `browser.scripting` API.
