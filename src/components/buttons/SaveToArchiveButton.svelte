<!-- @ts-nocheck -->
<script>
  import { saveAllGeneratedSummariesToArchive } from '@/stores/summaryStore.svelte'
  import { Tooltip } from 'bits-ui'
  import Icon from '@iconify/svelte'

  let isSaved = $state(false)
  let isDisabled = $state(false)

  async function handleSave() {
    if (isSaved || isDisabled) return

    isDisabled = true
    await saveAllGeneratedSummariesToArchive()
    isSaved = true

    // Reset sau 3 giây để có thể save lại nếu cần
    // setTimeout(() => {
    //   isSaved = false
    //   isDisabled = false
    // }, 3000)
  }
</script>

<Tooltip.Provider>
  <Tooltip.Root delayDuration={200}>
    <Tooltip.Trigger
      onclick={handleSave}
      class="p-1.5 size-8 hover:bg-blackwhite/10 rounded-4xl transition-all duration-200"
    >
      {#if isSaved}
        <Icon
          icon="heroicons:archive-box-solid"
          width="20"
          height="20"
          class="text-blackwhite"
        />
      {:else}
        <Icon icon="heroicons:archive-box" width="20" height="20" />
      {/if}
    </Tooltip.Trigger>
    <Tooltip.Content sideOffset={6}>
      <div class="py-1.5 px-2 font-mono text-xs bg-surface-1">
        {isSaved ? 'Saved!' : 'Save to archive'}
      </div>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
