// @ts-nocheck
/**
 * Utility function to process <think> tags and convert them to <details><summary> elements
 * @param {string} content - The content containing <think> tags
 * @returns {string} - Content with <think> tags converted to collapsible sections
 */
export function processThinkTags(content) {
  if (!content || typeof content !== 'string') {
    return content
  }

  // Support multiple think tag formats:
  // 1. Standard: <think>content</think>
  // 2. Cerebras AI: ◁think▷content◁/think▷
  // 3. Case insensitive variations
  let processed = content

  // Pattern 1: Standard <think> tags (case insensitive)
  processed = processed.replace(
    /<think>([\s\S]*?)<\/think>/gi,
    (match, thinkContent) => {
      const trimmedContent = thinkContent.trim()
      // Convert to Markdown format compatible with SvelteMarkdown
      return `\n\n<details class="think-section">\n<summary>Think</summary>\n\n${trimmedContent}\n\n</details>\n\n`
    }
  )

  // Pattern 2: Cerebras AI format ◁think▷content◁/think▷
  processed = processed.replace(
    /◁think▷([\s\S]*?)◁\/think▷/gi,
    (match, thinkContent) => {
      const trimmedContent = thinkContent.trim()
      // Convert to Markdown format compatible with SvelteMarkdown
      return `\n\n<details class="think-section">\n<summary>Think</summary>\n\n${trimmedContent}\n\n</details>\n\n`
    }
  )

  // Pattern 3: Alternative think formats (if any other formats are discovered)
  // Can be extended here for future compatibility

  return processed
}

/**
 * Check if content contains think tags
 * @param {string} content - The content to check
 * @returns {boolean} - True if content contains think tags
 */
export function hasThinkTags(content) {
  if (!content || typeof content !== 'string') {
    return false
  }
  return /<think>[\s\S]*?<\/think>/gi.test(content)
}

/**
 * Test function for edge cases and multiple think tags
 * @returns {object} - Test results
 */
export function testThinkTagProcessor() {
  const testCases = [
    {
      name: 'Single think tag',
      input:
        '<think>This is a simple thought</think>\n\nThis is regular content.',
      expected: 'details and summary tags with think content',
    },
    {
      name: 'Multiple think tags',
      input:
        '<think>First thought</think>\n\nSome content\n\n<think>Second thought</think>',
      expected: 'two separate details sections',
    },
    {
      name: 'Think with code blocks',
      input:
        '<think>\nLet me think about this:\n```javascript\nconst x = 1;\n```\n</think>',
      expected: 'code block preserved in think section',
    },
    {
      name: 'Case insensitive',
      input: '<THINK>Uppercase tag</THINK>',
      expected: 'should work with uppercase',
    },
    {
      name: 'No think tags',
      input: 'Regular markdown content without think tags',
      expected: 'unchanged content',
    },
    {
      name: 'Empty think tag',
      input: '<think></think>',
      expected: 'empty details section',
    },
  ]

  const results = testCases.map((testCase) => {
    const result = processThinkTags(testCase.input)
    const hasThink = hasThinkTags(testCase.input)
    return {
      ...testCase,
      result,
      hasThinkTags: hasThink,
      processed: result !== testCase.input,
    }
  })

  return results
}
