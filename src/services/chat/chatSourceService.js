import { browser } from 'wxt/browser'
import { getPageContent } from '@/services/contentService.js'
import { checkPermission } from '@/services/firefoxPermissionService.js'
import { conversationRepository } from '@/lib/db/conversationRepository.js'
import { fetchYouTubeComments, formatCommentsForAI } from '@/lib/utils/youtubeUtils.js'
import { resolveAutoSourceKind, contentTypeForKind, SOURCE_KINDS } from './sourceResolution.js'

function normalizeUrl(url) {
  try {
    const normalized = new URL(url)
    normalized.hash = ''
    return normalized.toString()
  } catch {
    return String(url || '')
  }
}

function stableContentHash(content) {
  let hash = 2166136261
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`
}

/**
 * Build the cache key used by `sourceIdsByTab`.
 * Differentiates entries so a transcript and comments for the same tab
 * never collide.
 *
 * @param {number} tabId
 * @param {string} normalizedUrl
 * @param {string} sourceKind
 * @returns {string}
 */
function cacheKey(tabId, normalizedUrl, sourceKind) {
  return `${tabId}|${normalizedUrl}|${sourceKind}`
}

/**
 * Captures immutable active-tab snapshots and caches them for the runtime
 * session. The cache only avoids repeated extraction; persistence remains the
 * source of truth and deduplicates by normalized URL plus content hash.
 */
export function createChatSourceService({
  browserApi = browser,
  getPageContentFn = getPageContent,
  fetchCommentsFn = fetchYouTubeComments,
  formatCommentsFn = formatCommentsForAI,
  repository = conversationRepository,
  checkPermissionFn = checkPermission,
  isFirefox = () => import.meta.env.BROWSER === 'firefox',
} = {}) {
  /** @type {Map<string, {sourceId: string, normalizedUrl: string}>} */
  const sourceIdsByTab = new Map()

  async function getActiveTab() {
    const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url) throw new Error('Could not identify the active tab.')
    return tab
  }

  /**
   * Capture page content (transcript, course transcript, or webpage text)
   * for the given tab and source kind.
   *
   * @param {{id: number, url: string, title?: string}} tab
   * @param {string} sourceKind
   * @returns {Promise<string>}
   */
  async function capturePageContent(tab, sourceKind) {
    // Firefox site access can be revoked per-site from Settings → Site Access
    // at any point after an @tab chip was added. getPageContent() swallows
    // every executeScript rejection and falls through to an empty string, so
    // without this check the user would be told the *page* had no readable
    // content — blaming the site for a permission the extension simply no
    // longer holds, with no hint of how to fix it.
    if (isFirefox() && !(await checkPermissionFn(tab.url))) {
      let host = tab.url
      try {
        host = new URL(tab.url).hostname
      } catch {
        // Keep the raw URL if it will not parse.
      }
      throw new Error(
        `Summarizerrrr does not have permission to read ${host}. Open Settings → Site Access to allow it, then try again.`
      )
    }

    const contentType = contentTypeForKind(sourceKind)
    const extracted = await getPageContentFn({ tabId: tab.id, url: tab.url, contentType, preferredLang: 'en' })
    const content = String(extracted?.content || '').trim()
    if (!content) {
      throw new Error(
        sourceKind === SOURCE_KINDS.youtubeTranscript
          ? 'No transcript is available for this video. The video may not have captions. Try a different video or switch to Web page mode.'
          : sourceKind === SOURCE_KINDS.courseTranscript
            ? 'No transcript is available for this course lesson. Navigate to a lesson with captions and try again.'
            : 'The active tab did not provide readable content. Try refreshing the page or navigating to a different URL.'
      )
    }
    return content
  }

  /**
   * Capture YouTube comments for the given tab.
   *
   * @param {{id: number, url: string, title?: string}} tab
   * @param {{commentLimit?: number, replyLimit?: number}} [opts]
   * @returns {Promise<{content: string, commentLimit: number, replyLimit: number, fetchedCount: number}>}
   */
  async function captureComments(tab, { commentLimit = 60, replyLimit = 10 } = {}) {
    let response
    try {
      response = await fetchCommentsFn(tab.id, { maxComments: commentLimit, maxRepliesPerComment: replyLimit })
    } catch (error) {
      throw new Error(
        `Could not fetch comments for this video. ${error?.message || 'The comment bridge may have timed out.'} Try scrolling down to load comments first, then retry.`
      )
    }

    const comments = response?.comments
    if (!comments || comments.length === 0) {
      throw new Error('No comments are available for this video. Comments may be disabled or the video may be too new. Try a different video.')
    }

    const metadata = response?.metadata || {}
    const content = formatCommentsFn(comments, metadata)
    if (!content || content === 'No comments available.') {
      throw new Error('The fetched comments could not be processed. Try scrolling through the comments section, then retry.')
    }

    return { content, commentLimit, replyLimit, fetchedCount: comments.length }
  }

  /**
   * Build a source snapshot and persist it, returning the record.
   *
   * @param {{id: number, url: string, title?: string}} tab
   * @param {string} content
   * @param {string} sourceKind
   * @param {object} [extraProvenance]
   */
  async function persistSnapshot(tab, content, sourceKind, extraProvenance = {}) {
    const normalizedUrl = normalizeUrl(tab.url)
    const contentHash = stableContentHash(content)
    const sourceKey = `${normalizedUrl}:${sourceKind}:${contentHash}`

    const source = await repository.putSourceSnapshot({
      normalizedUrl,
      url: tab.url,
      title: tab.title || normalizedUrl,
      sourceType: sourceKind,
      sourceKey,
      contentHash,
      rawContent: content,
      condensedContent: null,
      condensationVersion: 0,
      condensationLanguage: 'en',
      originalLength: content.length,
      tabIdHint: tab.id,
      ...extraProvenance,
    })

    const key = cacheKey(tab.id, normalizedUrl, sourceKind)
    sourceIdsByTab.set(key, { sourceId: source.id, normalizedUrl })
    return source
  }

  return {
    getActiveTab,

    /**
     * @param {string} [sourceKind] Defaults to `resolveAutoSourceKind(tab.url)`.
     */
    async getCachedActiveSource(sourceKind) {
      const tab = await getActiveTab()
      const kind = sourceKind || resolveAutoSourceKind(tab.url)
      const key = cacheKey(tab.id, normalizeUrl(tab.url), kind)
      const cached = sourceIdsByTab.get(key)
      if (!cached || cached.normalizedUrl !== normalizeUrl(tab.url)) return null
      const source = await repository.getSourceById(cached.sourceId)
      return source ? { source, tab } : null
    },

    /**
     * @param {string} [sourceKind] Defaults to `resolveAutoSourceKind(tab.url)`.
     *   Pass `'youtubeComments'` only when explicitly requested — it is never
     *   returned by `resolveAutoSourceKind`.
     * @param {{commentLimit?: number}} [opts]
     */
    async captureActiveSource(sourceKind, opts = {}) {
      const tab = await getActiveTab()
      const kind = sourceKind || resolveAutoSourceKind(tab.url)

      // Check cache
      const key = cacheKey(tab.id, normalizeUrl(tab.url), kind)
      const cached = sourceIdsByTab.get(key)
      if (cached?.normalizedUrl === normalizeUrl(tab.url)) {
        const source = await repository.getSourceById(cached.sourceId)
        if (source) return { source, tab }
      }

      // Capture
      if (kind === SOURCE_KINDS.youtubeComments) {
        const { content, commentLimit, replyLimit, fetchedCount } = await captureComments(tab, { commentLimit: opts.commentLimit })
        const source = await persistSnapshot(tab, content, kind, { commentLimit, replyLimit, fetchedCount })
        return { source, tab }
      }

      const content = await capturePageContent(tab, kind)
      const source = await persistSnapshot(tab, content, kind)
      return { source, tab }
    },

    /**
     * @param {object} attachment
     * @param {string} [sourceKind] Defaults to `resolveAutoSourceKind(tab.url)`.
     * @param {{commentLimit?: number}} [opts]
     */
    async captureTabSource(attachment, sourceKind, opts = {}) {
      const tab = await browserApi.tabs.get(attachment.tabId)
      if (!tab?.url) throw new Error(`The selected tab "${attachment.title || attachment.tabId}" was closed.`)
      if (attachment.url && normalizeUrl(tab.url) !== normalizeUrl(attachment.url)) {
        throw new Error(`The selected tab "${attachment.title || tab.title}" navigated before capture. Select it again.`)
      }

      const kind = sourceKind || resolveAutoSourceKind(tab.url)

      // Check cache
      const key = cacheKey(tab.id, normalizeUrl(tab.url), kind)
      const cached = sourceIdsByTab.get(key)
      if (cached?.normalizedUrl === normalizeUrl(tab.url)) {
        const source = await repository.getSourceById(cached.sourceId)
        if (source) return { source, tab }
      }

      // Capture
      if (kind === SOURCE_KINDS.youtubeComments) {
        const { content, commentLimit, replyLimit, fetchedCount } = await captureComments(tab, { commentLimit: opts.commentLimit })
        // Re-check navigation after async fetch
        const after = await browserApi.tabs.get(tab.id)
        if (!after?.url || normalizeUrl(after.url) !== normalizeUrl(tab.url)) {
          throw new Error(`The selected tab "${attachment.title || tab.title}" changed during capture. Select it again.`)
        }
        const source = await persistSnapshot(tab, content, kind, { commentLimit, replyLimit, fetchedCount })
        return { source, tab }
      }

      const content = await capturePageContent(tab, kind)
      // Re-check navigation after async extraction
      const after = await browserApi.tabs.get(tab.id)
      if (!after?.url || normalizeUrl(after.url) !== normalizeUrl(tab.url)) {
        throw new Error(`The selected tab "${attachment.title || tab.title}" changed during capture. Select it again.`)
      }
      const source = await persistSnapshot(tab, content, kind)
      return { source, tab }
    },

    forgetTab(tabId) {
      // Remove all cache entries for this tabId (across all kinds/urls)
      for (const [key] of sourceIdsByTab) {
        if (key.startsWith(`${tabId}|`)) {
          sourceIdsByTab.delete(key)
        }
      }
    },
  }
}

export const chatSourceService = createChatSourceService()
