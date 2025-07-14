<!-- @ts-nocheck -->
<script>
  import Icon from '@iconify/svelte'
  let { activeTab, onSelectTab } = $props()

  let activeBarTransformClass = $state('-translate-x-9') // Initial position for 'history'

  $effect(() => {
    switch (activeTab) {
      case 'history':
        activeBarTransformClass = '-translate-x-19'
        break
      case 'archive':
        activeBarTransformClass = 'translate-x-19.5'
        break
      default:
        activeBarTransformClass = '-translate-x-19 '
    }
  })
</script>

<div
  class="flex flex-col relative mt-2 font-mono text-sm text-text-secondary w-full border-t border-b border-border dark:border-border/50"
>
  <div class="flex bg-background w-full items-center justify-evenly gap-2">
    <button
      class="flex p-3 items-center w-32 justify-center gap-2 cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'history'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => onSelectTab('history')}
    >
      <div class="size-5">
        {#if activeTab === 'history'}
          <Icon icon="heroicons:clock-solid" width="20" height="20" />
        {:else}
          <Icon icon="heroicons:clock" width="20" height="20" />
        {/if}
      </div>
      <span>History</span>
    </button>

    <button
      class="flex p-3 items-center w-32 justify-center gap-2 cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'archive'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => onSelectTab('archive')}
    >
      <div class="size-5">
        {#if activeTab === 'archive'}
          <Icon icon="heroicons:archive-box-solid" width="20" height="20" />
        {:else}
          <Icon icon="heroicons:archive-box" width="20" height="20" />
        {/if}
      </div>
      <span>Archive</span>
    </button>
  </div>

  <div class="relative bg-background flex justify-center items-center h-1">
    <div
      id="activebar"
      class="w-22 h-1 rounded-xs relative rounded-t-lg bg-white transition-transform duration-400 ease-out {activeBarTransformClass}"
    >
      <div class=" absolute rounded-xs inset-px bg-white"></div>
      <div class="  absolute -inset-px bg-white/50 blur-xs"></div>
      <div class="  absolute -inset-px bg-white/50 blur-[2px]"></div>
    </div>
  </div>
</div>
