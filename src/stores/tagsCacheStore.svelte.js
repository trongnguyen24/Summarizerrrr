// @ts-nocheck
import {
  getAllTags,
  getTagCounts,
  getSummaryCount,
} from '@/lib/db/indexedDBService'

/**
 * Cache store cho tags data để tránh layout shift khi chuyển tab archive
 */
export const tagsCache = $state({
  tags: [],
  tagCounts: {},
  totalCount: 0,
  isLoaded: false,
  isLoading: false,
  lastUpdated: null,
  error: null,
})

/**
 * Preload tags data trong background để sẵn sàng khi cần
 */
export async function preloadTagsData() {
  // Nếu đang loading hoặc đã load gần đây thì skip
  if (tagsCache.isLoading || (tagsCache.isLoaded && isRecentlyLoaded())) {
    return tagsCache
  }

  tagsCache.isLoading = true
  tagsCache.error = null

  try {
    // Load tất cả data cần thiết song song
    const [tagsResult, tagCountsResult, totalCountResult] = await Promise.all([
      getAllTags().catch(() => []),
      getTagCounts().catch(() => ({})),
      getSummaryCount().catch(() => 0),
    ])

    // Sort tags theo tên (Vietnamese locale)
    tagsCache.tags =
      tagsResult?.sort((a, b) =>
        a.name.localeCompare(b.name, 'vi', {
          numeric: true,
          sensitivity: 'base',
        })
      ) || []

    tagsCache.tagCounts = tagCountsResult || {}
    tagsCache.totalCount = totalCountResult || 0
    tagsCache.isLoaded = true
    tagsCache.lastUpdated = Date.now()

    return tagsCache
  } catch (error) {
    tagsCache.error = error
    return tagsCache
  } finally {
    tagsCache.isLoading = false
  }
}

/**
 * Invalidate cache khi có thay đổi
 */
export function invalidateTagsCache() {
  tagsCache.isLoaded = false
  tagsCache.lastUpdated = null
}

/**
 * Force refresh cache
 */
export async function refreshTagsCache() {
  invalidateTagsCache()
  return await preloadTagsData()
}

/**
 * Check if data is recently loaded (trong vòng 5 phút)
 */
function isRecentlyLoaded() {
  if (!tagsCache.lastUpdated) return false
  return Date.now() - tagsCache.lastUpdated < 5 * 60 * 1000 // 5 minutes
}

/**
 * Get cache status for debugging
 */
export function getCacheStatus() {
  return {
    isLoaded: tagsCache.isLoaded,
    isLoading: tagsCache.isLoading,
    tagsCount: tagsCache.tags.length,
    totalCount: tagsCache.totalCount,
    lastUpdated: tagsCache.lastUpdated
      ? new Date(tagsCache.lastUpdated).toLocaleString()
      : null,
    hasError: !!tagsCache.error,
  }
}
