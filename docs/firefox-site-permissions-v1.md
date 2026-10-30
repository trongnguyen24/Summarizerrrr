# Firefox Per-Site Permissions & "Site Access" Settings Tab — V1

> **How to use this doc:** Self-contained execution plan, intended to be run in
> a fresh session. Start at Phase 1 and go in order. Each phase ends with a
> verify step — don't move on until it passes.

## Context

On Firefox, Summarizerrrr can only ask the user for **one** thing: `<all_urls>`. There is no way to
grant access to a single site. Two concrete symptoms:

1. **The request is all-or-nothing.** `getRequiredPermission(url)` in
   `src/services/firefoxPermissionService.js:14` returns the literal string `'<all_urls>'` for every
   non-privileged URL. So the first time a user summarizes any ordinary page, Firefox shows the
   maximally alarming *"Access your data for all websites"* dialog. Users decline, and the extension
   then looks broken rather than unpermitted.
2. **The management surface is a single hidden switch.** The only UI is one `SwitchPermission` toggle
   inside the **Data & Sync** settings tab (`src/entrypoints/settings/components/DataSyncSettings.svelte:100-115`),
   which grants or revokes `<all_urls>` wholesale.

Meanwhile the extension already contains a good UI for exactly this shape of problem: the **FAB Domain
Control** section (`src/entrypoints/settings/components/FABSettings.svelte:548-719`) — a mode dropdown
plus a text input that appends domains to a removable-chip grid. This plan reuses that visual language
for a new, Firefox-only **Site Access** settings tab.

### Key finding: no manifest change is required

The Firefox build is **Manifest V2** (verified by reading the generated `.output/firefox-mv2/manifest.json`,
which reports `manifest_version: 2`), and it already ships:

```jsonc
"optional_permissions": ["<all_urls>"]   // wxt.config.ts:204, passed through by WXT verbatim
```

WXT folds the config's `host_permissions` array into MV2's flat `permissions` key, but leaves
`optional_permissions` untouched. Per MDN's `permissions.request()` documentation:

> "The `origins` property can include permissions matching a subset of the hosts matched by an optional
> permission."

So `browser.permissions.request({ origins: ['*://*.example.com/*'] })` **already works today** against
the existing `<all_urls>` declaration. **Do not edit `wxt.config.ts`.** The only hard constraint is that
`permissions.request()` must be called from inside a user-gesture handler.

### Two behavioural facts that shape the design

- **Page extraction needs no reload after a grant.** `src/services/contentService.js:83-134` extracts
  page content via `browser.scripting.executeScript`, which starts working the instant a host permission
  is granted. A mid-summarize grant therefore proceeds immediately.
- **The FAB does need a reload.** The floating button is a *declarative* content script registered via
  `browser.scripting.registerContentScripts`, so it only appears on the **next navigation** after a grant.

### Goal & scope decision (confirmed with user)

- **New Firefox-only settings tab** ("Site Access"), with a `ReusableSelect` mode dropdown offering
  **All sites** / **Selected sites only** — mirroring FAB Domain Control's structure.
- **The `<all_urls>` switch moves out of Data & Sync entirely.** One place manages site access, not two.
  Selecting "All sites" requests `<all_urls>`; selecting "Selected sites only" revokes it and reveals
  the per-site list.
- **The inline summarize prompt asks for the current site only**, not `<all_urls>`.
- **Granularity is the full hostname**: `docs.google.com` → `*://*.docs.google.com/*`. Minimal privilege
  and predictable. Accepted trade-off: `mail.google.com` prompts separately; users who want the whole
  domain can type `google.com` into the list manually. Explicitly **not** doing eTLD+1 extraction, which
  would require a Public Suffix List dependency or a hardcoded suffix table.
- **No new npm dependencies. No `wxt.config.ts` manifest changes.**
- The existing `settings.firefoxPermissions.httpsPermission` store key and `updateFirefoxPermission()`
  stay — other components read them (see Phase 4).

---

## Phase 1 — New service: `firefoxSitePermissionService.js`

Create `src/services/firefoxSitePermissionService.js`. Split it into **pure helpers** (unit-testable
with no `browser` mock) and thin browser wrappers. This split matters: there is no global `browser` mock
in this repo — `tests/setup/vitest.js` only loads `fake-indexeddb` — so testability depends on the pure
functions taking plain data.

**Pure helpers:**

```js
export const ALL_URLS = '<all_urls>'

urlToDomain(url)                 // → lowercase hostname, `www.` stripped, port dropped.
                                 //   Returns null for non-http(s) schemes (about:, file:,
                                 //   moz-extension:) — those can never be granted.
domainToOriginPattern(domain)    // 'example.com' → '*://*.example.com/*'
originPatternToDomain(pattern)   // reverse: strip '*://', leading '*.', trailing '/*'
isValidPermissionDomain(domain)  // plain domain or '*.domain' only
subtractManifestOrigins(grantedOrigins, manifestOrigins)  // → sorted user-granted domain strings
```

Two edge cases `domainToOriginPattern` **must** handle: a `*.` prefix is illegal in a WebExtension match
pattern before an IP literal or a single-label host. When the host is an IPv4/IPv6 literal or contains no
dot (`localhost`), emit `*://<host>/*` instead of `*://*.<host>/*`.

`isValidPermissionDomain` is deliberately **stricter than, and must NOT be shared with,**
`isValidDomainPattern` in `FABSettings.svelte:41-57`. FAB accepts patterns like `google.*`, which is a
legal *display-matching* pattern in `fabPermissionService.js` but an **illegal WebExtension origin
pattern**. Resist the urge to extract these into one shared helper — they answer different questions.

**Browser wrappers:**

```js
getManifestOriginPatterns()   // MV2: getManifest().permissions.filter(p => p.includes('://') || p === ALL_URLS)
listGrantedSites()            // permissions.getAll().origins − manifest origins − ALL_URLS
hasAllSitesAccess()           // permissions.contains({ origins: [ALL_URLS] })
grantAllSitesAccess() / revokeAllSitesAccess()
grantSite(domain) / revokeSite(domain)
```

`getManifestOriginPatterns()` works because MV2 mixes API permissions and host patterns in one flat
`permissions` array, and API permissions (`storage`, `tabs`, `alarms`…) never contain `://`.

`subtractManifestOrigins` must compare **normalized domains**, not raw pattern strings, so that Firefox's
own pattern normalization and future manifest edits can't leak API hosts (`api.openai.com`,
`localhost:11434`) or the statically-granted sites into the user-facing list.

Deriving that static set from `getManifest()` at runtime **eliminates one of four divergent hardcoded
copies** of the youtube/udemy/coursera/reddit/wikipedia list currently in the codebase (the others live
at `firefoxPermissionService.js:16-22`, `wxt.config.ts:209-214`, and
`background/index.js:162-168` + `firefox.content.js:7-12`).

Layering note (`CLAUDE.md`): `src/services/**` may import `lib`, `services`, and `stores/settingsStore`.
Keep this service free of store imports — let the *component* write to the store. This keeps the service
trivially testable.

**Verify:** `npm test` still passes, and in a scratch Node/vitest check confirm
`domainToOriginPattern('example.com') === '*://*.example.com/*'`,
`domainToOriginPattern('127.0.0.1') === '*://127.0.0.1/*'`, and
`urlToDomain('about:blank') === null`. (Formal tests land in Phase 6.)

---

## Phase 2 — Retarget the inline permission request to the current site

In `src/services/firefoxPermissionService.js`, rewrite `getRequiredPermission(url)` (currently lines 14-28):

```js
const domain = urlToDomain(url)
if (!domain) return null                      // non-http(s) — nothing can be requested
if (isCoveredByManifest(domain)) return null  // replaces the hardcoded 5-site list at :16-22
return domainToOriginPattern(domain)
```

Implement `isCoveredByManifest(domain)` from `getManifestOriginPatterns()`: build a Set of manifest
domains and match `domain === m || domain.endsWith('.' + m)`.

**Keep the signatures of `checkPermission()` and `requestPermission()` unchanged.** That is what makes
this phase cheap: **all six call sites in `src/stores/summaryStore.svelte.js`** inherit per-site behaviour
with **zero edits**:

| Function | Permission check block |
|---|---|
| `fetchAndSummarize()` | lines 350-362 |
| `fetchChapterSummary()` | 540-552 |
| `fetchCourseConcepts()` | 668-680 |
| `fetchAndSummarizeStream()` | 772-784 |
| `executeCustomAction()` | 1259-1268 |
| `fetchCommentSummary()` | 1409-1418 |

The seventh call site, `src/services/chat/tabMentionService.js:109-113`, also inherits it unchanged
(note it already has a `deniedTabIds` Set so a denial isn't re-prompted).

This phase rests on one load-bearing assumption: `permissions.contains({origins:['*://*.example.com/*']})`
returns `true` when `<all_urls>` is granted, via pattern subsumption. That is standard Firefox behaviour,
but it is explicitly checked in the Final verification checklist — if it were false, users with All-sites
access would be re-prompted per site.

Also in this phase: replace the local hardcoded 3-domain list in
`src/entrypoints/sidepanel/components/PermissionWarningPrompt.svelte:82-85` with a `checkPermission(url)`
call. That list is already stale (missing `reddit` and `wikipedia`), and per-site grants make the
staleness far more visible.

**Verify:** `npm run check` passes. Then `npm run build:firefox`, load
`.output/firefox-mv2/manifest.json` via `about:debugging` → *Load Temporary Add-on*, open the side panel
on a fresh non-privileged site (e.g. `https://news.ycombinator.com`) with no permissions granted, and
summarize. The Firefox dialog must name **only that domain** — not "all websites". Accept it; the summary
must proceed **without reloading the tab**.

---

## Phase 3 — Background: register content scripts for granted origins

`src/entrypoints/background/index.js:130-229` currently registers a single dynamic content script
hardcoded to `matches: ['<all_urls>']`, and its `permissions.onAdded` / `onRemoved` listeners only react
when the changed origin is literally `<all_urls>` or `*://*/*` (lines 207 and 216). Per-site grants are
invisible to it, so the FAB would never appear on a per-site-granted page.

Replace `registerDynamicContentScript()` with a single `syncDynamicContentScripts()`:

- Compute `matches`: `['<all_urls>']` if all-sites access is granted; else the granted per-site patterns
  from `listGrantedSites()`; else `[]`.
- `[]` → call the existing `unregisterDynamicContentScript()`.
- Otherwise **unregister, then register** under the existing `DYNAMIC_SCRIPT_ID`, preserving the current
  `excludeMatches` (the 5 statically-scripted domains, lines 162-168), `runAt: 'document_end'`, and
  `persistAcrossSessions: true`.

Use unregister-then-register rather than `browser.scripting.updateContentScripts()` — the latter has been
historically unreliable in Firefox for changes to `matches`, and this path also naturally handles the
"not currently registered" state after a worker restart. Note the existing early-return at lines 152-159
(`if already registered, return`) must be **removed**, since the whole point is to refresh `matches`.

Wire `syncDynamicContentScripts()` into three places:

1. `permissions.onAdded` — drop the `<all_urls>`-only filter; fire whenever `permissions.origins?.length`.
2. `permissions.onRemoved` — same.
3. Worker startup, replacing the `browser.permissions.contains({origins:['<all_urls>']})` check at lines 223-229.

No change is needed in `src/entrypoints/content/main.js:24-39` — its `CHECK_FIREFOX_PERMISSION` round-trip
to the background already resolves through `checkPermission()`, which Phase 2 made per-site.

**Verify:** rebuild and reload the extension. Grant one site (either via the Phase 2 summarize flow or
`about:addons` → Permissions), then **reload that page** — the FAB must appear. Navigate to a *different*,
ungranted site — no FAB. In the background console, `await browser.scripting.getRegisteredContentScripts()`
must show the granted origin in `matches` rather than `<all_urls>`.

---

## Phase 4 — New "Site Access" settings tab

Create `src/entrypoints/settings/components/SitePermissionsSettings.svelte`.

Placement is per `CLAUDE.md`: it is used by exactly one surface, so it lives under the settings
entrypoint and **must not** go in `src/components/` (Rule 6 would fail the architecture guard). The
basename is unique under `src/`, satisfying the filename-uniqueness rule.

**State & reactivity:**

```js
let grantedSites = $state([])
let allSites     = $state(false)
let newDomain    = $state('')   // NOT $state() — see note below
let errorKey     = $state(null)
let mode = $derived(allSites ? 'all' : 'selected')
```

> Initialize `newDomain` to `''`, not bare `$state()`. `FABSettings.svelte:18-19` leaves its equivalents
> `undefined`, which makes `.trim()` at lines 62-63 throw if the add button is pressed before typing.
> Don't reproduce that bug.

Register `browser.permissions.onAdded` / `onRemoved` inside an `$effect` (returning a cleanup that removes
the listeners) and re-run `listGrantedSites()`. This makes a revocation performed externally in
`about:addons` show up live without reopening the tab.

**Markup** — copy the structure from `FABSettings.svelte:548-719`:

- Section header: `px-5` wrapper, `label` with `font-bold text-text-primary`, `p` with `text-muted`.
- `ReusableSelect` (`src/components/inputs/ReusableSelect.svelte`, props `items` / `bind:bindValue` /
  `onValueChangeCallback` / `ariaLabel` / `className`) with items **All sites** and **Selected sites only**.
- Add-domain row: the same `overflow-hidden relative w-full h-8.5` wrapper containing an `<input>` with
  the `w-[133.33%] h-[133.33%] … origin-top-left scale-75` trick (this shrinks a 16px input to 12px
  *without* triggering iOS zoom — keep it), plus a `heroicons:plus-circle-16-solid` button positioned
  `absolute top-0 right-0`. `Enter` in the input also submits.
- Chip grid: the dotted-background panel (`xs:grid … grid-cols-2 p-2 gap-2`, `bg-dot` overlay, rotated-45
  corner notch spans), one row per domain with a `heroicons:minus-16-solid` remove button. Use the
  **blacklist** row variant (`FABSettings.svelte:679`, which wraps the domain in
  `<p class="flex-auto line-clamp-1">`), **not** the whitelist variant at line 639 — the latter fails to
  truncate long domains.
- Helper/empty-state text panel per mode.

**Handlers:**

- **Mode → All sites**: `grantAllSitesAccess()`, then `updateFirefoxPermission('httpsPermission', granted)`
  and broadcast `PERMISSION_CHANGED`. Reuse the exact pattern already written in
  `DataSyncSettings.svelte:52-89` (including the `try/catch` around `browser.runtime.sendMessage`).
- **Mode → Selected sites only**: `revokeAllSitesAccess()` — `permissions.remove()` needs no user gesture —
  then the same store write + broadcast.
- **Add**: validate with `isValidPermissionDomain` → dedupe against `grantedSites` → `grantSite(domain)`.
  A denial must leave the typed text intact and surface an inline message.
- **Remove**: `revokeSite(domain)`.

**Wiring — the full checklist for a new settings tab:**

1. `Setting.svelte` — import `SitePermissionsSettings`.
2. `mainTabs` (`Setting.svelte:27-70`) — splice in, immediately after the `fab` entry:
   `{ id: 'site-access', label: 'Site Access', iconSolid: 'heroicons:shield-check-solid', iconOutline: 'heroicons:shield-check' }`,
   wrapped in `...(import.meta.env.BROWSER === 'firefox' ? [ … ] : [])` so WXT tree-shakes it out of the
   Chrome build. Tab labels in this array are hardcoded English (not i18n keys) — match that convention.
3. Add an `{:else if activeTab === 'site-access'}` branch to the chain at `Setting.svelte:248-266`,
   guarded by the same env check.
4. Add both icon names to the `loadIcons([...])` call at `Setting.svelte:145-176`.
5. `VALID_TABS` in `src/lib/utils/urlUtils.js:8-17` — add `'site-access'` **conditionally** on
   `import.meta.env.BROWSER === 'firefox'`. Adding it unconditionally would make `?tab=site-access` a
   "valid" tab on Chrome that matches no `{:else if}` branch, rendering a blank content area.
6. **Delete** the Firefox block from `DataSyncSettings.svelte`: the permission imports (lines 4-13), all
   the permission state and handlers (19-95), and the `{#if import.meta.env.BROWSER === 'firefox'}` markup
   block (100-115). `CloudSyncToolSettings` and `ExportImport` stay. This also disposes of a latent bug in
   `loadPermissionStates` — `hasInitialized = true` sits inside the non-cached branch (line 45), so the
   cached early-return at 41-42 never initializes.

**Keep** the `settings.firefoxPermissions.httpsPermission` store key and `updateFirefoxPermission()` in
`settingsStore.svelte.js` — both `FirefoxPermissionOverlay.svelte` and the sidepanel's
`PermissionWarningPrompt.svelte` read it.

**Small fix while in the area:** `FirefoxPermissionOverlay.svelte:48` renders whenever
`!httpsPermission && isTouchDevice()`, so on Firefox Android it will nag users who deliberately chose
Selected-sites mode. Add a condition so it only shows when there are **no** per-site grants either.

**Verify:** rebuild, reload, open Settings on Firefox. The **Site Access** tab appears in the sidebar
after **FAB**; the **Data & Sync** tab shows no permission UI at all. Type `news.ycombinator.com` → `＋`:
Firefox prompts for that domain only, and a chip appears. Remove that permission from `about:addons` →
Permissions: the chip disappears without reopening the tab. Switch the dropdown to **All sites** →
Firefox prompts; switch back to **Selected sites only** → `<all_urls>` is revoked (confirm in
`about:addons`) and the list returns.

---

## Phase 5 — i18n

Add a `settings.site_access` namespace to **all 8** locale files
(`src/lib/locales/{en,vi,es,zh-CN,de,fr,ja,ko}.json`):

```json
"site_access": {
  "title": "Site Access",
  "description": "…",
  "mode": {
    "all_sites": "All sites",
    "selected_only": "Selected sites only",
    "aria_label": "Select site access mode"
  },
  "domain_input_placeholder": "example.com",
  "selected_helper": "…",
  "all_helper": "…",
  "invalid_domain": "…",
  "already_added": "…",
  "denied": "…"
}
```

Components look these up as `{$t('settings.site_access.title')}` via `import { t } from 'svelte-i18n'`.

Leave the existing top-level `permissionWarning.*` namespace alone — its `description` names
"YouTube, Udemy, Coursera, Reddit, and Wikipedia" and is still accurate for the sidepanel prompt.

**Verify:** `npm run build:firefox` succeeds. In Settings, switch UI language between English and
Vietnamese (and one CJK locale) with the Site Access tab open — every string translates, with no raw
`settings.site_access.…` keys leaking through and no missing-key warnings in the console.

---

## Phase 6 — Tests

Create `tests/settings/firefoxSitePermissionService.test.js`. No `browser` mock is required if Phase 1's
pure/impure split was respected (pass `manifestOrigins` in as a parameter rather than reading the
manifest inside the pure helper).

Cover:

- `urlToDomain`: https + http, `www.` stripping, explicit port, and `about:` / `file:` /
  `moz-extension:` → `null`.
- `domainToOriginPattern`: ordinary host, IPv4 literal, `localhost`, and an already-wildcarded input.
- `originPatternToDomain` round-trips with `domainToOriginPattern`.
- `isValidPermissionDomain`: accepts `a.com` and `*.a.com`; rejects `google.*`, `..`, a leading `.`,
  and strings containing spaces.
- `subtractManifestOrigins`: user-granted sites survive; manifest API hosts (`api.openai.com`,
  `localhost`) and the 5 statically-granted sites are filtered out; `<all_urls>` is excluded.

**Verify:** `npm test` passes in full — 51+ test files including the architecture guard at
`tests/architecture/layering.test.js`. The guard must stay green: the new service imports only
`lib`/`services` (Rule 2), and the new component lives under an entrypoint rather than
`src/components/` (Rules 5-6).

---

## Out of scope (V1)

- **eTLD+1 / base-domain grants.** Rejected above; would need a Public Suffix List.
- **`wxt.config.ts` manifest changes.** Not needed — `optional_permissions: ["<all_urls>"]` already
  permits subset requests on MV2.
- **`VALID_TABS` is missing `'deep-dive'`** (`urlUtils.js:8-17`) even though `mainTabs` includes it, so
  that tab's URL never persists. A one-word fix, but unrelated to this feature — leave it, or raise it
  separately.
- **Dead `PERMISSION_CHANGED` tab fan-out.** `background/handlers/permissionHandlers.js:33-46` broadcasts
  to every tab, but no content script listens. Leave alone.
- **`settings.firefoxPermissions` lives in cloud-synced settings** while describing a purely local
  browser grant. Pre-existing oddity; unchanged here.
- **Unused permission helpers.** `createPermissionError()`, `reloadCurrentTab()`, `analyzePermissionError()`,
  and `clearPermissionCache()` are exported but never called. Not wired up in V1 — Phase 2's verify
  confirms `executeScript` makes a reload unnecessary for summarizing.
- **Chrome/Safari behaviour.** Both ship static `<all_urls>` host permissions; nothing changes for them.

---

## Final verification checklist

- [ ] `npm test` passes (including `tests/architecture/layering.test.js`).
- [ ] `npm run check` passes.
- [ ] `npm run build:firefox` succeeds, and `.output/firefox-mv2/manifest.json` still shows
      `manifest_version: 2` and `optional_permissions: ["<all_urls>"]` (i.e. the manifest was not touched).
- [ ] **Pattern subsumption (Phase 2's load-bearing assumption):** with All-sites access granted, run
      `await browser.permissions.contains({origins:['*://*.example.com/*']})` in the background console →
      must be `true`. If `false`, `checkPermission()` needs an explicit `<all_urls>` fallback check.
- [ ] **User gesture survives `ReusableSelect`** — the main risk in this plan. Selecting **All sites**
      must actually produce the Firefox permission prompt. bits-ui `Select` fires
      `onValueChangeCallback` from the item click, which *should* preserve user activation; if the prompt
      is silently suppressed instead, fall back to rendering the existing
      `src/entrypoints/settings/components/inputs/SwitchPermission.svelte` for the all-sites grant (a plain
      click handler) while keeping the dropdown for everything else.
- [ ] Per-site summarize on an ungranted site prompts for **that site only** and proceeds with **no tab reload**.
- [ ] FAB appears on a granted site after reload; absent on an ungranted site.
- [ ] Revoking a site in `about:addons` updates the Site Access list live.
- [ ] Mode round-trip (All sites ⇄ Selected sites only) grants/revokes `<all_urls>` correctly.
- [ ] **Chrome regression:** `npm run build` — the Chrome build has no Site Access tab, and
      `?tab=site-access` falls back to the default `ai-provider` tab.
- [ ] Firefox Android (`npm run android`): the `FirefoxPermissionOverlay` bottom sheet does **not** nag
      when per-site grants exist.

---

## Notable files

| File | Change |
|---|---|
| `src/services/firefoxSitePermissionService.js` | **New.** Pure pattern/domain helpers + `permissions` API wrappers. |
| `src/services/firefoxPermissionService.js` | `getRequiredPermission()` returns a per-site pattern; manifest-derived static-site check replaces the hardcoded 5-site list. |
| `src/entrypoints/background/index.js` | `syncDynamicContentScripts()` replaces the `<all_urls>`-only registration; permission listeners fire on any origin change. |
| `src/entrypoints/settings/components/SitePermissionsSettings.svelte` | **New.** The Site Access tab, structurally mirroring `FABSettings.svelte:548-719`. |
| `src/entrypoints/settings/components/Setting.svelte` | Firefox-only tab entry, render branch, icon preload. |
| `src/entrypoints/settings/components/DataSyncSettings.svelte` | Firefox permission block, state, and handlers **deleted**. |
| `src/entrypoints/settings/components/FirefoxPermissionOverlay.svelte` | Render gate also requires zero per-site grants. |
| `src/entrypoints/sidepanel/components/PermissionWarningPrompt.svelte` | Local stale domain list replaced with `checkPermission(url)`. |
| `src/lib/utils/urlUtils.js` | `'site-access'` added to `VALID_TABS`, conditionally on the Firefox build. |
| `src/lib/locales/*.json` | New `settings.site_access` namespace across all 8 locales. |
| `tests/settings/firefoxSitePermissionService.test.js` | **New.** Unit tests for the pure helpers. |
| `wxt.config.ts` | **Unchanged** — deliberately. |
