// @ts-nocheck
import {
  addHistory,
  addSummary,
  updateHistoryArchivedStatus,
} from '@/lib/db/indexedDBService.js'
import { generateUUID } from '@/lib/utils/utils.js'
import { appStateStorage } from '@/services/wxtStorageService'

/**
 * Chuẩn bị dữ liệu tóm tắt từ local state để lưu vào DB
 * @param {object} localState - State từ useSummarization
 * @param {string} contentType - Loại nội dung (youtube, course, general)
 * @returns {Array<{title: string, content: string}>}
 */
function prepareSummaries(localState, contentType) {
  const summaries = []

  if (contentType === 'youtube') {
    if (localState.summary) {
      summaries.push({ title: 'Summary', content: localState.summary })
    }
    if (localState.chapterSummary) {
      summaries.push({
        title: 'Chapters',
        content: localState.chapterSummary,
      })
    }
  } else if (contentType === 'course') {
    if (localState.summary) {
      summaries.push({ title: 'Summary', content: localState.summary })
    }
    if (localState.courseConcepts) {
      summaries.push({
        title: 'Concepts',
        content: localState.courseConcepts,
      })
    }
  } else {
    if (localState.summary) {
      summaries.push({ title: 'Summary', content: localState.summary })
    }
  }

  return summaries.filter((s) => s.content && s.content.trim() !== '')
}

/**
 * Lưu tóm tắt từ Floating Panel vào History.
 * @param {object} localState - State từ useSummarization.
 * @param {{title: string, url: string}} pageInfo - Thông tin trang.
 * @returns {Promise<string>} - ID của history item đã được tạo.
 */
export async function saveToHistory(localState, pageInfo) {
  const summaries = prepareSummaries(localState, localState.contentType)

  if (summaries.length === 0) {
    console.warn('[FPStorageService] No summary content to save to history.')
    return null
  }

  const historyEntry = {
    id: generateUUID(),
    title: pageInfo.title,
    url: pageInfo.url,
    date: new Date().toISOString(),
    summaries: summaries,
    isArchived: false, // Mặc định là chưa archive
  }

  try {
    await addHistory(historyEntry)
    console.log('[FPStorageService] Saved to History:', historyEntry)
    // Notify other components that the data has been updated
    await appStateStorage.setValue({ data_updated_at: new Date().getTime() })
    return historyEntry.id
  } catch (error) {
    console.error('[FPStorageService] Error saving to History:', error)
    throw error // Re-throw để component có thể xử lý
  }
}

/**
 * Lưu tóm tắt từ Floating Panel vào Archive (bảng summaries).
 * @param {object} localState - State từ useSummarization.
 * @param {{title: string, url: string}} pageInfo - Thông tin trang.
 * @param {string|null} historySourceId - ID của history item gốc (nếu có).
 * @returns {Promise<string>} - ID của summary item đã được tạo.
 */
export async function saveToArchive(
  localState,
  pageInfo,
  historySourceId = null
) {
  const summaries = prepareSummaries(localState, localState.contentType)

  if (summaries.length === 0) {
    console.warn('[FPStorageService] No summary content to save to archive.')
    return null
  }

  const archiveEntry = {
    id: generateUUID(), // Luôn tạo ID mới cho Archive
    title: pageInfo.title,
    url: pageInfo.url,
    date: new Date().toISOString(),
    summaries: summaries,
    historySourceId: historySourceId, // Liên kết với history item gốc
  }

  try {
    const newArchiveId = await addSummary(archiveEntry) // addSummary sẽ tự tạo ID mới
    console.log('[FPStorageService] Saved to Archive:', archiveEntry)

    // Nếu có historySourceId, cập nhật trạng thái isArchived của nó
    if (historySourceId) {
      await updateHistoryArchivedStatus(historySourceId, true)
    }

    // Notify other components that the data has been updated
    await appStateStorage.setValue({ data_updated_at: new Date().getTime() })
    return newArchiveId
  } catch (error) {
    console.error('[FPStorageService] Error saving to Archive:', error)
    throw error
  }
}
