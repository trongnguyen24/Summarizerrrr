/**
 * Unit tests for the pure helpers in `firefoxSitePermissionService.js`.
 *
 * No `browser` mock is used: per the Phase 1 pure/impure split, none of the
 * functions under test touch `browser` — `manifestOrigins` is passed in as a
 * plain array rather than read from `getManifest()` inside the helper. The
 * module's browser wrappers (`listGrantedSites`, `grantSite`, etc.) are not
 * exercised here; only the pure top half of the file is.
 */

import { describe, it, expect } from 'vitest'
import {
  ALL_URLS,
  urlToDomain,
  domainToOriginPattern,
  originPatternToDomain,
  parseOriginPattern,
  isDomainCoveredByPatterns,
  isValidPermissionDomain,
  subtractManifestOrigins,
  collectManifestOriginPatterns,
} from '@/services/firefoxSitePermissionService.js'

describe('urlToDomain', () => {
  it('extracts the lowercase hostname from an https URL', () => {
    expect(urlToDomain('https://Example.com/path')).toBe('example.com')
  })

  it('extracts the lowercase hostname from an http URL', () => {
    expect(urlToDomain('http://example.com/path')).toBe('example.com')
  })

  it('strips a leading www.', () => {
    expect(urlToDomain('https://www.example.com/path')).toBe('example.com')
  })

  it('drops an explicit port', () => {
    expect(urlToDomain('https://example.com:8443/path')).toBe('example.com')
  })

  it('drops both www. and an explicit port together', () => {
    expect(urlToDomain('https://www.example.com:8080/')).toBe('example.com')
  })

  it('returns null for about: URLs', () => {
    expect(urlToDomain('about:blank')).toBeNull()
  })

  it('returns null for file: URLs', () => {
    expect(urlToDomain('file:///Users/me/page.html')).toBeNull()
  })

  it('returns null for moz-extension: URLs', () => {
    expect(urlToDomain('moz-extension://abc-123/options.html')).toBeNull()
  })

  it('returns null for unparsable input', () => {
    expect(urlToDomain('not a url')).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(urlToDomain(null)).toBeNull()
    expect(urlToDomain(undefined)).toBeNull()
  })
})

describe('domainToOriginPattern', () => {
  it('wraps an ordinary host with a wildcard subdomain', () => {
    expect(domainToOriginPattern('example.com')).toBe('*://*.example.com/*')
  })

  it('does not wildcard an IPv4 literal', () => {
    expect(domainToOriginPattern('127.0.0.1')).toBe('*://127.0.0.1/*')
  })

  it('does not wildcard localhost (single-label host)', () => {
    expect(domainToOriginPattern('localhost')).toBe('*://localhost/*')
  })

  it('normalizes an already-wildcarded input instead of double-wildcarding it', () => {
    expect(domainToOriginPattern('*.example.com')).toBe('*://*.example.com/*')
  })

  it('returns null for empty input', () => {
    expect(domainToOriginPattern('')).toBeNull()
    expect(domainToOriginPattern(null)).toBeNull()
  })
})

describe('originPatternToDomain', () => {
  it('round-trips with domainToOriginPattern for an ordinary host', () => {
    const domain = 'example.com'
    expect(originPatternToDomain(domainToOriginPattern(domain))).toBe(domain)
  })

  it('round-trips with domainToOriginPattern for a subdomain', () => {
    const domain = 'docs.google.com'
    expect(originPatternToDomain(domainToOriginPattern(domain))).toBe(domain)
  })

  it('round-trips with domainToOriginPattern for an IPv4 literal', () => {
    const domain = '127.0.0.1'
    expect(originPatternToDomain(domainToOriginPattern(domain))).toBe(domain)
  })

  it('round-trips with domainToOriginPattern for localhost', () => {
    const domain = 'localhost'
    expect(originPatternToDomain(domainToOriginPattern(domain))).toBe(domain)
  })

  it('returns null for the <all_urls> pattern', () => {
    expect(originPatternToDomain(ALL_URLS)).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(originPatternToDomain('')).toBeNull()
    expect(originPatternToDomain(null)).toBeNull()
  })
})

describe('parseOriginPattern', () => {
  it('reports subdomain coverage for a wildcarded host', () => {
    expect(parseOriginPattern('*://*.youtube.com/*')).toEqual({
      domain: 'youtube.com',
      includesSubdomains: true,
    })
  })

  it('does NOT report subdomain coverage for a bare host', () => {
    // The manifest declares API hosts without a `*.` wildcard. Treating them
    // as subdomain-covering would make isCoveredByManifest() claim
    // `docs.openrouter.ai` is already granted, so no prompt would ever appear
    // and the later executeScript would fail silently.
    expect(parseOriginPattern('*://openrouter.ai/*')).toEqual({
      domain: 'openrouter.ai',
      includesSubdomains: false,
    })
  })

  it('preserves the port and reports no subdomain coverage', () => {
    expect(parseOriginPattern('http://localhost:11434/*')).toEqual({
      domain: 'localhost:11434',
      includesSubdomains: false,
    })
  })

  it('lowercases the host', () => {
    expect(parseOriginPattern('https://API.OpenAI.com/*')).toEqual({
      domain: 'api.openai.com',
      includesSubdomains: false,
    })
  })

  it('returns null for <all_urls> and for empty input', () => {
    expect(parseOriginPattern(ALL_URLS)).toBeNull()
    expect(parseOriginPattern('')).toBeNull()
    expect(parseOriginPattern(null)).toBeNull()
  })
})

describe('isDomainCoveredByPatterns', () => {
  const patterns = ['*://*.youtube.com/*', '*://openrouter.ai/*']

  it('matches the exact host', () => {
    expect(isDomainCoveredByPatterns('youtube.com', patterns)).toBe(true)
    expect(isDomainCoveredByPatterns('openrouter.ai', patterns)).toBe(true)
  })

  it('matches a subdomain only under a wildcard pattern', () => {
    expect(isDomainCoveredByPatterns('www.youtube.com', patterns)).toBe(true)
    expect(isDomainCoveredByPatterns('m.youtube.com', patterns)).toBe(true)
    expect(isDomainCoveredByPatterns('docs.openrouter.ai', patterns)).toBe(false)
  })

  it('does not match on a bare suffix that is not a label boundary', () => {
    // `notyoutube.com` merely ends with `youtube.com`; the '.' guard matters.
    expect(isDomainCoveredByPatterns('notyoutube.com', patterns)).toBe(false)
  })

  it('returns false for empty input', () => {
    expect(isDomainCoveredByPatterns('', patterns)).toBe(false)
    expect(isDomainCoveredByPatterns('example.com', [])).toBe(false)
    expect(isDomainCoveredByPatterns('example.com', undefined)).toBe(false)
  })
})

describe('isValidPermissionDomain', () => {
  it('accepts a plain domain', () => {
    expect(isValidPermissionDomain('a.com')).toBe(true)
  })

  it('accepts a *.domain wildcard', () => {
    expect(isValidPermissionDomain('*.a.com')).toBe(true)
  })

  it('rejects a google.*-style pattern', () => {
    expect(isValidPermissionDomain('google.*')).toBe(false)
  })

  it('rejects a bare double dot', () => {
    expect(isValidPermissionDomain('..')).toBe(false)
  })

  it('rejects a leading dot', () => {
    expect(isValidPermissionDomain('.a.com')).toBe(false)
  })

  it('rejects a domain containing consecutive dots', () => {
    expect(isValidPermissionDomain('a..com')).toBe(false)
  })

  it('rejects a domain containing spaces', () => {
    expect(isValidPermissionDomain('a b.com')).toBe(false)
  })

  it('rejects empty and non-string input', () => {
    expect(isValidPermissionDomain('')).toBe(false)
    expect(isValidPermissionDomain(null)).toBe(false)
    expect(isValidPermissionDomain(undefined)).toBe(false)
  })
})

describe('collectManifestOriginPatterns', () => {
  it('reads host patterns out of the flat MV2 permissions array', () => {
    const manifest = {
      permissions: ['storage', 'tabs', 'alarms', '*://*.youtube.com/*'],
    }
    expect(collectManifestOriginPatterns(manifest)).toEqual([
      '*://*.youtube.com/*',
    ])
  })

  it('reads MV3 host_permissions too', () => {
    const manifest = {
      permissions: ['storage'],
      host_permissions: ['*://api.openai.com/*'],
    }
    expect(collectManifestOriginPatterns(manifest)).toEqual([
      '*://api.openai.com/*',
    ])
  })

  it('includes content_scripts matches', () => {
    // Firefox grants these at install and reports them from
    // permissions.getAll(), but they are required rather than optional, so
    // permissions.remove() cannot revoke them. They must be treated as
    // manifest-declared or the Site Access list offers a dead remove button.
    const manifest = {
      permissions: ['storage'],
      content_scripts: [
        { matches: ['*://chatgpt.com/*', '*://chat.openai.com/*'] },
        { matches: ['*://gemini.google.com/*'] },
      ],
    }
    expect(collectManifestOriginPatterns(manifest)).toEqual([
      '*://chatgpt.com/*',
      '*://chat.openai.com/*',
      '*://gemini.google.com/*',
    ])
  })

  it('deduplicates patterns declared in more than one place', () => {
    const manifest = {
      permissions: ['*://*.youtube.com/*'],
      content_scripts: [{ matches: ['*://*.youtube.com/*'] }],
    }
    expect(collectManifestOriginPatterns(manifest)).toEqual([
      '*://*.youtube.com/*',
    ])
  })

  it('ignores web_accessible_resources matches', () => {
    // Those control which pages may load a resource, not extension access.
    const manifest = {
      permissions: [],
      web_accessible_resources: [
        { resources: ['x.js'], matches: ['*://example.com/*'] },
      ],
    }
    expect(collectManifestOriginPatterns(manifest)).toEqual([])
  })

  it('tolerates a manifest with none of the keys', () => {
    expect(collectManifestOriginPatterns({})).toEqual([])
    expect(collectManifestOriginPatterns(undefined)).toEqual([])
  })
})

describe('subtractManifestOrigins', () => {
  const manifestOrigins = [
    ALL_URLS,
    '*://*.youtube.com/*',
    '*://*.udemy.com/*',
    '*://*.coursera.org/*',
    '*://*.reddit.com/*',
    '*://*.wikipedia.org/*',
    'https://api.openai.com/*',
    'http://localhost:11434/*',
    'storage',
    'tabs',
  ]

  /** Convenience: assert on the display domains only. */
  const domainsOf = (granted) =>
    subtractManifestOrigins(granted, manifestOrigins).map((entry) => entry.domain)

  it('keeps user-granted sites that are not covered by the manifest', () => {
    const granted = [
      '*://*.example.com/*',
      '*://*.news.ycombinator.com/*',
    ]
    expect(domainsOf(granted)).toEqual(['example.com', 'news.ycombinator.com'])
  })

  it('pairs each survivor with the granted origin verbatim', () => {
    // The origin must survive untouched: re-deriving it from the domain would
    // turn `*://www.perplexity.ai/*` into `*://*.www.perplexity.ai/*`, and
    // permissions.remove() would then silently remove nothing.
    expect(
      subtractManifestOrigins(['*://www.perplexity.ai/*'], manifestOrigins)
    ).toEqual([{ domain: 'www.perplexity.ai', origin: '*://www.perplexity.ai/*' }])
  })

  it('filters out the statically-granted content-script sites', () => {
    const granted = [
      '*://*.youtube.com/*',
      '*://*.udemy.com/*',
      '*://*.coursera.org/*',
      '*://*.reddit.com/*',
      '*://*.wikipedia.org/*',
      '*://*.example.com/*',
    ]
    expect(domainsOf(granted)).toEqual(['example.com'])
  })

  it('filters out subdomains covered by a wildcard manifest pattern', () => {
    // `*://*.youtube.com/*` in the manifest already covers these, so revoking
    // the optional permission would not change effective access — a chip whose
    // remove button does nothing. They must not be listed at all.
    expect(
      domainsOf([
        '*://www.youtube.com/*',
        '*://m.youtube.com/*',
        '*://*.example.com/*',
      ])
    ).toEqual(['example.com'])
  })

  it('does NOT filter subdomains of a non-wildcard manifest host', () => {
    // `https://api.openai.com/*` carries no `*.`, so it covers only that exact
    // host. A grant for a subdomain of it is a real, revocable user grant.
    expect(domainsOf(['*://*.eu.api.openai.com/*'])).toEqual([
      'eu.api.openai.com',
    ])
  })

  it('filters out manifest API hosts (api.openai.com, localhost)', () => {
    const granted = [
      'https://api.openai.com/*',
      'http://localhost:11434/*',
      '*://*.example.com/*',
    ]
    expect(domainsOf(granted)).toEqual(['example.com'])
  })

  it('filters the manifest localhost host regardless of the granted pattern shape', () => {
    // The manifest declares `http://localhost:11434/*`; Firefox may report the
    // same grant back with a different scheme wildcard. Normalization is by
    // host:port, so any spelling of that same origin still drops out.
    expect(domainsOf(['*://localhost:11434/*'])).toEqual([])
  })

  it('keeps an all-ports localhost grant, which is broader than the manifest entry', () => {
    // `*://localhost/*` (every port) is a genuinely different — and wider —
    // permission than the manifest's `http://localhost:11434/*`. It must stay
    // visible in the Site Access list so the user can revoke it; collapsing
    // ports would hide a real user grant behind an unrelated manifest entry.
    expect(domainsOf(['*://localhost/*'])).toEqual(['localhost'])
  })

  it("filters the extension's own external-chat content-script targets", () => {
    // Regression: these are declared only in content_scripts, so an earlier
    // getManifestOriginPatterns() that read `permissions` alone let them show
    // up as chips the user could not remove.
    const withContentScripts = collectManifestOriginPatterns({
      permissions: ['storage', '*://*.youtube.com/*'],
      content_scripts: [
        { matches: ['*://chatgpt.com/*', '*://chat.openai.com/*'] },
        { matches: ['*://gemini.google.com/*'] },
        { matches: ['*://grok.com/*'] },
        { matches: ['*://www.perplexity.ai/*'] },
      ],
    })
    const granted = [
      '*://chatgpt.com/*',
      '*://chat.openai.com/*',
      '*://gemini.google.com/*',
      '*://grok.com/*',
      '*://www.perplexity.ai/*',
      '*://www.youtube.com/*',
      '*://google.com/*', // a real user grant, NOT gemini.google.com's parent
      '*://voz.vn/*',
    ]
    expect(
      subtractManifestOrigins(granted, withContentScripts).map((e) => e.domain)
    ).toEqual(['google.com', 'voz.vn'])
  })

  it('excludes <all_urls> from the result even when granted', () => {
    expect(domainsOf([ALL_URLS, '*://*.example.com/*'])).toEqual(['example.com'])
  })

  it('returns a sorted, deduplicated list', () => {
    const granted = [
      '*://*.zeta.com/*',
      '*://*.alpha.com/*',
      '*://*.alpha.com/*',
    ]
    expect(domainsOf(granted)).toEqual(['alpha.com', 'zeta.com'])
  })

  it('returns an empty array when nothing is granted', () => {
    expect(subtractManifestOrigins([], manifestOrigins)).toEqual([])
    expect(subtractManifestOrigins(undefined, manifestOrigins)).toEqual([])
  })
})
