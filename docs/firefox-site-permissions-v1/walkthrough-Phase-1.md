# Walkthrough - Phase 1: New service: `firefoxSitePermissionService.js`

Phase 1 of the `firefox-site-permissions-v1` plan adds a new, store-free
service that turns a URL or domain into WebExtension origin match patterns
and wraps the `browser.permissions` API for per-site grants on Firefox. It
introduces no behavior change yet — nothing calls this service until Phase 2
and later.

## Changes Made

### 1. New service

#### [firefoxSitePermissionService.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/src/services/firefoxSitePermissionService.js)

Created with a pure-helper / browser-wrapper split, as required by the plan
(this repo has no global `browser` mock — see `tests/setup/vitest.js` — so
testability depends on the pure functions taking plain data).

**Pure helpers** (no `browser` access):
- `ALL_URLS` — the literal `'<all_urls>'` optional-permission origin.
- `urlToDomain(url)` — lowercase hostname via `new URL()`, `www.` stripped,
  port dropped (the `URL` object already excludes it). Returns `null` for
  non-`http(s)` schemes (`about:`, `file:`, `moz-extension:`) and for
  unparsable input.
- `domainToOriginPattern(domain)` — `example.com` → `*://*.example.com/*`.
  Handles the two required edge cases: an IPv4/IPv6 literal or a
  single-label host (`localhost`) emits `*://<host>/*` instead of
  `*://*.<host>/*` (a `*.` prefix before an IP literal or single-label host
  is an illegal WebExtension match pattern). An already-wildcarded input
  (`*.example.com`) is normalized rather than double-wildcarded.
- `originPatternToDomain(pattern)` — reverses the above: strips the scheme,
  the path, and a leading `*.`. Ports are preserved (not stripped), since
  manifest patterns such as `http://localhost:11434/*` need host:port
  compared verbatim in `subtractManifestOrigins`.
- `isValidPermissionDomain(domain)` — accepts a plain domain or a `*.domain`
  wildcard only; rejects `google.*`-style patterns, empty/leading/trailing
  dot segments, and whitespace. Deliberately **not** shared with
  `isValidDomainPattern` in `FABSettings.svelte:41-57`, which legally accepts
  patterns that are not valid WebExtension origins.
- `subtractManifestOrigins(grantedOrigins, manifestOrigins)` — compares
  **normalized domains**, not raw pattern strings, so API hosts
  (`api.openai.com`, `localhost:11434`) and the manifest's statically-granted
  sites can't leak into the user-facing granted-sites list. `<all_urls>` is
  always excluded from the result. Returns a sorted, deduplicated array.

**Browser wrappers** (thin `browser.permissions` / `browser.runtime` calls,
each wrapped in try/catch matching the sibling `firefoxPermissionService.js`
error-handling style):
- `getManifestOriginPatterns()` — reads `browser.runtime.getManifest().permissions`
  and filters to entries containing `'://'` or equal to `ALL_URLS` (MV2 mixes
  API permissions like `storage`/`tabs` into the same flat array; those never
  contain `'://'`).
- `listGrantedSites()` — `browser.permissions.getAll().origins` minus manifest
  origins, via `subtractManifestOrigins`.
- `hasAllSitesAccess()` — `browser.permissions.contains({ origins: [ALL_URLS] })`.
- `grantAllSitesAccess()` / `revokeAllSitesAccess()` — request/remove `ALL_URLS`.
- `grantSite(domain)` / `revokeSite(domain)` — request/remove the single-site
  pattern from `domainToOriginPattern(domain)`.

Layering: the file imports only `browser` from `wxt/browser` (matching the
convention in `contentService.js`, `deepDiveService.js`, and
`cloudSyncService.svelte.js`) — no `lib`, `stores`, or other `services`
imports, satisfying the plan's instruction to keep this service store-free so
a future component owns the settings write-back.

## Verification Results

### 1. Test Suite

```sh
npm test
```

Output:
```
 Test Files  61 passed (61)
      Tests  585 passed (585)
   Duration  10.29s
```

Matches the pre-phase baseline exactly (61 files / 585 tests, all green) —
the new service has no formal test file yet (that's Phase 6), and no
existing test imports it, so the count is unchanged.

### 2. Type Checks

```sh
npm run check
```

Output:
```
1656 FILES 0 ERRORS 14 WARNINGS 8 FILES_WITH_PROBLEMS
```

0 errors (matches the pre-phase baseline of 0 errors / 14 warnings). File
count rose from 1655 to 1656 for the one new file; the 14 warnings are the
same pre-existing ones listed in the baseline (unused CSS selectors, a11y
label associations, a non-`$state` reactive update) — none reference the new
file.

### 3. Scratch check of pure-helper return values

Per the plan's Phase 1 verify step, ran a throwaway script (kept outside the
repo, under the session scratchpad) importing the real module and asserting
the three specified return values:

```sh
node /private/tmp/claude-501/-Users-nguyenle-Documents-GitHub-Summarizerrrr/dde714a4-61ba-4f1e-8b2b-2c4c320c3b56/scratchpad/phase1-scratch-check.mjs
```

Output:
```
domainToOriginPattern('example.com') => "*://*.example.com/*"
domainToOriginPattern('127.0.0.1') => "*://127.0.0.1/*"
urlToDomain('about:blank') => null
---assertions---
domainToOriginPattern('example.com') === '*://*.example.com/*': true
domainToOriginPattern('127.0.0.1') === '*://127.0.0.1/*': true
urlToDomain('about:blank') === null: true
```

All three assertions from the plan (`domainToOriginPattern('example.com') === '*://*.example.com/*'`,
`domainToOriginPattern('127.0.0.1') === '*://127.0.0.1/*'`, and
`urlToDomain('about:blank') === null`) hold.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` — 61/61 files, 585/585 tests pass (matches baseline)
- [x] `npm run check` — 0 errors, 14 warnings (matches baseline; +1 file for
  the new module)
- [x] Scratch-checked the three pure-helper return values named in the plan's
  Phase 1 verify step, against the real module
- [x] Confirmed the new file imports only `wxt/browser` — no `lib`, `stores`,
  or other `services/*` imports, per the plan's layering note

### Still-Required Manual Verification (To Be Done by User)
- [ ] None for this phase — Phase 1 adds no wiring, UI, or behavior change.
  Manual/browser verification starts at Phase 2 (per-site permission prompt)
  and later phases.

## Known Follow-ups

- Phase 2 will rewrite `getRequiredPermission(url)` in
  `firefoxPermissionService.js` to use `urlToDomain` / `domainToOriginPattern`
  / a manifest-derived `isCoveredByManifest(domain)` check, replacing the
  hardcoded 5-site list.
- Phase 6 will add `tests/settings/firefoxSitePermissionService.test.js`
  covering the pure helpers formally (this phase's scratch check is
  intentionally informal, per the plan).
