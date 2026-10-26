<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let {
    /** @type {string|null|undefined} Favicon URL from browser.tabs metadata. */
    favIconUrl = null,
    /** @type {string} Iconify icon string to use when the favicon is unavailable. */
    fallbackIcon = 'heroicons:document-text',
    /** @type {number} Size in pixels. */
    size = 14,
  } = $props()

  let imgError = $state(false)

  /**
   * Only render an <img> for http(s) and data: URLs.
   * chrome://, moz-extension://, etc. are not loadable from web contexts.
   */
  const safeUrl = $derived(
    favIconUrl && /^(https?:|data:)/i.test(favIconUrl) ? favIconUrl : null
  )

  const showImg = $derived(safeUrl && !imgError)
</script>

{#if showImg}
  <img
    src={safeUrl}
    alt=""
    width={size}
    height={size}
    class="shrink-0 rounded-sm"
    style="width: {size}px; height: {size}px;"
    onerror={() => (imgError = true)}
  />
{:else}
  <Icon icon={fallbackIcon} width={size} height={size} class="shrink-0 text-text-tertiary" />
{/if}
