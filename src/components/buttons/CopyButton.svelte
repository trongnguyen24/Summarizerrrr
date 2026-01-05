<script>
  import { t } from 'svelte-i18n'
  import Icon, { loadIcons } from '@iconify/svelte'
  import { slideScaleFade } from '../../lib/ui/slideScaleFade.js'
  import ShadowTooltip from '../../lib/components/ShadowTooltip.svelte'

  let { targetId = 'copy-cat', text = null, pageUrl = null } = $props()

  let isCopied = $state(false)
  let btn // bind tới nút để xác định đúng root

  loadIcons(['heroicons:check-circle-solid', 'heroicons:square-2-stack'])

  const asString = (v) => (typeof v === 'string' ? v : String(v ?? ''))

  function getRoot(node) {
    return node?.getRootNode?.() ?? document
  }

  function normalizeId(id) {
    if (!id) return null
    return id.startsWith('#') ? id : `#${id}`
  }

  function findInSameTree(selector, root) {
    // Tìm trong cùng tree trước
    const el =
      root?.querySelector?.(selector) ||
      root?.getElementById?.(selector.slice(1))
    if (el) return el

    // Fallback: thử ở document (phòng khi target nằm ngoài Shadow hiện tại)
    return (
      document.querySelector(selector) ||
      document.getElementById(selector.slice(1))
    )
  }

  function convertTimestampLinks(element, sourceUrl) {
    if (!sourceUrl) return

    // Tìm tất cả các link có href bắt đầu bằng "timestamp:"
    element.querySelectorAll('a[href^="timestamp:"]').forEach((link) => {
      const href = link.getAttribute('href')
      const seconds = href.split(':')[1]

      try {
        const url = new URL(sourceUrl)
        // Handle YouTube URLs
        if (
          url.hostname.includes('youtube.com') ||
          url.hostname.includes('youtu.be')
        ) {
          if (url.searchParams.has('v')) {
            url.searchParams.set('t', seconds)
            link.setAttribute('href', url.toString())
          } else if (url.hostname === 'youtu.be') {
            url.searchParams.set('t', seconds)
            link.setAttribute('href', url.toString())
          }
        } else {
          // Default: append #t=seconds
          link.setAttribute('href', `${sourceUrl}#t=${seconds}`)
        }
      } catch (e) {
        console.error('Invalid URL:', sourceUrl)
      }
    })
  }

  function cleanElementStyles(element) {
    // Clone element để không ảnh hưởng đến original
    const cleanElement = element.cloneNode(true)

    // Chuyển đổi timestamp links thành YouTube links nếu có pageUrl
    if (pageUrl) {
      convertTimestampLinks(cleanElement, pageUrl)
    }

    // Force reset màu mặc định cho element gốc
    cleanElement.style.cssText = `
      color: black !important;
      background-color: transparent !important;
    `
    cleanElement.removeAttribute('class')

    // Force reset màu cho tất cả children
    cleanElement.querySelectorAll('*').forEach((el) => {
      el.style.cssText = `
        color: inherit !important;
        background-color: transparent !important;
      `
      el.removeAttribute('class')
      el.removeAttribute('bgcolor')
      el.removeAttribute('color')
    })

    return cleanElement
  }

  async function copyWithSelection(element) {
    // Tạo element sạch với force reset colors
    const cleanElement = cleanElementStyles(element)

    // Tạo isolated container với unique class
    const uniqueId = `temp-copy-container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempContainer = document.createElement('div')
    tempContainer.className = uniqueId
    tempContainer.style.cssText = `
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      
      /* Force reset all inherited styles */
      color: black !important;
      background-color: white !important;
      font-size: 16px !important;
      line-height: 1.4 !important;
      
      /* Isolate from parent CSS inheritance */
      all: initial;
      
      /* Re-enable basic text properties */
      unicode-bidi: isolate !important;
    `

    // Tạo style element với specific selector để không ảnh hưởng trang
    const styleElement = document.createElement('style')
    styleElement.textContent = `
      .${uniqueId} ul {
        list-style-type: disc !important;
        margin: 1em 0 !important;
        padding-left: 40px !important;
        display: block !important;
      }
      .${uniqueId} ol {
        list-style-type: decimal !important;
        margin: 1em 0 !important;
        padding-left: 40px !important;
        display: block !important;
      }
      .${uniqueId} ul li,
      .${uniqueId} ol li {
        display: list-item !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .${uniqueId} ul ul {
        list-style-type: circle !important;
        margin: 0 !important;
        padding-left: 20px !important;
      }
      .${uniqueId} ul ul ul {
        list-style-type: square !important;
      }
      .${uniqueId} ol ol {
        list-style-type: lower-alpha !important;
        margin: 0 !important;
        padding-left: 20px !important;
      }
      .${uniqueId} ol ol ol {
        list-style-type: lower-roman !important;
      }
      .${uniqueId} h1, .${uniqueId} h2, .${uniqueId} h3,
      .${uniqueId} h4, .${uniqueId} h5, .${uniqueId} h6 {
        font-weight: bold !important;
        margin: 0.5em 0 !important;
        display: block !important;
      }
      .${uniqueId} h1 { font-size: 2em !important; }
      .${uniqueId} h2 { font-size: 1.5em !important; }
      .${uniqueId} h3 { font-size: 1.17em !important; }
      .${uniqueId} h4 { font-size: 1em !important; }
      .${uniqueId} h5 { font-size: 0.83em !important; }
      .${uniqueId} h6 { font-size: 0.67em !important; }
      .${uniqueId} p {
        margin: 1em 0 !important;
        display: block !important;
      }
      .${uniqueId} strong {
        font-weight: bold !important;
      }
      .${uniqueId} em {
        font-style: italic !important;
      }
      .${uniqueId} b {
        font-weight: bold !important;
      }
      .${uniqueId} i {
        font-style: italic !important;
      }
      .${uniqueId} u {
        text-decoration: underline !important;
      }
    `

    tempContainer.appendChild(styleElement)
    tempContainer.appendChild(cleanElement)
    document.body.appendChild(tempContainer)

    try {
      // Sử dụng Selection API với element trong isolated container
      const range = document.createRange()
      range.selectNode(cleanElement)

      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)

      const successful = document.execCommand('copy')
      if (!successful) {
        throw new Error('execCommand returned false')
      }
      return true
    } finally {
      // Cleanup: bỏ chọn và xóa temp container
      const selection = window.getSelection()
      selection.removeAllRanges()
      tempContainer.remove()
    }
  }

  async function writeToClipboard(content) {
    // Fallback cho plain text: textarea ẩn trong *document.body*
    const ta = document.createElement('textarea')
    ta.value = content
    ta.setAttribute('readonly', '')
    // đảm bảo hoạt động cả trên mobile
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

  async function copyToClipboard(ev) {
    try {
      const root = getRoot(btn ?? ev?.currentTarget)
      let content = ''

      if (text != null) {
        // Nếu có text được truyền trực tiếp, chỉ copy plain text
        content = asString(text)
        await writeToClipboard(content)
      } else {
        const sel = normalizeId(targetId)
        const el = sel ? findInSameTree(sel, root) : null
        if (!el) {
          console.warn(
            `Không tìm thấy element với id "${targetId}" trong DOM/Shadow DOM`,
          )
          return
        }

        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement
        ) {
          // Input/textarea chỉ có plain text
          content = asString(el.value)
          await writeToClipboard(content)
        } else {
          // Element khác: thử copy với Selection API trước (giữ HTML format)
          try {
            await copyWithSelection(el)
          } catch (selectionError) {
            // Fallback: copy plain text nếu Selection API thất bại
            console.warn(
              'Selection API failed, falling back to plain text:',
              selectionError,
            )
            content = asString(el.innerText?.trim() || el.textContent?.trim())
            if (!content) {
              console.warn('Không có nội dung để copy')
              return
            }
            await writeToClipboard(content)
          }
        }
      }

      isCopied = true
      setTimeout(() => (isCopied = false), 1600)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
</script>

<ShadowTooltip content={isCopied ? $t('button.copied') : $t('button.copy')}>
  <button
    bind:this={btn}
    onclick={copyToClipboard}
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
        <Icon icon="heroicons:square-2-stack" width="20" height="20" />
      </span>
    {/if}
  </button>
</ShadowTooltip>
