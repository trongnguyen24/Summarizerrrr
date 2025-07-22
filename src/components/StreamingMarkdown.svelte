<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'

  marked.setOptions({
    highlight: function (code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
    langPrefix: 'hljs language-',
  })

  let {
    sourceMarkdown,
    speed = 1,
    class: className = '',
    onFinishTyping,
  } = $props()

  let displayedMarkdown = $state('')
  let renderedHTML = $state('')
  let currentIndex = $state(0)
  let isTyping = $state(false)
  let debounceTimer = null

  function debounceRender() {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      renderedHTML = marked.parse(displayedMarkdown)
      requestAnimationFrame(() => {
        document.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block)
        })
      })
    }, 100)
  }

  $effect(() => {
    const intervalId = setInterval(() => {
      if (currentIndex < sourceMarkdown.length) {
        isTyping = true
        const charsToAdd = Math.min(10, sourceMarkdown.length - currentIndex)
        displayedMarkdown += sourceMarkdown.substring(
          currentIndex,
          currentIndex + charsToAdd
        )
        currentIndex += charsToAdd
        debounceRender()
      } else {
        if (isTyping) {
          isTyping = false
          if (onFinishTyping) {
            onFinishTyping()
          }
          debounceRender()
        }
      }
    }, speed)

    return () => {
      clearInterval(intervalId)
      clearTimeout(debounceTimer)
    }
  })

  $effect(() => {
    if (sourceMarkdown === '') {
      displayedMarkdown = ''
      renderedHTML = ''
      currentIndex = 0
      isTyping = false
    }
  })
</script>

<div class="markdown-container {className}">
  {@html renderedHTML}
</div>

<style>
  /* Styles removed as cursor is no longer present */
</style>
