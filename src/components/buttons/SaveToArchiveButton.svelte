<!-- @ts-nocheck -->
<script>
  import {
    summaryState,
    saveAllGeneratedSummariesToArchive,
  } from '@/stores/summaryStore.svelte.js'
  import { Tooltip } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/slideScaleFade'

  async function handleSave() {
    if (summaryState.isArchived) return
    await saveAllGeneratedSummariesToArchive()
  }
</script>

<Tooltip.Provider>
  <Tooltip.Root disableCloseOnTriggerClick delayDuration={200}>
    <Tooltip.Trigger
      onclick={handleSave}
      class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if summaryState.isArchived}
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
    </Tooltip.Trigger>
    <Tooltip.Content forceMount sideOffset={6}>
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div
              class="py-1.5 px-2 font-mono text-xs bg-surface-2 rounded-sm"
              transition:slideScaleFade={{
                duration: 200,
                slideFrom: 'bottom',
                startScale: 0.95,
                slideDistance: '0.25rem',
              }}
              {...props}
            >
              {summaryState.isArchived ? 'Saved!' : 'Save to archive'}
            </div>
          </div>
        {/if}
      {/snippet}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
