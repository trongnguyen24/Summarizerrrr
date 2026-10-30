# Walkthrough - Phase 5: i18n

Phase 5 of the `firefox-site-permissions-v1` plan adds the `settings.site_access`
i18n namespace to all 8 locale files so that Phase 4's
`SitePermissionsSettings.svelte` — which already calls `$t('settings.site_access.…')`
throughout — renders translated strings instead of raw keys or fallback text.

## Changes Made

### 1. Confirming the exact key set the component needs

Before touching any locale file, grepped
`src/entrypoints/settings/components/SitePermissionsSettings.svelte` for every
`settings.site_access.*` reference to avoid relying solely on the plan's
illustrative JSON sketch:

```sh
grep -o "settings\.site_access\.[a-zA-Z_.]*" src/entrypoints/settings/components/SitePermissionsSettings.svelte | sort -u
```

Output:
```
settings.site_access.all_helper
settings.site_access.already_added
settings.site_access.denied
settings.site_access.description
settings.site_access.domain_input_placeholder
settings.site_access.invalid_domain
settings.site_access.mode.all_sites
settings.site_access.mode.aria_label
settings.site_access.mode.selected_only
settings.site_access.selected_helper
settings.site_access.title
```

This matches the plan's Phase 5 sketch exactly (11 leaf keys, 3 of them
nested under `mode`), so no extra or missing keys were needed and
`SitePermissionsSettings.svelte` itself required **no edit** in this phase.

### 2. New `settings.site_access` namespace in all 8 locale files

#### [en.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/en.json)
#### [vi.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/vi.json)
#### [es.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/es.json)
#### [zh-CN.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/zh-CN.json)
#### [de.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/de.json)
#### [fr.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/fr.json)
#### [ja.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/ja.json)
#### [ko.json](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/lib/locales/ko.json)

- Inserted a `"site_access": { ... }` block into `settings` in every file,
  placed immediately before `"ai_model"` (i.e. right after `"fab"`, mirroring
  the tab order in `Setting.svelte`'s `mainTabs`, where `site-access` sits
  right after `fab`). Pure insertion in every file — `git diff` shows only
  `+` lines, no existing key was touched or reordered.
- Each file's translations were written to match that file's own existing
  tone and terminology, using two real neighbors as the style reference
  rather than a fresh translation from scratch:
  - `settings.fab.domain_control` / `domain_input_placeholder` /
    `domain_whitelist_helper` / `domain_all_helper` — the closest structural
    analog already in each file (a domain-mode select + helper text pattern).
  - The top-level `permissionWarning.*` namespace — for permission/access
    terminology consistency (e.g. Vietnamese "quyền truy cập", German
    "Berechtigung", Japanese "権限", Korean "권한", Chinese "权限").
  - `domain_input_placeholder` uses the plan's literal `"example.com"` in
    every locale (URLs/domains aren't translated, matching how `fab`'s
    analogous placeholder keeps `example.com` untranslated across all 8
    files).
- Key structure matches the plan's sketch exactly: `title`, `description`,
  `mode.all_sites`, `mode.selected_only`, `mode.aria_label`,
  `domain_input_placeholder`, `selected_helper`, `all_helper`,
  `invalid_domain`, `already_added`, `denied` — present, identically named
  and nested, in all 8 files.
- The existing top-level `permissionWarning.*` namespace was left completely
  untouched, per the plan's explicit instruction (its description still
  correctly lists "YouTube, Udemy, Coursera, Reddit, and Wikipedia" for the
  sidepanel prompt) — confirmed via `git diff` showing zero changes outside
  the new `site_access` blocks.

No edit was needed to `SitePermissionsSettings.svelte`, `Setting.svelte`, or
any other component file in this phase.

## Verification Results

### 1. Locale-file JSON validity and key-parity (custom script)

The plan has no built-in check for "are all 8 locale files valid JSON with an
identical key set," so a throwaway Node script was written under the
scratchpad directory (not committed to the repo) to verify this directly,
per the run instructions:

```sh
node /private/tmp/claude-501/-Users-nguyenle-Documents-GitHub-Summarizerrrr/dde714a4-61ba-4f1e-8b2b-2c4c320c3b56/scratchpad/verify-i18n.js
```

Output:
```
Keys referenced by SitePermissionsSettings.svelte:
  settings.site_access.all_helper
  settings.site_access.already_added
  settings.site_access.denied
  settings.site_access.description
  settings.site_access.domain_input_placeholder
  settings.site_access.invalid_domain
  settings.site_access.mode.all_sites
  settings.site_access.mode.aria_label
  settings.site_access.mode.selected_only
  settings.site_access.selected_helper
  settings.site_access.title

[OK] en.json is valid JSON
[OK] vi.json is valid JSON
[OK] es.json is valid JSON
[OK] zh-CN.json is valid JSON
[OK] de.json is valid JSON
[OK] fr.json is valid JSON
[OK] ja.json is valid JSON
[OK] ko.json is valid JSON

[OK] All 8 locales have an identical settings.site_access key set.

[OK] Every settings.site_access.* key referenced by the component exists in all 8 locales.

RESULT: PASS
```

The script (a) `JSON.parse`s each of the 8 locale files, (b) flattens
`settings.site_access` into dotted leaf keys per locale and diffs every
locale's set against `en`'s, and (c) checks that every
`settings.site_access.*` key the component actually references (grepped
live from the `.svelte` source, not hardcoded) exists in all 8 sets. All
three checks passed.

### 2. Test Suite

```sh
npm test
```

Output:
```
 Test Files  61 passed (61)
      Tests  585 passed (585)
   Duration  8.09s
```

Matches the pre-phase baseline exactly (61 files / 585 tests, all green). No
test file references locale JSON content directly, so this phase changes no
test outcomes.

### 3. Type Checks

```sh
npm run check
```

Output:
```
1657 FILES 0 ERRORS 13 WARNINGS 7 FILES_WITH_PROBLEMS
```

0 errors, 13 warnings — identical to the state Phase 4 left the tree in
(better than the original pre-feature baseline of 0 errors / 14 warnings / 8
files-with-problems). `svelte-check` does not lint JSON locale files, so
this phase's changes could not introduce a new warning here, and did not.

### 4. Firefox Build

```sh
npm run build:firefox
```

Output (tail):
```
Σ Total size: 12.97 MB
✔ Finished in 14.9 s
```

Build succeeded, exit code 0. Confirmed the new namespace is present, fully
populated, and correctly localized in the built per-locale chunks (values
are Unicode-escaped by the minifier, so verified by extracting the raw
`site_access` object rather than grepping literal non-ASCII substrings):

```sh
grep -o '"site_access":{[^}]*}[^}]*}[^}]*}' .output/firefox-mv2/chunks/en-wfw6NBkD.js
```

Output:
```
"site_access":{"title":"Site Access","description":"Control which websites Summarizerrrr can access.","mode":{"all_sites":"All sites","selected_only":"Selected sites only","aria_label":"Select site access mode"},"domain_input_placeholder":"example.com","selected_helper":"Summarizerrrr can access data on the sites listed above.","all_helper":"Summarizerrrr can access data on all websites.","invalid_domain":"Enter a valid domain, e.g. example.com or *.example.com.","already_added":"This domain has already been added.","denied":"Permission for this site was denied."}
```

```sh
grep -o '"site_access":{.\{0,400\}' .output/firefox-mv2/chunks/vi-B6YLuX7H.js
```

Output (Unicode-escaped Vietnamese, decodes to "Quyền truy cập trang web" /
"Kiểm soát trang web mà Summarizerrrr được phép truy cập." / etc.):
```
"site_access":{"title":"Quyền truy cập trang web","description":"Kiểm so\xE1t trang web m\xE0 Summarizerrrr được ph\xE9p truy cập.","mode":{"all_sites":"Tất cả trang web","selected_only":"Chỉ trang web đ\xE3 chọn","aria_label":"Chọn chế độ quyền truy cập trang web"},"domain_input_placeholder":"example.com","selected_helper"...
```

All 8 per-locale chunks (`en`, `vi`, `es`, `zh-CN`, `de`, `fr`, `ja`, `ko`)
were confirmed present under `.output/firefox-mv2/chunks/` and each contains
a `site_access` key.

As in prior phases, the build regenerated `.wxt/types/paths.d.ts` (a
WXT-generated type file reflecting the last-built browser target) as an
unrelated side effect; it was reverted with
`git checkout -- .wxt/types/paths.d.ts` afterward so this phase's diff
contains only the 8 locale files.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] All 8 locale files (`en`, `vi`, `es`, `zh-CN`, `de`, `fr`, `ja`, `ko`)
  are valid JSON (verified via `JSON.parse` in a scratchpad Node script).
- [x] The `settings.site_access` key set is byte-for-byte identical (same
  leaf keys, same nesting) across all 8 locale files.
- [x] Every `settings.site_access.*` key `SitePermissionsSettings.svelte`
  actually references (grepped live from source) exists in all 8 locales —
  no missing key, in any locale.
- [x] No English placeholder text was left in any non-English locale file —
  each locale's strings were hand-written in that language, matching the
  tone of that file's existing `settings.fab` and `permissionWarning`
  strings.
- [x] The existing `permissionWarning.*` namespace is untouched in every
  file (confirmed via `git diff`: all 8 locale diffs are pure additions, no
  `-` lines).
- [x] `npm test` — 61/61 files, 585/585 tests pass (matches baseline).
- [x] `npm run check` — 0 errors, 13 warnings, 7 files-with-problems (same
  as Phase 4 left it; better than the original 14-warning baseline).
- [x] `npm run build:firefox` — succeeds, exit code 0; confirmed the fully
  translated `site_access` object is present in every one of the 8
  per-locale build chunks.
- [x] No new file was created other than this walkthrough and the
  scratchpad verification script (which lives outside the repo).

### Still-Required Manual Verification (To Be Done by User)

The plan's own Phase 5 verify step requires a real browser session with a
live language switcher and visual/console inspection, which this agent
cannot perform:

- [ ] 1. Run `npm run build:firefox` (already done above; rebuild again for
  a fresh output folder if needed) and load `.output/firefox-mv2/manifest.json`
  as a temporary add-on in Firefox (`about:debugging#/runtime/this-firefox`).
- [ ] 2. Open the extension's Settings page and switch to the **Site
  Access** tab.
- [ ] 3. In the extension's language/appearance setting, switch the UI
  language to **Vietnamese**. Confirm every string on the Site Access tab
  (title, description, mode dropdown options, the ARIA label announced by a
  screen reader on the select, the domain-input placeholder text, the
  selected/all helper text under the grid, and — by triggering an invalid
  domain and a duplicate domain — the `invalid_domain` / `already_added`
  inline error messages) renders in Vietnamese with no raw
  `settings.site_access.…` key strings leaking through.
- [ ] 4. Repeat step 3 for **one CJK locale** (e.g. Japanese or Korean) and
  confirm the same — including that CJK glyphs render correctly (no tofu /
  mojibake) in the mode dropdown, helper text, and error messages.
- [ ] 5. Switch back to **English** and re-confirm the tab still renders
  correctly (regression check that the language switch doesn't leave stale
  state).
- [ ] 6. With DevTools open on the Settings page in each of the three
  languages tested above, check the console for `svelte-i18n` "missing
  message" / fallback warnings while the Site Access tab is open — there
  should be none.
- [ ] 7. Trigger the `denied` error path (deny a per-site permission
  prompt) in at least one non-English locale and confirm that message is
  also translated, not just the three paths reachable without a live
  permission prompt.
