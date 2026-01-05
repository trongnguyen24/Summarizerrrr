<script>
  import { t } from 'svelte-i18n'
  import Icon, { loadIcons } from '@iconify/svelte'
  import { slideScaleFade } from '../../lib/ui/slideScaleFade.js'
  import ShadowTooltip from '../../lib/components/ShadowTooltip.svelte'

  let { text = '', pageUrl = null } = $props()

  let isCopied = $state(false)

  loadIcons(['heroicons:check-circle-solid', 'heroicons:document-text'])

  function parseTimestampToSeconds(timestamp) {
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

  function buildTimestampUrl(sourceUrl, seconds) {
    try {
      const url = new URL(sourceUrl)
      // Handle YouTube URLs
      if (
        url.hostname.includes('youtube.com') ||
        url.hostname.includes('youtu.be')
      ) {
        if (url.searchParams.has('v')) {
          url.searchParams.set('t', seconds)
          return url.toString()
        } else if (url.hostname === 'youtu.be') {
          url.searchParams.set('t', seconds)
          return url.toString()
        }
      }
      // Default: append #t=seconds
      return `${sourceUrl}#t=${seconds}`
    } catch (e) {
      console.error('Invalid URL:', sourceUrl)
      return null
    }
  }

  function convertTimestampLinksInMarkdown(markdown, sourceUrl) {
    if (!sourceUrl || !markdown) return markdown

    let result = markdown

    // Pattern 1: [text](timestamp:seconds) - đã được process thành link
    result = result.replace(
      /\[([^\]]+)\]\(timestamp:(\d+)\)/g,
      (match, text, seconds) => {
        const url = buildTimestampUrl(sourceUrl, seconds)
        return url ? `[${text}](${url})` : match
      },
    )

    // Pattern 2: [MM:SS] hoặc [HH:MM:SS] - timestamp text thuần (chưa được process)
    result = result.replace(
      /\[(\d{1,2}:\d{2}(?::\d{2})?)\](?!\()/g,
      (match, timestamp) => {
        const seconds = parseTimestampToSeconds(timestamp)
        const url = buildTimestampUrl(sourceUrl, seconds)
        return url ? `[${timestamp}](${url})` : match
      },
    )

    return result
  }

  async function copyMarkdown() {
    try {
      if (!text) {
        console.warn('Không có nội dung markdown để copy')
        return
      }

      // Chuyển đổi timestamp links thành URL thực nếu có pageUrl
      const processedText = pageUrl
        ? convertTimestampLinksInMarkdown(text, pageUrl)
        : text

      // Sử dụng Clipboard API nếu có
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(processedText)
      } else {
        // Fallback: textarea ẩn
        const ta = document.createElement('textarea')
        ta.value = processedText
        ta.setAttribute('readonly', '')
        Object.assign(ta.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '1px',
          height: '1px',
          opacity: '0',
          padding: '0',
          border: '0',
          outline: 'none',
        })

        document.body.appendChild(ta)
        ta.focus({ preventScroll: true })
        ta.select()
        ta.setSelectionRange(0, ta.value.length)
        try {
          const ok = document.execCommand('copy')
          if (!ok) throw new Error('execCommand returned false')
        } finally {
          ta.remove()
        }
      }

      isCopied = true
      setTimeout(() => (isCopied = false), 1600)
    } catch (err) {
      console.error('Failed to copy markdown:', err)
    }
  }
</script>

<ShadowTooltip
  content={isCopied ? $t('button.copied') : $t('button.copyMarkdown')}
>
  <button
    onclick={copyMarkdown}
    class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200"
  >
    {#if isCopied}
      <span
        class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
        transition:slideScaleFade={{
          duration: 300,
          slideFrom: 'bottom',
          startScale: 0.4,
          slideDistance: '0rem',
        }}
      >
        <Icon icon="heroicons:check-circle-solid" width="20" height="20" />
      </span>
    {:else}
      <span
        class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
        transition:slideScaleFade={{
          duration: 300,
          slideFrom: 'bottom',
          startScale: 0.4,
          slideDistance: '0rem',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16.5 8.25V6C16.5 5.40326 16.2629 4.83097 15.841 4.40901C15.419 3.98705 14.8467 3.75 14.25 3.75H6C5.40326 3.75 4.83097 3.98705 4.40901 4.40901C3.98705 4.83097 3.75 5.40326 3.75 6V14.25C3.75 14.8467 3.98705 15.419 4.40901 15.841C4.83097 16.2629 5.40326 16.5 6 16.5H8.25M16.5 8.25H18C18.5967 8.25 19.169 8.48705 19.591 8.90901C20.0129 9.33097 20.25 9.90326 20.25 10.5V18C20.25 18.5967 20.0129 19.169 19.591 19.591C19.169 20.0129 18.5967 20.25 18 20.25H10.5C9.90326 20.25 9.33097 20.0129 8.90901 19.591C8.48705 19.169 8.25 18.5967 8.25 18V16.5M16.5 8.25H10.5C9.90326 8.25 9.33097 8.48705 8.90901 8.90901C8.48705 9.33097 8.25 9.90326 8.25 10.5V16.5"
            stroke-width="1.5"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M11.5 18C11.5 17.6 11.5 14.5 11.5 12.5L14.5 15L17 12.5V18"
            stroke-width="1.5"
            stroke="currentColor"
          />
        </svg>
      </span>
    {/if}
  </button>
</ShadowTooltip>
