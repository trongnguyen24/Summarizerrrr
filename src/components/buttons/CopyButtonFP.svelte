<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import ShadowTooltip from '@/lib/components/ShadowTooltip.svelte'

  let { targetId } = $props()
  let copied = $state(false)

  async function handleCopy() {
    if (!targetId) return
    const element = document.querySelector(`#${targetId}`)
    if (element) {
      try {
        await navigator.clipboard.writeText(element.innerText)
        copied = true
        setTimeout(() => {
          copied = false
        }, 2000)
      } catch (err) {
        console.error('Failed to copy text: ', err)
      }
    }
  }
</script>

<ShadowTooltip content={copied ? $t('button.copied') : $t('button.copy')}>
  <button
    onclick={handleCopy}
    class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200"
  >
    {#if copied}
      <span
        class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
        transition:slideScaleFade={{
          duration: 300,
          slideFrom: 'bottom',
          startScale: 0.4,
          slideDistance: '0rem',
        }}
      >
        <Icon icon="heroicons:check-solid" width="20" height="20" />
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
        <Icon icon="heroicons:clipboard-document" width="20" height="20" />
      </span>
    {/if}
  </button>
</ShadowTooltip>
