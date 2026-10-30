# Cloud Sync: Shared OAuth Sign-in + BYOK Option (V1)

> **How to use this doc:** this is a self-contained execution plan, meant to be run in a fresh session. Do the phases in order. Each one ends with a verify step; don't start the next phase until it passes. Phase 1 is manual and the repo owner does it in the Google Cloud Console; the code phases don't depend on it, but the shared sign-in can't be tested end-to-end until it's done.

## Context

Cloud Sync (Google Drive) is currently **BYOK only**:
- Before "Sign in with Google" is enabled, users have to create their own Google Cloud project, configure the OAuth consent screen, add redirect URIs and paste in a Client ID and Secret.
- `login()` and `doRefreshToken()` in `src/services/cloudSync/cloudSyncService.svelte.js` throw if `customCredentials` is missing ("BYOK mode is required - no proxy fallback").

This causes two problems:
1. **Onboarding:** very few users get through the Google Cloud setup.
2. **The 7-day logout:** user-created OAuth apps nearly always stay in "Testing", and Google expires their refresh tokens after 7 days. The refresh returns `invalid_grant`, which `markNeedsReauth()` turns into the Reconnect banner (`REAUTH_HINT`).

A shared-client path already exists but nothing calls it, because it was disconnected when BYOK was added in commit `51783bc`:
- `src/services/cloudSync/googleDriveAdapter.js` contains:
  - `CLIENT_ID` (currently the **old** client `1045816330790-n9u8…apps.googleusercontent.com`; replace it in Phase 3 with the new published client `197192111766-kfe6nfv6tsfbtvg0emd4ifcrjs631944.apps.googleusercontent.com`)
  - `TOKEN_PROXY_URL = 'https://oauth.summarizerrrr.com'`
  - `authenticate()` → `authenticateDesktop()` / `authenticateMobile()` → `exchangeCodeViaProxy()`
  - `refreshAccessToken()`, which uses the proxy's `/refresh`
- `cloudflare-worker/oauth-proxy.js` (tracked in git) is the Cloudflare Worker behind `oauth.summarizerrrr.com`:
  - `POST /exchange` and `POST /refresh`
  - adds `client_secret` from `env.GOOGLE_CLIENT_SECRET`
  - passes Google's error JSON through with Google's status code
  - validates the Origin and `redirect_uri` with regexes, or with `env.ALLOWED_EXTENSION_IDS`
  - There is no `wrangler.toml`.

Other relevant facts:
- The adapter currently has two nearly identical copies of the desktop (`launchWebAuthFlow`) and mobile (tab + `tabs.onUpdated`) auth flows: one in `authenticateWithCustomCredentials()`, one in `authenticateDesktop()` / `authenticateMobile()`.
- Scopes (`SCOPES` in the adapter): `drive.file` plus `userinfo.profile` and `userinfo.email`. All three are **non-sensitive**, so publishing the shared app needs brand verification only, not a security assessment. They changed from `drive.appdata` in commit `fa116d4`, so the shared project's consent screen may still list the old scope.
- Redirect URIs, listed in `redirectUris` in `src/entrypoints/settings/components/tools/CloudSyncToolSettings.svelte`:
  - Chrome: `https://ahfjndakflcegianjdojpldllodpkkpc.chromiumapp.org/`
  - Edge: `https://kgoolaebmcbhbjokofmhdcjbljagaiif.chromiumapp.org/`
  - Firefox: `https://5addcb3f-a5ee-4df3-b7e6-a30bf3445a6d.extensions.allizom.org/`
- Firefox manifest (`wxt.config.ts`, the `browser === 'firefox'` branch): currently `optional_permissions: ['<all_urls>']`. Neither `host_permissions` nor `optional_permissions` includes `oauth.summarizerrrr.com`; it was removed in `5c9a588`.
- Permission helpers already exist in `src/services/firefoxPermissionService.js`: `checkSpecificPermission(pattern)` and `requestSpecificPermission(pattern)`. The Firefox check is `isFirefox()` from `src/lib/utils/browserDetection.js`.
- Tests: `tests/api/cloudSyncReauth.test.js` mocks `@/services/cloudSync/googleDriveAdapter.js` with an `adapter` object of `vi.fn()`s and covers the `invalid_grant` → needsReauth lifecycle.

### Goal & scope decisions (confirmed with the user)
- **Two ways to sign in:**
  - Default: the shared client through `oauth.summarizerrrr.com`. One click, no setup.
  - Option: "use your own Google Cloud project" (BYOK, kept exactly as it works today).
- **UI:** the shared sign-in is the main button. BYOK goes in a collapsible "Advanced" section.
- **Firefox:** the shared path needs the user's **explicit** permission for `https://oauth.summarizerrrr.com/*`. Declare it in `optional_permissions` and request it when the user clicks; it is never granted automatically.
- **Worker:** update `cloudflare-worker/oauth-proxy.js` in this repo; don't start a new one.
- **Existing BYOK sessions must keep working** with no re-login.
- Constraints:
  - no new npm dependencies
  - no change to the Drive data format or the sync algorithm
  - Chrome, Edge and Safari manifests unchanged
  - keep the layering rules in `CLAUDE.md` (services → services is allowed)

## Phase 1: Shared Google Cloud project — ✅ DONE (2026-10-29)
Already done by the repo owner: a new client `197192111766-kfe6nfv6tsfbtvg0emd4ifcrjs631944.apps.googleusercontent.com` was created and published **In production**, `summarizerrrr.com` was added to Authorized domains, and all 3 redirect URIs are registered. Worker domain stays `oauth.summarizerrrr.com`. Skip to Phase 2. Kept for reference:
1. **Google Auth Platform → Audience:** if the publishing status is "Testing", switch it to **In production**. This is what removes the 7-day expiry and the 100-user cap for shared users.
2. **Branding:**
   - homepage `https://summarizerrrr.com`
   - a privacy-policy URL on summarizerrrr.com that says:
     - Drive data goes directly between the extension and Google
     - the proxy only exchanges and refreshes tokens and stores nothing
   - domain verified in Search Console
   - logo
   - submit for brand verification
3. **Data Access:** the scopes are exactly `drive.file`, `userinfo.profile` and `userinfo.email`. Remove `drive.appdata` if it is still listed.
4. **Clients → the Web client:** its Authorized redirect URIs include the 3 URIs in Context.

**Verify:**
- The Audience page shows "In production".
- The Branding page shows the verification as submitted or approved.
- The client's redirect URI list contains all 3 URIs.

## Phase 2: Harden `cloudflare-worker/oauth-proxy.js`
Changes to the existing file (keep its structure):
1. **Firefox origin bug.** When `env.ALLOWED_EXTENSION_IDS` is set, `isValidOrigin()` only accepts exact `moz-extension://<id>` origins. Firefox origins are a **random UUID per install**, so with a whitelist configured, every Firefox request is rejected with 403. Replace that variable with two separate ones:
   - `env.ALLOWED_ORIGINS`: comma-separated exact origins (`chrome-extension://ahfjnd…`, `chrome-extension://kgoola…`). `moz-extension://` origins are always checked with the existing UUID regex instead of the list.
   - `env.ALLOWED_REDIRECT_URIS`: comma-separated list, checked by **exact match** after normalising the trailing slash. The current `startsWith` would also accept `https://<id>.chromiumapp.org.evil.com`.
   - When either variable is unset, fall back to the existing regexes, as now.
2. The `404 Not Found` and `catch` responses must include `corsHeaders` and a JSON body `{ error, error_description }`. Without CORS headers the extension only sees an opaque "Failed to fetch".
3. In `handleExchange` and `handleRefresh`, make `await response.json()` safe to fail: a non-JSON body from upstream → `{ error: 'upstream_error' }` with the upstream status (502 if that status is 2xx). Never log `code`, `code_verifier` or tokens.
4. Add `cloudflare-worker/wrangler.toml`:
   - `name = "summarizerrrr-oauth-proxy"`
   - `main = "oauth-proxy.js"`
   - `compatibility_date`
   - `routes = [{ pattern = "oauth.summarizerrrr.com", custom_domain = true }]`
   - `[vars] GOOGLE_CLIENT_ID = "197192111766-kfe6nfv6tsfbtvg0emd4ifcrjs631944.apps.googleusercontent.com"` (must equal `CLIENT_ID` in `googleDriveAdapter.js`)
   - `ALLOWED_ORIGINS` and `ALLOWED_REDIRECT_URIS`
   - a comment explaining `wrangler secret put SUMMARIZERRRR_GOOGLE_CLIENT_SECRET` and `wrangler deploy`
5. Check that `vitest` doesn't collect anything from `cloudflare-worker/`. There are no test files there, and the layering test only scans `src/`.

**Do not deploy or set secrets yourself.** The repo owner runs `npx wrangler secret put SUMMARIZERRRR_GOOGLE_CLIENT_SECRET` and `npx wrangler deploy` from `cloudflare-worker/`. Never ask for the client secret in chat or write it to a file. Stop and hand these commands to the user, and continue with Phase 3 while they deploy.

**Verify:** after `npx wrangler deploy` (repo owner):
- `curl -i -X OPTIONS -H 'Origin: moz-extension://00000000-0000-0000-0000-000000000000' https://oauth.summarizerrrr.com/refresh` → 200 with `Access-Control-Allow-Origin` echoed back.
- `curl -i -X POST -H 'Content-Type: application/json' -d '{"refresh_token":"bogus"}' https://oauth.summarizerrrr.com/refresh` → 400 with Google's JSON `{"error":"invalid_grant",…}`.
- `/exchange` with `redirect_uri: "https://x.chromiumapp.org.evil.com/"` → 403.
- `/nope` → 404 with a JSON body and CORS headers.

## Phase 3: Adapter and service support both modes
**`src/services/cloudSync/googleDriveAdapter.js`**
- Set `CLIENT_ID = '197192111766-kfe6nfv6tsfbtvg0emd4ifcrjs631944.apps.googleusercontent.com'` (the new published client; the old `1045816330790-…` client is retired).
- Move the duplicated flow into one private `obtainAuthCode(clientId, redirectUri, codeChallenge)`:
  - Desktop: `launchWebAuthFlow` + `parseAuthorizationCode`.
  - Mobile: open a tab and listen with `tabs.onUpdated`, with a 120 s timeout.
  - It returns the `code`.
- Then:
  - `authenticate()` = PKCE → `obtainAuthCode(CLIENT_ID, …)` → `exchangeCodeViaProxy`
  - `authenticateWithCustomCredentials(id, secret)` = PKCE → `obtainAuthCode(id, …)` → `exchangeCodeDirectInternal`
- Delete `authenticateDesktop` and `authenticateMobile`.
- Keep the exported names and signatures the same. The tests mock them.
- Update the header comment to describe both modes.

**`src/services/cloudSync/cloudSyncService.svelte.js`**
- In the `syncStorage` defaults, add `authMode: null`, which will be `'shared' | 'custom'`. It records **which client issued the stored refresh token**. Refresh must always use the same client, so never infer it from the `customCredentials` saved now, which the user can edit after signing in.
- Migration in `initSync()`: `if (stored.isLoggedIn && !stored.authMode) stored.authMode = 'custom'`. Every session that exists today is BYOK. Persist it next to the existing `syncPreferences` migration.
- `login({ mode = 'shared' } = {})`:
  - `'custom'`: keep the existing credential check, then `authenticateWithCustomCredentials`.
  - `'shared'`: `authenticate()`.
  - Save `authMode: mode` in `updatedState`.
- `reconnect()` → `login({ mode: stored.authMode || 'custom' })`.
- **Guard in the service, not only in the UI:**
  - `login()` with `mode === 'shared'` on Firefox first calls `checkSpecificPermission(PROXY_ORIGIN_PATTERN)`.
  - If that returns false, throw `proxy_permission_missing` **before** opening the OAuth flow.
  - This covers both Sign in and Reconnect. Without it, a `needsReauth` session whose permission was revoked would run OAuth and then fail at `/exchange`.
  - The service only *checks*. Only the UI click handler *requests*: see Phase 4, `ensureProxyPermission()`.
- `doRefreshToken()` branches on `stored.authMode`:
  - `'shared'`: `refreshAccessToken(stored.refreshToken)`. Before that, on Firefox (`isFirefox()`), call `checkSpecificPermission(PROXY_ORIGIN_PATTERN)`. If it returns false, throw `Object.assign(new Error(…), { code: 'proxy_permission_missing' })` and **do not** call `markNeedsReauth()`; the grant is still valid. Set `syncState.needsProxyPermission = true`.
  - `'custom'`: the existing code, unchanged.
  - Leave the `invalid_grant` → `markNeedsReauth()` handling as it is, for both branches.
- Export `PROXY_ORIGIN_PATTERN = 'https://oauth.summarizerrrr.com/*'` and `grantProxyPermission()`. The latter calls `requestSpecificPermission`, and if that returns true clears `needsProxyPermission` and restarts auto-sync if it is enabled.
- Make the reauth message depend on the mode:
  - custom: keep the current "publish your OAuth app" text
  - shared: "Your Google session expired. Sign in again."
- `cloudSyncStore`: add the getters `authMode` and `needsProxyPermission`.
- **`needsProxyPermission` is derived, never only set in memory.** `syncState` lives separately in each context (background and Settings). A refresh that fails in the background alarm sets nothing in the Settings page, and Settings only re-reads storage every 30 s through `refreshSyncState()` (`CloudSyncToolSettings.svelte` `onMount` interval). So:
  - Add a private `computeNeedsProxyPermission(stored)`: if `stored.isLoggedIn && stored.authMode === 'shared' && isFirefox()`, return `!(await checkSpecificPermission(PROXY_ORIGIN_PATTERN))`; otherwise `false`.
  - `initSync()` and `refreshSyncState()` both assign `syncState.needsProxyPermission = await computeNeedsProxyPermission(stored)`.
  - `permissions.contains()` gives the same answer in every extension context, so there is no new storage field and nothing can go stale.
  - `doRefreshToken()` may also set it to true right away for the current context.
  - `login()` success, `logout()` and `grantProxyPermission()` reset it to `false`.
  - So does switching mode, since `login()` overwrites `authMode`.
- Auto-sync and `syncNow`: on `proxy_permission_missing`, skip quietly. No error toast, because the UI shows a banner.
- `logout()` clears `authMode`.
- Remove the stale "BYOK mode only" / "no proxy fallback" comments.

**Tests**: extend `tests/api/cloudSyncReauth.test.js`:
- Add `authenticate` and `refreshAccessToken` to the `adapter` mock.
- Mock `@/services/firefoxPermissionService.js` and `@/lib/utils/browserDetection.js`.
- Cases:
  1. `login({mode:'shared'})` stores `authMode:'shared'`, and a later refresh calls `refreshAccessToken`, not `…Direct`.
  2. Shared refresh rejects with `OAuthTokenError(…, 'invalid_grant')` → `needsReauth` true, still logged in.
  3. A legacy stored state (logged in, no `authMode`) migrates to `'custom'` in `initSync` and refreshes directly.
  4. A shared session where `customCredentials` gets saved afterwards still refreshes through the proxy.
  5. Firefox with the permission missing → error code `proxy_permission_missing`, `needsReauth` stays false.
  6. Cross-context: the stored state is a shared Firefox session, and `checkSpecificPermission` resolves `false`. With **no** refresh attempted in this module instance (simulating the failure having happened in the background), `refreshSyncState()` sets `cloudSyncStore.needsProxyPermission === true`. After `checkSpecificPermission` flips to `true`, the next `refreshSyncState()` clears it.
  7. `needsReauth` plus permission revoked: on a shared Firefox session, `reconnect()` rejects with `proxy_permission_missing`, and `adapter.authenticate` is **not** called.
  8. `logout()` resets `needsProxyPermission` and `authMode`.

**Verify:** `npm test` passes, including the new cases and `tests/architecture/layering.test.js`. `npm run check` shows no new errors.

## Phase 4: Settings UI, Firefox permission, i18n
**`wxt.config.ts`** (Firefox branch only): `optional_permissions: ['<all_urls>', 'https://oauth.summarizerrrr.com/*']`. Don't add it to `host_permissions`.

**`src/entrypoints/settings/components/tools/CloudSyncToolSettings.svelte`**: not-logged-in screen:
- The main "Sign in with Google" button is always enabled (no `credentialsSaved` gate) and calls `handleSharedLogin()`:
  1. If `isFirefox()`, the **first statement** is `const ok = await requestSpecificPermission(PROXY_ORIGIN_PATTERN)`. No other `await` may come before it, or Firefox drops the user-gesture context. If `!ok`, set `loginError` to the Firefox explanation string and return.
  2. Otherwise, `login({ mode: 'shared' })`.
- Under the button, a one-line note: Drive data goes straight to the user's Drive; `oauth.summarizerrrr.com` only handles the sign-in token.
- A disclosure "Use your own Google Cloud project":
  - It contains the existing description, Client ID / Client Secret inputs, error, Setup Tutorial link and Redirect URIs dialog, moved inside unchanged.
  - Add its own button, "Sign in with your project", gated by `credentialsSaved`, which calls `login({ mode: 'custom' })`. That path needs no Firefox prompt.
  - The section starts open when `getCustomCredentials()` returns credentials.
  - Add one line of copy (`byok.separateDataNote`): "Data synced with your own project is separate from data synced with the default sign-in. Use the same option on every device."
- **One helper for every Firefox prompt:** `ensureProxyPermission()` in the component.
  - It returns `true` immediately when not on Firefox. On Firefox it returns `await requestSpecificPermission(PROXY_ORIGIN_PATTERN)`.
  - It must be the **first `await`** in each click handler that uses it: `handleSharedLogin()`, `handleReconnect()` when `cloudSyncStore.authMode === 'shared'`, and the Grant-access button. Firefox only allows `permissions.request()` while handling a user action ([MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request)).
  - If it returns `false`, show `shared.firefoxPermissionDenied` and stop.
- Logged-in screen:
  - The reauth banner shows the `PUBLISH_APP_URL` link only when `cloudSyncStore.authMode === 'custom'`.
  - Its Reconnect button goes through `ensureProxyPermission()` for shared sessions, as above.
  - New banner when `cloudSyncStore.needsProxyPermission`: explanation plus a "Grant access" button → `grantProxyPermission()`. Call it directly in the click handler, same gesture rule.
- `CloudSyncUserCard`: add `authMode` to the debug info it shows. Only pass `clientId` and `clientSecret` when the mode is custom.

**i18n**: add keys to all 8 files `src/lib/locales/{en,vi,de,es,fr,ja,ko,zh-CN}.json` under `cloudSync`:
- `shared.note`
- `shared.firefoxPermissionDenied`
- `byok.advancedToggle`
- `byok.signInWithProject`
- `byok.separateDataNote`
- `reauth.sharedDescription`
- `proxyPermission.title`, `proxyPermission.description`, `proxyPermission.button`

Write en and vi by hand; the others are best-effort translations.

**Verify:**
- `npm test` and `npm run check` pass.
- `npm run build` and `npm run build:firefox` succeed.
- `.output/firefox*/manifest.json` contains `https://oauth.summarizerrrr.com/*` in `optional_permissions` and not in `host_permissions`.
- `.output/chrome-mv3/manifest.json` is unchanged apart from the version.

## Phase 5: Manual end-to-end pass
Needs Phase 1 published and Phase 2 deployed.

**Test build IDs.** Firefox is fine as a temporary add-on: its redirect hash comes from the fixed gecko ID, so it matches the allowlisted `5addcb3f…` URI. An **unpacked Chrome build gets a random ID** unless the manifest pins a `key`. Pick one of these:
- (a) Pin the Chrome Web Store build's public `key` in a local, uncommitted dev manifest override, so the unpacked ID equals `ahfjnd…`.
- (b) Temporarily allowlist the unpacked ID in **all three** places, then remove it after testing:
  - Google client Authorized redirect URIs: `https://<id>.chromiumapp.org/`
  - worker `ALLOWED_ORIGINS`: `chrome-extension://<id>`
  - worker `ALLOWED_REDIRECT_URIS`
  - Then `wrangler deploy`. If only Google is updated, `/exchange` returns 403 from the worker.

**Forcing a refresh.** `getValidAccessToken()` serves `tokenCache` from memory first, so editing storage alone doesn't trigger a refresh in a context that has already synced. After setting `syncState.tokenExpiry` to a past timestamp in DevTools storage:
- **close and reopen the Settings page** (a fresh module means an empty cache) before clicking Sync now;
- for the background alarm path, reload the extension.
Pass criterion: a `POST …/refresh` request actually appears in that context's Network panel. The Settings page's DevTools for Sync now; the background or service-worker inspector for auto-sync.

1. Chrome:
   - Shared sign-in → profile card appears → Sync now works and the files appear in the Drive "Summarizerrrr" folder.
   - Expire the token as described above. `oauth.summarizerrrr.com/refresh` is visible, and sync succeeds.
2. Log out, open Advanced, sign in with your own project. Sync works, and the refresh goes to `oauth2.googleapis.com/token` (same forced-refresh steps).
   - **Expected:** the shared-mode data is *not* visible here. A second `Summarizerrrr` folder may appear in Drive. See the "Drive data is per OAuth project" limitation.
3. Firefox (`npm run build:firefox`, temporary add-on):
   - Shared sign-in shows the permission prompt. Decline → the explanation appears and there is no sign-in. Grant → sign-in works.
   - Revoke the permission in about:addons. With the Settings page open, let the background auto-sync run (or reload the extension). Within 30 s the "Grant access" banner appears, not the Reconnect banner. Grant → sync resumes.
   - `needsReauth` plus revoked: to get a Reconnect banner, set `syncState.needsReauth = true` in storage and reopen Settings. Revoke the permission, then click Reconnect → the permission prompt appears first. Decline → no OAuth window opens.
4. Upgrade path: a profile that was signed in with BYOK before this change still syncs after the update, without signing in again.

**Verify:** all 4 scenarios behave as described.

## Known limitation: Drive data is per OAuth project
The `drive.file` scope only gives access to files that **this OAuth client** created or opened ([Google docs](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)). The shared client and a user's own BYOK project are different clients. So with the same Google account:
- each mode sees only its own `Summarizerrrr` folder and files;
- switching mode makes the folder lookup in `googleDriveAdapter.js` (around line 611, `q=name='Summarizerrrr' …`) find nothing, so it creates a **second** `Summarizerrrr` folder.

Devices only sync with each other when they all use the same mode (and, for BYOK, the same project). V1 accepts this and states it in the UI (`byok.separateDataNote`). Moving data across modes is out of scope.

## Out of scope (V1)
- Migrating Drive data between the shared and BYOK modes, or merging the two `Summarizerrrr` folders.
- Migrating BYOK users onto the shared client automatically. They switch by logging out and in.
- Any server-side storage, user accounts or analytics in the worker.
- Rate limiting in the worker. Add the Cloudflare Rate Limiting binding later if it gets abused.
- Safari sign-in changes and Chrome/Edge manifest changes.
- Changing `ExportImport.svelte` `syncCredentials`. It still only carries BYOK credentials.
- Sync algorithm, Drive file format, or `drive.file` scope changes.

## Final verification checklist
- [ ] Shared GCP app is "In production"; branding submitted; scopes and redirect URIs correct
- [ ] Worker deployed; the 4 `curl` checks from Phase 2 pass
- [ ] `npm test` green, including the new cases in `tests/api/cloudSyncReauth.test.js` and the layering guard
- [ ] `npm run check` shows no new errors
- [ ] `npm run build` and `npm run build:firefox` succeed; Firefox manifest has the optional origin
- [ ] Manual pass: Chrome shared and BYOK (with a `/refresh` request actually seen), Firefox permission grant/deny/revoke (banner shows up in Settings when the failure happened in the background), Reconnect with the permission revoked, legacy BYOK upgrade

## Notable files
- `cloudflare-worker/oauth-proxy.js`: origin/redirect allowlists, CORS on every response, safe upstream parsing
- `cloudflare-worker/wrangler.toml` (new): deploy config; the `GOOGLE_CLIENT_ID` var must equal the adapter's `CLIENT_ID`
- `src/services/cloudSync/googleDriveAdapter.js`: shared `obtainAuthCode()`, both auth entry points kept
- `src/services/cloudSync/cloudSyncService.svelte.js`: `authMode`, legacy migration, mode-aware `login`/`reconnect`/`doRefreshToken`, `needsProxyPermission`, `grantProxyPermission()`
- `src/entrypoints/settings/components/tools/CloudSyncToolSettings.svelte`: shared-first UI, BYOK under Advanced, Firefox permission request and banner
- `wxt.config.ts`: Firefox `optional_permissions` gets `https://oauth.summarizerrrr.com/*`
- `src/lib/locales/*.json`: new `cloudSync.*` keys (8 files)
- `tests/api/cloudSyncReauth.test.js`: shared/custom/migration/Firefox-permission cases
