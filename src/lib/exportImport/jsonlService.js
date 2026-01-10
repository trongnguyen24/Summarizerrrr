// @ts-nocheck
/**
 * JSONL Service Utility
 * Handles conversion between JavaScript objects and JSONL (JSON Lines) format
 * Used for exporting/importing summaries and tags data in ZIP archives
 */

/**
 * Convert array of objects to JSONL string
 * Each object is stringified as a single line
 *
 * @param {Array<Object>} data - Array of objects to convert
 * @returns {string} JSONL formatted string
 * @throws {Error} If data is not an array
 */
export function exportToJsonl(data) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array')
  }

  if (data.length === 0) {
    return ''
  }

  try {
    // Convert each object to a JSON string, one per line
    // JSON.stringify automatically handles special characters, quotes, newlines
    const jsonlLines = data.map((item) => JSON.stringify(item))
    return jsonlLines.join('\n')
  } catch (error) {
    throw new Error(`Failed to convert data to JSONL: ${error.message}`)
  }
}

/**
 * Parse JSONL string to array of objects
 * Each line is parsed as a separate JSON object
 *
 * @param {string} text - JSONL formatted string
 * @returns {Object} Result object with success status, data array, and errors
 * @returns {Array<Object>} returns.data - Successfully parsed objects
 * @returns {Array<Object>} returns.errors - Array of error objects with line number and message (null if no errors)
 * @returns {number} returns.totalLines - Total number of non-empty lines
 * @returns {number} returns.successCount - Number of successfully parsed lines
 * @returns {number} returns.errorCount - Number of lines with parse errors
 */
export function importFromJsonl(text) {
  const results = []
  const errors = []

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return {
      data: [],
      errors: null,
      totalLines: 0,
      successCount: 0,
      errorCount: 0,
    }
  }

  // Split by newlines and filter out empty lines
  const lines = text.split('\n').filter((line) => line.trim() !== '')

  // Parse each line
  lines.forEach((line, index) => {
    try {
      const parsed = JSON.parse(line)
      results.push(parsed)
    } catch (error) {
      errors.push({
        line: index + 1,
        content: line.substring(0, 100), // First 100 chars for debugging
        error: error.message,
      })
    }
  })

  return {
    data: results,
    errors: errors.length > 0 ? errors : null,
    totalLines: lines.length,
    successCount: results.length,
    errorCount: errors.length,
  }
}

/**
 * Validate JSONL format without fully parsing
 * Checks if each line is valid JSON
 *
 * @param {string} text - JSONL formatted string to validate
 * @returns {Object} Validation result
 * @returns {boolean} returns.valid - Whether the JSONL is valid
 * @returns {Array<Object>} returns.errors - Array of validation errors (null if valid)
 * @returns {number} returns.lineCount - Total number of non-empty lines
 * @returns {number} returns.validLineCount - Number of valid lines
 */
export function validateJsonl(text) {
  const result = importFromJsonl(text)

  return {
    valid: result.errors === null,
    errors: result.errors,
    lineCount: result.totalLines,
    validLineCount: result.successCount,
  }
}

/**
 * Parse JSONL string with metadata handling and item cleaning
 * Format: First line may be metadata with _meta:true
 * 
 * @param {string} text - JSONL formatted string
 * @param {Object} options - Parsing options
 * @param {boolean} options.cleanItems - Whether to remove internal _type field (default: true)
 * @returns {Object} { items: Array<Object>, meta: Object|null, errors: Array<Object>|null }
 */
export function parseJsonlWithMeta(text, options = { cleanItems: true }) {
  const result = importFromJsonl(text)
  
  // Find metadata line
  const metaLine = result.data.find(item => item._meta)
  let meta = null
  if (metaLine) {
    const { _meta, ...rest } = metaLine
    meta = rest
  }

  // Filter out metadata and clean items
  const items = result.data
    .filter(item => !item._meta)
    .map(item => {
      if (options.cleanItems) {
        const { _type, ...rest } = item
        return rest
      }
      return item
    })

  return {
    items,
    meta,
    errors: result.errors
  }
}
