import { browser } from 'wxt/browser'

/**
 * Format comments data for AI analysis
 * Cleans and structures comment data to optimize for AI processing
 * @param {Array} comments - Raw comment array from content script
 * @param {Object} metadata - Metadata object with video info
 * @returns {string} Formatted markdown string ready for AI
 */
export function formatCommentsForAI(comments, metadata) {
  if (!comments || comments.length === 0) {
    return 'No comments available.'
  }

  // Ultra-compact format - no metadata header
  let formatted = ''
  const seenTexts = new Set()

  for (const comment of comments) {
    // Skip duplicates and spam
    const normalizedText = comment.text.trim().toLowerCase()
    if (seenTexts.has(normalizedText) || comment.text.trim().length < 3) {
      continue
    }
    seenTexts.add(normalizedText)

    // Clean text: remove excessive emojis
    let cleanText = comment.text
      .trim()
      .replace(/[\u{1F300}-\u{1F9FF}]{6,}/gu, '[emoji]')

    // Truncate long comments (max 400 chars for better token efficiency)
    if (cleanText.length > 400) {
      cleanText = cleanText.substring(0, 397) + '...'
    }

    // Ultra compact format: @author|time|likes↑|replies💬|text
    formatted += `@${comment.author.name}`
    if (comment.author.isChannelOwner) {
      formatted += '👤'
    }
    formatted += `|${comment.publishedTime}|${comment.likeCount}↑`
    if (comment.replyCount > 0) {
      formatted += `|${comment.replyCount}💬`
    }
    formatted += `|${cleanText}\n`

    // Compact replies format
    if (comment.replies && comment.replies.length > 0) {
      for (const reply of comment.replies) {
        // Clean reply text
        let cleanReply = reply.text
          .trim()
          .replace(/[\u{1F300}-\u{1F9FF}]{6,}/gu, '[emoji]')

        // Truncate long replies (max 200 chars)
        if (cleanReply.length > 200) {
          cleanReply = cleanReply.substring(0, 197) + '...'
        }

        // Skip very short replies
        if (cleanReply.length < 3) {
          continue
        }

        // Compact reply: indent + number.@author|text
        formatted += `  ${reply.index}.@${reply.author.name}|${cleanReply}\n`
      }
    }

    formatted += '\n'
  }

  return formatted
}

/**
 * Fetch YouTube comments via message passing
 * @param {number|null} tabId - Tab ID to send message to (optional). If null, sends to runtime (background).
 * @param {Object} options - Options for fetching
 * @param {number} options.maxComments
 * @param {number} options.maxRepliesPerComment
 * @returns {Promise<Object>} Response with comments and metadata
 */
export async function fetchYouTubeComments(
  tabId = null,
  { maxComments = 80, maxRepliesPerComment = 10 } = {}
) {
  const message = {
    action: 'fetchYouTubeComments',
    maxComments,
    maxRepliesPerComment,
  }

  try {
    if (tabId) {
      return await browser.tabs.sendMessage(tabId, message)
    } else {
      // Use runtime.sendMessage which goes to background
      return await browser.runtime.sendMessage(message)
    }
  } catch (error) {
    console.error('[youtubeUtils] Error fetching comments:', error)
    throw error
  }
}
