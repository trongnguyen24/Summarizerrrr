// @ts-nocheck
/**
 * Utility function to process timestamps in text and convert them to custom links
 * @param {string} content - The content containing timestamps like [10:05] or [1:20:30]
 * @returns {string} - Content with timestamps converted to markdown links
 */
export function processTimestamps(content) {
  if (!content || typeof content !== 'string') {
    return content
  }

  // Regex to match timestamps in format [HH:MM:SS] or [MM:SS]
  // Captures:
  // 1. The opening bracket [
  // 2. The timestamp string (e.g. 10:05)
  // 3. The closing bracket ]
  const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g

  return content.replace(timestampRegex, (match, timestamp) => {
    const seconds = parseTimestampToSeconds(timestamp)
    // Create a custom link format that our renderer will handle
    // Format: [timestamp](timestamp:seconds)
    return `[${timestamp}](timestamp:${seconds})`
  })
}

/**
 * Convert timestamp string to total seconds
 * @param {string} timestamp - Timestamp in HH:MM:SS or MM:SS format
 * @returns {number} - Total seconds
 */
export function parseTimestampToSeconds(timestamp) {
  const parts = timestamp.split(':').map(Number)
  let seconds = 0

  if (parts.length === 3) {
    // HH:MM:SS
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    // MM:SS
    seconds = parts[0] * 60 + parts[1]
  }

  return seconds
}
