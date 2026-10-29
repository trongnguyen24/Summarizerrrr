/**
 * Stable, non-cryptographic FNV-1a hash of a string, formatted as
 * `fnv1a-<hex>`. Used to fingerprint captured source content so the same text
 * always yields the same key (sourceKey dedupe, content change detection).
 *
 * @param {string} content
 * @returns {string}
 */
export function stableContentHash(content) {
  let hash = 2166136261
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`
}
