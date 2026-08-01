# Walkthrough - Phase 6: Tests

Phase 6 of the `firefox-site-permissions-v1` plan adds the formal unit-test
coverage for the pure helpers in `firefoxSitePermissionService.js` (created in
Phase 1), closing out the plan's testing gap without touching any
implementation file.

## Changes Made

### 1. New test file

#### [tests/settings/firefoxSitePermissionService.test.js](file:///Users/nguyenle/Documents/GitHub/Summarizerrrr/tests/settings/firefoxSitePermissionService.test.js)

Created with 35 tests across 5 `describe` blocks, one per pure helper, styled
after the neighboring `tests/settings/*.test.js` and `tests/lib/utils/*.test.js`
files (`describe`/`it` from `vitest`, no `vi.mock` unless required, `@/`
import alias). Tests target the **real exported signatures** read directly
from `src/services/firefoxSitePermissionService.js`, not the plan's sketch:

- **`urlToDomain`** (10 tests) — https and http URLs, `www.` stripping, an
  explicit port dropped, `www.` + port together, and `null` for `about:`,
  `file:`, `moz-extension:`, unparsable strings, and non-string input.
- **`domainToOriginPattern`** (5 tests) — ordinary host → `*://*.example.com/*`,
  IPv4 literal → `*://127.0.0.1/*` (no wildcard), `localhost` (single-label
  host) → `*://localhost/*` (no wildcard), an already-wildcarded input
  (`*.example.com`) normalized rather than double-wildcarded, and `null` for
  empty/nullish input.
- **`originPatternToDomain`** (6 tests) — round-trips through
  `domainToOriginPattern` for an ordinary host, a subdomain, an IPv4 literal,
  and `localhost`; `null` for the literal `ALL_URLS` pattern and for
  empty/nullish input.
- **`isValidPermissionDomain`** (8 tests) — accepts `a.com` and `*.a.com`;
  rejects `google.*` (a `*` that isn't a leading `*.` wildcard), a bare `..`,
  a leading dot (`.a.com`), consecutive dots (`a..com`), a domain containing
  spaces, and empty/nullish input.
- **`subtractManifestOrigins`** (6 tests) — user-granted sites
  (`example.com`, `news.ycombinator.com`) survive; the manifest's own
  `<all_urls>` entry, the 5 statically-scripted sites (youtube, udemy,
  coursera, reddit, wikipedia), and manifest API-host patterns
  (`api.openai.com`, `localhost:11434`) are filtered out even when present in
  the granted-origins list; `<all_urls>` is excluded from the result even
  when granted; output is sorted and deduplicated; empty/`undefined` input
  yields `[]`.

No `browser` mock was needed — confirmed empirically (see below) — because
Phase 1's pure/impure split holds: none of the tested functions read
`browser` internally, and `subtractManifestOrigins` takes `manifestOrigins`
as a plain array parameter exactly as the plan specified. No change was
required to `src/services/firefoxSitePermissionService.js`.

## Verification Results

### 1. New test file in isolation

```sh
npx vitest run tests/settings/firefoxSitePermissionService.test.js
```

Output:
```
 Test Files  1 passed (1)
      Tests  35 passed (35)
```

Run before the full suite specifically to confirm the "no `browser` mock
required" premise: the file imports the real module at the top level with no
`vi.mock('wxt/browser', ...)` anywhere, and all 35 tests passed cleanly.

### 2. Full Test Suite

```sh
npm test
```

Output:
```
 Test Files  62 passed (62)
      Tests  620 passed (620)
   Duration  8.97s
```

Matches the expected post-phase baseline exactly: 62 test files (61 + this
new one) and 620 tests (585 + the 35 new ones), all passing, including
`tests/architecture/layering.test.js`.

### 3. Type Checks

```sh
npm run check
```

Output:
```
1658 FILES 0 ERRORS 13 WARNINGS 7 FILES_WITH_PROBLEMS
```

0 errors, matching the stated post-Phase-4 baseline of 0 errors / 13
warnings exactly. `svelte-check` does not surface plain `.js` test files in
its warning list, so the new file introduces neither errors nor warnings.

### 4. Firefox Build

```sh
npm run build:firefox
```

Output (tail):
```
Σ Total size: 12.97 MB
✔ Finished in 15.4 s
```

Build completed with no errors.

## Verification Categories

### Completed Verification (Verified by Agent)
- [x] `npm test` — 62/62 files, 620/620 tests pass (61→62 files, 585→620
  tests, exactly matching the expected delta)
- [x] `npm run check` — 0 errors, 13 warnings (matches the post-Phase-4
  baseline exactly)
- [x] `npm run build:firefox` — succeeds
- [x] `tests/architecture/layering.test.js` stays green — the new test file
  lives under `tests/`, not `src/`, so it is outside the guard's scope; the
  service it tests (`src/services/firefoxSitePermissionService.js`) was
  unchanged in this phase and already imports only `wxt/browser`
- [x] Confirmed empirically that no `browser` mock is required: ran the new
  test file in isolation and verified it imports the real service module
  with no `vi.mock` of `wxt/browser`
- [x] Every bullet in the plan's Phase 6 list is covered: `urlToDomain`,
  `domainToOriginPattern`, `originPatternToDomain` round-trip,
  `isValidPermissionDomain`, `subtractManifestOrigins`

### Still-Required Manual Verification (To Be Done by User)
- [ ] None for this phase — Phase 6 is test-only and has no UI or runtime
  behavior to manually verify. The plan's "Final verification checklist"
  manual items belong to earlier phases (2-5) and are unaffected by this
  change.
