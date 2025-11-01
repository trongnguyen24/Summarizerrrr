// @ts-nocheck
/**
 * Markdown Export Service
 * Handles conversion of archive summaries to markdown format
 * Supports multi-tab structure (Summary, Chapters, Concepts)
 */

/**
 * Convert a single tab content to markdown with frontmatter
 * @param {Object} summary - Archive summary object
 * @param {Object} tab - Tab object {title, content}
 * @param {Object} tagNames - Tag ID to name mapping
 * @returns {string} Markdown content with frontmatter
 */
export function convertTabToMarkdown(summary, tab, tagNames) {
  const tagsList = (summary.tags || [])
    .map((tagId) => tagNames[tagId])
    .filter(Boolean)

  // YAML frontmatter
  const frontmatter = `---
title: "${escapeYaml(summary.title || 'Untitled')}"
tab: "${escapeYaml(tab.title)}"
url: ${summary.url || 'N/A'}
date: ${summary.date || new Date().toISOString()}
type: ${summary.contentType || 'unknown'}
tags: [${tagsList.map((t) => `"${escapeYaml(t)}"`).join(', ')}]
---

`

  // Header section with metadata
  const header = `# ${summary.title || 'Untitled'} - ${tab.title}

**URL**: ${summary.url || 'N/A'}  
**Date**: ${formatDate(summary.date)}  
**Type**: ${capitalizeFirst(summary.contentType || 'unknown')}  
**Tags**: ${
    tagsList.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ') || 'None'
  }

---

`

  // Footer with export info
  const footer = `

---

*Exported from **${tab.title}** tab by Summarizerrrr on ${formatDate(
    new Date().toISOString()
  )}*
`

  return frontmatter + header + tab.content + footer
}

/**
 * Generate flat structure path for a tab (all files in root)
 * Format: contentType_index--title_tab.md
 * @param {Object} summary - Archive summary object
 * @param {string} tabTitle - Tab title (Summary, Chapters, etc.)
 * @param {number} index - Index in array for uniqueness
 * @returns {string} Flat path (all files at root level)
 */
export function generateOrganizedPath(summary, tabTitle, index) {
  const contentType = summary.contentType || 'unknown'
  const safeTitle = sanitizeFilename(summary.title || 'untitled', 60)
  const safeTab = tabTitle.toLowerCase().replace(/\s+/g, '-')
  const paddedIndex = String(index + 1).padStart(3, '0')

  // Flat structure: youtube_001--video-title_summary.md
  return `${contentType}_${paddedIndex}--${safeTitle}_${safeTab}.md`
}

/**
 * Sanitize filename to be filesystem-safe
 * @param {string} filename - Original filename
 * @param {number} maxLength - Maximum length
 * @returns {string} Safe filename
 */
function sanitizeFilename(filename, maxLength = 100) {
  if (!filename || typeof filename !== 'string') {
    return 'untitled'
  }

  return (
    filename
      .replace(/[<>:"/\\|?*]/g, '-') // Replace unsafe chars
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Remove duplicate dashes
      .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      .substring(0, maxLength) // Limit length
      .toLowerCase() || 'untitled'
  ) // Ensure not empty
}

/**
 * Create README.md content with export information
 * @param {Object} metadata - Export metadata
 * @returns {string} README markdown content
 */
export function createReadmeContent(metadata) {
  return `# Summarizerrrr Archive Export

**Export Date**: ${formatDate(metadata.exportDate)}
**Total Archives**: ${metadata.totalSummaries}
**Total Files**: ${metadata.totalFiles || metadata.totalSummaries}
**Format**: Markdown (flat structure)
**Version**: ${metadata.version}

---


### File Naming Convention

Files follow this pattern: \`{type}_{index}--{title}_{tab}.md\`

* **{type}**: \`youtube\`, \`course\`, or \`website\`
* **{index}**: 3-digit index (e.g., \`001\`)
* **{title}**: Sanitized title
* **{tab}**: Content tab (\`summary\`, \`chapters\`, \`concepts\`)

### Files Per Content Type

* **YouTube**: 2 files (\`summary\`, \`chapters\`)
* **Course**: 3 files (\`summary\`, \`chapters\`, \`concepts\`)
* **Website**: 1 file (\`summary\`)

**Examples:**
* \`course_001--complete-web-dev_summary.md\`
* \`course_001--complete-web-dev_chapters.md\`
* \`course_001--complete-web-dev_concepts.md\`
* \`website_002--article-on-ai_summary.md\`

---

## File Content & Metadata (YAML)

Each \`.md\` file contains a YAML "frontmatter" (metadata) block at the top, followed by the content. This metadata can be used by apps like Obsidian, Logseq, etc.

### Example YAML Frontmatter

\`\`\`yaml
---
title: "Video/Course/Article Title"
tab: "Summary" # or "Chapters", "Concepts"
url: https://example.com/...
date: 2025-01-29T10:00:00.000Z
type: youtube # or course, website
tags: ["AI", "Machine Learning", "Tutorial"]
---
\`\`\`

---

## Example Archive (ZIP) Structure

\`\`\`
summarizerrrr-markdown-backup-2025-01-29.zip
├── README.md
├── course_001--web-dev_summary.md
├── course_001--web-dev_chapters.md
├── course_001--web-dev_concepts.md
├── youtube_002--ai-agents_summary.md
├── youtube_002--ai-agents_chapters.md
├── website_003--ai-article_summary.md
└── ...
\`\`\`

---

## Notes

* Special characters in filenames are sanitized for cross-platform compatibility.
* Missing or empty content tabs are automatically skipped during export.
* Dates are in ISO 8601 format.

---

*Exported by Summarizerrrr Browser Extension (https://summarizerrrr.com)*
`
}

/**
 * Escape special characters for YAML
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeYaml(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }
  return str.replace(/"/g, '\\"').replace(/\n/g, ' ')
}

/**
 * Format ISO date to human-readable format
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
  if (!isoDate) {
    return 'Unknown'
  }

  try {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch (error) {
    return 'Unknown'
  }
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }
  return str.charAt(0).toUpperCase() + str.slice(1)
}
