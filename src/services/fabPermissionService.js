// @ts-nocheck

/**
 * Converts a wildcard pattern to a regular expression
 * @param {string} pattern - Pattern with * wildcards (e.g., "*.youtube.com", "google.*")
 * @returns {RegExp} - Regular expression for matching
 */
function wildcardToRegex(pattern) {
  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  // Replace * with regex equivalent for matching any characters
  const regex = escaped.replace(/\*/g, '[^.]*')
  return new RegExp(`^${regex}$`, 'i') // Case insensitive
}

/**
 * Checks if a hostname matches a domain pattern (with wildcard support)
 * @param {string} hostname - The hostname to check
 * @param {string} domainPattern - Domain pattern (may contain *)
 * @returns {boolean} - True if matches
 */
function matchesDomainPattern(hostname, domainPattern) {
  if (!hostname || !domainPattern) return false

  // If pattern contains *, use regex matching
  if (domainPattern.includes('*')) {
    const regex = wildcardToRegex(domainPattern)
    return regex.test(hostname)
  }

  // For simple patterns, use contains matching (backward compatibility)
  return hostname.includes(domainPattern)
}

/**
 * Checks if the Floating Action Button (FAB) should be shown on the current page based on user settings.
 * Supports wildcard patterns with * for flexible domain matching.
 * Examples: "*.youtube.com", "google.*", "*.google.*"
 * @param {string} url - The URL of the page.
 * @param {Object} fabDomainControl - Domain control settings object.
 * @param {string} fabDomainControl.mode - Control mode: 'all', 'whitelist', or 'blacklist'.
 * @param {string[]} fabDomainControl.whitelist - Array of whitelisted domain patterns.
 * @param {string[]} fabDomainControl.blacklist - Array of blacklisted domain patterns.
 * @returns {boolean} - True if the FAB should be shown, false otherwise.
 */
export function shouldShowFab(url, fabDomainControl) {
  if (!url) {
    return false // Cannot determine domain
  }

  // Handle backward compatibility - if old parameters are passed
  if (typeof fabDomainControl === 'boolean') {
    // Legacy call: shouldShowFab(url, enabled, whitelist)
    const enabled = fabDomainControl
    const whitelist = arguments[2]
    return shouldShowFabLegacy(url, enabled, whitelist)
  }

  // Extract domain control settings
  const {
    mode = 'all',
    whitelist = [],
    blacklist = [],
  } = fabDomainControl || {}

  try {
    const currentHostname = new URL(url).hostname

    switch (mode) {
      case 'all':
        return true // Show FAB on all sites

      case 'whitelist':
        if (whitelist.length === 0) {
          return false // If whitelist is empty, show nowhere
        }
        return whitelist.some(
          (domainPattern) =>
            typeof domainPattern === 'string' &&
            matchesDomainPattern(currentHostname, domainPattern)
        )

      case 'blacklist':
        if (blacklist.length === 0) {
          return true // If blacklist is empty, show everywhere
        }
        return !blacklist.some(
          (domainPattern) =>
            typeof domainPattern === 'string' &&
            matchesDomainPattern(currentHostname, domainPattern)
        )

      default:
        return true // Default to showing FAB everywhere
    }
  } catch (e) {
    // Invalid URL
    return false
  }
}

/**
 * Legacy function for backward compatibility
 * @param {string} url - The URL of the page.
 * @param {boolean} enabled - Whether FAB domain permissions are enabled.
 * @param {string[]} whitelist - Array of whitelisted domain patterns.
 * @returns {boolean} - True if the FAB should be shown, false otherwise.
 */
function shouldShowFabLegacy(url, enabled, whitelist) {
  if (!url) {
    return false
  }

  if (!enabled) {
    return true
  }

  let domains = []
  if (Array.isArray(whitelist)) {
    domains = whitelist
  } else if (typeof whitelist === 'object' && whitelist !== null) {
    domains = Object.values(whitelist).filter(
      (domain) => typeof domain === 'string'
    )
  }

  if (domains.length === 0) {
    return false
  }

  try {
    const currentHostname = new URL(url).hostname
    return domains.some(
      (domainPattern) =>
        typeof domainPattern === 'string' &&
        matchesDomainPattern(currentHostname, domainPattern)
    )
  } catch (e) {
    return false
  }
}
