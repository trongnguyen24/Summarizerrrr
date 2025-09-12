<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import ShadowTooltip from '@/lib/components/ShadowTooltip.svelte'

  let { onSave, localSummaryState } = $props()

  let isSaving = $state(false)

  async function handleSave() {
    if (localSummaryState.isSavedToArchive || isSaving) return
    isSaving = true
    try {
      await onSave()
    } catch (error) {
      console.error('[SaveToArchiveButtonFP] Save failed:', error)
      // Optionally handle error display, e.g., show a different icon
    } finally {
      isSaving = false
    }
  }

  let tooltipContent = $derived.by(() => {
    if (localSummaryState.isSavedToArchive) {
      return $t('button.saved')
    }
    if (isSaving) {
      return $t('button.saving')
    }
    return $t('button.save_to_archive')
  })
</script>

<ShadowTooltip content={tooltipContent}>
  <button
    onclick={handleSave}
    class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    disabled={localSummaryState.isSavedToArchive || isSaving}
  >
    {#if localSummaryState.isSavedToArchive}
      <span
        class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
        transition:slideScaleFade={{
          duration: 300,
          slideFrom: 'bottom',
          startScale: 0.4,
          slideDistance: '0rem',
        }}
      >
        <Icon icon="heroicons:archive-box-solid" width="20" height="20" />
      </span>
    {:else if isSaving}
      <span
        class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
        transition:slideScaleFade={{
          duration: 300,
          slideFrom: 'bottom',
          startScale: 0.4,
          slideDistance: '0rem',
        }}
      >
        <Icon icon="line-md:loading-loop" width="20" height="20" />
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
        <Icon icon="heroicons:archive-box" width="20" height="20" />
      </span>
    {/if}
  </button>
</ShadowTooltip>
