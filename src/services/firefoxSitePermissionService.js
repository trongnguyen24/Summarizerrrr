// @ts-nocheck
import { browser } from 'wxt/browser'

/**
 * Firefox Site Permission Service
 *
 * Firefox (MV2) ships a single `optional_permissions: ["<all_urls>"]` entry.
 * `browser.permissions.request()` can request a *subset* of that origin (a
 * single site) without any manifest change — see the "Key finding" section of
 * docs/firefox-site-permissions-v1.md.
 *
 * This module is split into two halves:
 *  - Pure helpers (top of file): plain data in, plain data out. No `browser`
 *    access, so they are unit-testable without a `browser` mock (this repo
 *    has none — see tests/setup/vitest.js).
 *  - Browser wrappers (bottom of file): thin `browser.permissions` /
 *    `browser.runtime` calls built on top of the pure helpers.
 *
 * Layering (CLAUDE.md): src/services/** may import lib, services, and
 * stores/settingsStore only. This service intentionally imports none of
 * those — it stays store-free so components own the settings write-back.
 */

/** The literal optional-permission origin declared in the manifest. */
export const ALL_URLS = '<all_urls>'

const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/
const DOMAIN_LABEL_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i

/** True for IPv4 literals (`127.0.0.1`) and IPv6 literals (`::1`, `[::1]`, `fe80::1`). */
function isIpLiteral(host) {
  if (!host) return false
  if (IPV4_RE.test(host)) return true
  const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
  return bare.includes(':')
}

/**
 * Extracts a lowercase hostname from a URL, with `www.` stripped and the
 * port dropped. Returns `null` for schemes that can never be granted a host
 * permission (`about:`, `file:`, `moz-extension:`, …) or for unparsable URLs.
 * @param {string} url
 * @returns {string|null}
 */
export function urlToDomain(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    let host = parsed.hostname.toLowerCase()
    if (!host) return null
    if (host.startsWith('www.')) host = host.slice(4)
    return host || null
  } catch {
    return null
  }
}

/**
 * Converts a domain into a WebExtension match-pattern origin.
 * `example.com` → `*://*.example.com/*`. A `*.` prefix is illegal before an
 * IP literal or a single-label host (e.g. `localhost`), so those emit
 * `*://<host>/*` instead. An already-wildcarded input (`*.example.com`) is
 * normalized rather than double-wildcarded.
 * @param {string} domain
 * @returns {string|null}
 */
export function domainToOriginPattern(domain) {
  if (!domain || typeof domain !== 'string') return null
  let host = domain.trim().toLowerCase()
  if (!host) return null

  if (host.startsWith('*.')) {
    host = host.slice(2)
    if (!host) return null
    return `*://*.${host}/*`
  }

  if (isIpLiteral(host) || !host.includes('.')) {
    return `*://${host}/*`
  }

  return `*://*.${host}/*`
}

/**
 * Splits a match pattern into its bare host and whether the pattern covers
 * subdomains. Only an explicit `*.` host wildcard does:
 *   `*://*.youtube.com/*` → { domain: 'youtube.com', includesSubdomains: true }
 *   `*://openrouter.ai/*` → { domain: 'openrouter.ai', includesSubdomains: false }
 * That distinction is load-bearing for `isCoveredByManifest()` in
 * firefoxPermissionService.js: the manifest declares the educational sites
 * with a wildcard but the API hosts without one, so `docs.openrouter.ai` must
 * NOT be treated as already-granted just because `openrouter.ai` is.
 *
 * Ports are preserved. `http://localhost:11434/*` and a user grant of
 * `*://localhost/*` are genuinely different permissions (one port vs. all), so
 * collapsing them would hide a real user grant from the Site Access list.
 *
 * Returns null for `<all_urls>` and unparsable input.
 * @param {string} pattern
 * @returns {{domain: string, includesSubdomains: boolean}|null}
 */
export function parseOriginPattern(pattern) {
  if (!pattern || typeof pattern !== 'string') return null
  if (pattern === ALL_URLS) return null

  const schemeIdx = pattern.indexOf('://')
  const rest = schemeIdx >= 0 ? pattern.slice(schemeIdx + 3) : pattern

  const slashIdx = rest.indexOf('/')
  let host = slashIdx >= 0 ? rest.slice(0, slashIdx) : rest

  const includesSubdomains = host.startsWith('*.')
  if (includesSubdomains) host = host.slice(2)
  host = host.toLowerCase()

  if (!host) return null
  return { domain: host, includesSubdomains }
}

/**
 * Reverses `domainToOriginPattern` (and normalizes any `scheme://host/path`
 * match pattern in general) down to a bare domain. Thin wrapper over
 * `parseOriginPattern` for callers that only need the host.
 * @param {string} pattern
 * @returns {string|null}
 */
export function originPatternToDomain(pattern) {
  return parseOriginPattern(pattern)?.domain ?? null
}

/**
 * Validates a user-typed domain for the Site Access add-domain input. Only a
 * plain domain or a `*.domain` wildcard is accepted — deliberately stricter
 * than (and NOT shared with) `isValidDomainPattern` in FABSettings.svelte,
 * which allows display-matching patterns like `google.*` that are not legal
 * WebExtension origin patterns.
 * @param {string} domain
 * @returns {boolean}
 */
export function isValidPermissionDomain(domain) {
  if (!domain || typeof domain !== 'string') return false
  if (/\s/.test(domain)) return false

  let host = domain.toLowerCase()
  if (host.startsWith('*.')) {
    host = host.slice(2)
  } else if (host.includes('*')) {
    return false // '*' is only legal as a leading '*.' wildcard
  }

  if (!host || host.startsWith('.') || host.endsWith('.') || host.includes('..')) {
    return false
  }

  return host.split('.').every((label) => DOMAIN_LABEL_RE.test(label))
}

/**
 * True if `domain` is already covered by one of `patterns`. A pattern covers a
 * subdomain only when it carries an explicit `*.` wildcard, so
 * `*://*.youtube.com/*` covers `www.youtube.com` while `*://openrouter.ai/*`
 * does not cover `docs.openrouter.ai`.
 *
 * Single source of truth for permission subsumption: used both by
 * `subtractManifestOrigins` (to keep statically-granted hosts out of the Site
 * Access list) and by `isCoveredByManifest` in firefoxPermissionService.js (to
 * skip prompting for them).
 * @param {string} domain
 * @param {string[]} patterns
 * @returns {boolean}
 */
export function isDomainCoveredByPatterns(domain, patterns) {
  if (!domain) return false
  for (const pattern of patterns || []) {
    const parsed = parseOriginPattern(pattern)
    if (!parsed) continue
    if (domain === parsed.domain) return true
    if (parsed.includesSubdomains && domain.endsWith('.' + parsed.domain)) {
      return true
    }
  }
  return false
}

/**
 * Subtracts manifest-declared origins from a set of granted origins, leaving
 * only what the user actually granted and can actually revoke.
 *
 * Matching is by *subsumption*, not string or exact-domain equality: a grant
 * for `*://www.youtube.com/*` is already covered by the manifest's
 * `*://*.youtube.com/*`, so it must not appear in the list — revoking the
 * optional permission would not change effective access, leaving the user with
 * a chip whose remove button does nothing.
 *
 * Each survivor keeps the **granted origin verbatim** alongside its display
 * domain. Re-deriving the pattern from the domain is lossy — `www.youtube.com`
 * would map back to `*://*.www.youtube.com/*`, which is not what was granted —
 * so `permissions.remove()` must be handed the original string.
 *
 * `<all_urls>` is always excluded.
 * @param {string[]} grantedOrigins - e.g. `browser.permissions.getAll().origins`
 * @param {string[]} manifestOrigins - e.g. `getManifestOriginPatterns()`
 * @returns {Array<{domain: string, origin: string}>} sorted by domain, deduplicated
 */
export function subtractManifestOrigins(grantedOrigins, manifestOrigins) {
  const manifestPatterns = (manifestOrigins || []).filter(
    (pattern) => pattern !== ALL_URLS
  )

  const byDomain = new Map()
  for (const origin of grantedOrigins || []) {
    if (origin === ALL_URLS) continue
    const domain = originPatternToDomain(origin)
    if (!domain) continue
    if (isDomainCoveredByPatterns(domain, manifestPatterns)) continue
    if (!byDomain.has(domain)) byDomain.set(domain, { domain, origin })
  }

  return [...byDomain.values()].sort((a, b) => a.domain.localeCompare(b.domain))
}

// ---------------------------------------------------------------------------
// Browser wrappers
// ---------------------------------------------------------------------------

/**
 * Every origin pattern the manifest declares statically, from all three places
 * they can hide. Pure: takes the manifest object so it is testable.
 *
 *  - `permissions` — MV2 mixes API permissions and host patterns into one flat
 *    array (WXT folds `host_permissions` in here). API permissions like
 *    `storage` or `tabs` never contain `://`, so a filter separates them.
 *  - `host_permissions` — MV3 keeps these separate; read both so the helper is
 *    correct regardless of manifest version.
 *  - `content_scripts[].matches` — **easy to miss and load-bearing.** Firefox
 *    grants these as install-time origins and reports them from
 *    `permissions.getAll()`, but they are *required*, not optional, so
 *    `permissions.remove()` cannot revoke them. Omitting them puts the
 *    extension's own external-chat targets (chatgpt.com, gemini.google.com,
 *    grok.com, www.perplexity.ai) in the Site Access list with a remove button
 *    that silently does nothing.
 *
 * `web_accessible_resources[].matches` is deliberately excluded: it controls
 * which pages may load a resource, not what the extension can access.
 * @param {object} manifest - the object from `browser.runtime.getManifest()`
 * @returns {string[]} deduplicated origin patterns
 */
export function collectManifestOriginPatterns(manifest) {
  const isOriginPattern = (p) =>
    typeof p === 'string' && (p.includes('://') || p === ALL_URLS)

  const patterns = [
    ...(manifest?.permissions || []).filter(isOriginPattern),
    ...(manifest?.host_permissions || []).filter(isOriginPattern),
    ...(manifest?.content_scripts || []).flatMap((entry) =>
      (entry?.matches || []).filter(isOriginPattern)
    ),
  ]

  return [...new Set(patterns)]
}

/**
 * `collectManifestOriginPatterns` applied to this extension's own manifest.
 * @returns {string[]}
 */
export function getManifestOriginPatterns() {
  try {
    return collectManifestOriginPatterns(browser.runtime.getManifest())
  } catch (error) {
    console.error(
      '[FirefoxSitePermissionService] Error reading manifest permissions:',
      error
    )
    return []
  }
}

/**
 * Currently-granted per-site entries, with manifest-declared origins (static
 * host permissions and `<all_urls>` itself) subtracted out. Each entry carries
 * the verbatim granted `origin` so it can be revoked exactly.
 * @returns {Promise<Array<{domain: string, origin: string}>>}
 */
export async function listGrantedSites() {
  try {
    const { origins = [] } = await browser.permissions.getAll()
    return subtractManifestOrigins(origins, getManifestOriginPatterns())
  } catch (error) {
    console.error(
      '[FirefoxSitePermissionService] Error listing granted sites:',
      error
    )
    return []
  }
}

/**
 * @returns {Promise<boolean>} true if `<all_urls>` is currently granted.
 */
export async function hasAllSitesAccess() {
  try {
    return await browser.permissions.contains({ origins: [ALL_URLS] })
  } catch (error) {
    console.error(
      '[FirefoxSitePermissionService] Error checking all-sites access:',
      error
    )
    return false
  }
}

/**
 * Requests `<all_urls>`. Must be called from inside a user-gesture handler.
 * @returns {Promise<boolean>} true if the user granted access.
 */
export async function grantAllSitesAccess() {
  try {
    return await browser.permissions.request({ origins: [ALL_URLS] })
  } catch (error) {
    console.error(
      '[FirefoxSitePermissionService] Error granting all-sites access:',
      error
    )
    return false
  }
}

/**
 * Revokes `<all_urls>`. Unlike a request, `permissions.remove()` needs no
 * user gesture.
 * @returns {Promise<boolean>} true if removal succeeded.
 */
export async function revokeAllSitesAccess() {
  try {
    return await browser.permissions.remove({ origins: [ALL_URLS] })
  } catch (error) {
    console.error(
      '[FirefoxSitePermissionService] Error revoking all-sites access:',
      error
    )
    return false
  }
}

/**
 * Requests a single site's origin pattern. Must be called from inside a
 * user-gesture handler.
 * @param {string} domain
 * @returns {Promise<boolean>} true if the user granted access.
 */
export async function grantSite(domain) {
  const pattern = domainToOriginPattern(domain)
  if (!pattern) return false
  try {
    return await browser.permissions.request({ origins: [pattern] })
  } catch (error) {
    console.error('[FirefoxSitePermissionService] Error granting site:', error)
    return false
  }
}

/**
 * Revokes one granted origin pattern verbatim. No user gesture required.
 *
 * Takes the origin, not a domain: re-deriving a pattern from a display domain
 * silently fails to remove anything whenever the granted pattern was not in
 * `*://*.<domain>/*` form (e.g. a stored `*://www.youtube.com/*` would be
 * looked up as `*://*.www.youtube.com/*`). Pass the string that
 * `listGrantedSites()` reported.
 * @param {string} origin
 * @returns {Promise<boolean>} true if removal succeeded.
 */
export async function revokeOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false
  try {
    return await browser.permissions.remove({ origins: [origin] })
  } catch (error) {
    console.error('[FirefoxSitePermissionService] Error revoking origin:', error)
    return false
  }
}
