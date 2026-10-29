import { browser } from 'wxt/browser'
import { getPageContent } from '@/services/contentService.js'
import { checkPermission } from '@/services/firefoxPermissionService.js'
import { conversationRepository } from '@/lib/db/conversationRepository.js'
import { fetchYouTubeComments, formatCommentsForAI } from '@/lib/utils/youtubeUtils.js'
import { resolveAutoSourceKind, contentTypeForKind, SOURCE_KINDS } from './sourceResolution.js'
import { stableContentHash } from '@/lib/utils/contentHash.js'

function normalizeUrl(url) {
  try {
    const normalized = new URL(url)
    normalized.hash = ''
    return normalized.toString()
  } catch {
    return String(url || '')
  }
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

  /**
   * Re-capture the content of a stub source (metadata synced, content omitted)
   * and write it into the same record. Never throws.
   *
   * Uses an already-open tab with the same URL when there is one (waiting for
   * it if it is still loading; a discarded tab has no live page, so it is
   * passed over). Otherwise it opens a background tab, captures, and closes
   * that tab again. The timeout and `signal` really cancel: once either fires,
   * nothing is persisted, the listener is removed, and any tab this call
   * created is closed, even if it was created afterwards.
   *
   * @param {object} source Stub source record (must have id, url, normalizedUrl, sourceType).
   * @param {{timeoutMs?: number, signal?: AbortSignal}} [opts]
   * @returns {Promise<{source: object} | {error: string}>}
   */
  function hydrateSource(source, { timeoutMs = 15000, signal } = {}) {
    if (!source?.id || !source.url) return Promise.resolve({ error: 'The source has no URL to re-capture.' })
    if (source.sourceType === SOURCE_KINDS.youtubeComments) {
      return Promise.resolve({ error: 'comments are not re-captured' })
    }
    if (signal?.aborted) return Promise.resolve({ error: 'Cancelled.' })

    return new Promise((resolve) => {
      let settled = false
      let timer = null
      /** @type {((tabId: number, changeInfo: {status?: string}) => void) | null} */
      let onUpdated = null
      /** Id of a background tab this call created; null when none is open for us. */
      let createdTabId = null

      function closeCreatedTab(tabId) {
        Promise.resolve()
          .then(() => browserApi.tabs.remove(tabId))
          .catch(() => {})
      }

      // Idempotent: used by success, failure and timeout alike.
      function cleanup() {
        if (timer != null) {
          clearTimeout(timer)
          timer = null
        }
        if (onUpdated) {
          browserApi.tabs.onUpdated.removeListener(onUpdated)
          onUpdated = null
        }
        signal?.removeEventListener('abort', onAbort)
        if (createdTabId != null) {
          const tabId = createdTabId
          createdTabId = null
          closeCreatedTab(tabId)
        }
      }

      function settle(result) {
        if (settled) return
        settled = true
        cleanup()
        resolve(result)
      }

      function waitForComplete(tabId) {
        return new Promise((done) => {
          onUpdated = (updatedId, changeInfo) => {
            if (updatedId === tabId && changeInfo?.status === 'complete') done()
          }
          browserApi.tabs.onUpdated.addListener(onUpdated)
          // The tab may already have finished loading before the listener attached.
          Promise.resolve()
            .then(() => browserApi.tabs.get(tabId))
            .then((current) => {
              if (current?.status === 'complete') done()
            })
            .catch(() => {})
        })
      }

      function onAbort() {
        settle({ error: 'Cancelled.' })
      }

      timer = setTimeout(() => settle({ error: 'Timed out waiting for the page to load.' }), timeoutMs)
      signal?.addEventListener('abort', onAbort, { once: true })

      ;(async () => {
        try {
          const openTabs = await browserApi.tabs.query({})
          if (settled) return
          const openTab = (openTabs || []).find(
            (tab) =>
              tab?.id != null &&
              !tab.discarded &&
              tab.url &&
              normalizeUrl(tab.url) === source.normalizedUrl
          )

          let tab
          if (openTab) {
            // Never closed by this call: the user already had it open.
            if (openTab.status === 'loading') {
              await waitForComplete(openTab.id)
              if (settled) return
            }
            tab = openTab
          } else {
            const created = await browserApi.tabs.create({ url: source.url, active: false })
            if (settled) {
              // Timed out while the tab was being created: close it right away.
              if (created?.id != null) closeCreatedTab(created.id)
              return
            }
            createdTabId = created.id
            await waitForComplete(created.id)
            if (settled) return
            tab = { id: created.id, url: source.url, title: source.title }
          }

          const content = await capturePageContent(tab, source.sourceType)
          // Once timed out, never persist.
          if (settled) return
          const hydrated = await repository.hydrateSourceContent(source.id, content)
          settle({ source: hydrated || source })
        } catch (error) {
          settle({ error: error?.message || 'Could not re-capture the page.' })
        }
      })()
    })
  }

  return {
    getActiveTab,
    hydrateSource,

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
