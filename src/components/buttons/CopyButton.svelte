<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '../../lib/ui/slideScaleFade.js'
  import ShadowTooltip from '../../lib/components/ShadowTooltip.svelte'

  let { targetId = 'copy-cat', text = null } = $props()

  let isCopied = $state(false)
  let btn // bind tới nút để xác định đúng root

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

  async function copyWithSelection(element) {
    // Sử dụng Selection API để copy HTML format như code example
    const range = document.createRange()
    range.selectNode(element)

    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)

    try {
      const successful = document.execCommand('copy')
      if (!successful) {
        throw new Error('execCommand returned false')
      }
      return true
    } finally {
      // Bỏ chọn nội dung sau khi copy xong
      selection.removeAllRanges()
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
            `Không tìm thấy element với id "${targetId}" trong DOM/Shadow DOM`
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
              selectionError
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
