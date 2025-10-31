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
**Format**: Markdown with YAML frontmatter
**Version**: ${metadata.version}

## Structure

This archive contains your summaries exported as individual markdown files in a **flat structure** (all files at root level).

### File Naming Convention

Files follow this pattern: \`{contentType}_{index}--{title}_{tab}.md\`

- **contentType**: youtube, course, or website
- **index**: 3-digit number (001, 002, etc.) for ordering
- **title**: Sanitized archive title
- **tab**: Tab name (summary, chapters, concepts)

### Examples

- \`youtube_001--how-to-build-ai-agents_summary.md\`
- \`youtube_001--how-to-build-ai-agents_chapters.md\`
- \`course_002--complete-web-development_summary.md\`
- \`course_002--complete-web-development_chapters.md\`
- \`course_002--complete-web-development_concepts.md\`
- \`website_003--article-about-ai_summary.md\`

### Content Types

- **YouTube Videos**: 2 files per video (summary + chapters)
- **Courses**: 3 files per course (summary + chapters + concepts)
- **Websites**: 1 file per page (summary only)

### File Format

Each markdown file includes:

1. **YAML Frontmatter** - Metadata (title, URL, date, type, tags)
2. **Header Section** - Quick reference information
3. **Content** - The actual summary/chapter/concept content
4. **Footer** - Export information

## Usage

These markdown files can be:

- ✅ Opened in any text editor (VS Code, Sublime, Notepad++, etc.)
- ✅ Imported into note-taking apps (Obsidian, Notion, Logseq, Roam Research)
- ✅ Committed to version control (Git, GitHub, GitLab)
- ✅ Searched with desktop search tools (Spotlight, Everything, etc.)
- ✅ Converted to other formats (PDF, HTML, DOCX via Pandoc)
- ✅ Read as-is (human-readable format)
- ✅ Sorted/filtered by filename pattern

## Example Archive Structure

\`\`\`
summarizerrrr-markdown-backup-2025-01-29.zip
├── README.md
├── youtube_001--how-to-build-ai-agents_summary.md
├── youtube_001--how-to-build-ai-agents_chapters.md
├── youtube_002--machine-learning-intro_summary.md
├── youtube_002--machine-learning-intro_chapters.md
├── course_003--complete-web-development_summary.md
├── course_003--complete-web-development_chapters.md
├── course_003--complete-web-development_concepts.md
├── website_004--article-about-ai_summary.md
└── ...
\`\`\`

## Sorting & Organization

The flat structure allows easy sorting by:

- **Content Type**: Group files by prefix (youtube_, course_, website_)
- **Index**: Numerical order (001, 002, 003...)
- **Title**: Alphabetical by archive title
- **Tab**: Group by suffix (summary, chapters, concepts)

## YAML Frontmatter Fields

Each markdown file starts with YAML frontmatter:

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

This metadata can be used by tools like Obsidian for:
- Searching and filtering
- Creating dynamic queries
- Building knowledge graphs
- Organizing your notes

## Notes

- All files are at root level (no subfolders) for easier access
- Special characters in filenames have been sanitized for cross-platform compatibility
- Empty or missing tabs are automatically skipped
- Tags are preserved and included in both frontmatter and header
- Dates are in ISO 8601 format for universal compatibility
- Files can be easily filtered/sorted by naming pattern

---

*Exported by Summarizerrrr Browser Extension*
Website: https://summarizerrrr.com
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
