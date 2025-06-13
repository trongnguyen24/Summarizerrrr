<!-- @ts-nocheck -->
<script>
  import GroupVisual from './GroupVisual.svelte'
  import PlusIcon from './PlusIcon.svelte'

  let { tabs, activeTab, onSelectTab } = $props()

  // Sử dụng một đối tượng để theo dõi trạng thái đã từng loading của từng tab
  let tabLoadingStatus = $state({})

  $effect(() => {
    tabs.forEach((tab) => {
      // Chỉ cập nhật nếu tab đang loading và chưa được đánh dấu là đã từng loading
      if (tab.isLoading && !tabLoadingStatus[tab.id]) {
        tabLoadingStatus = { ...tabLoadingStatus, [tab.id]: true }
      }
    })
  })

  function selectTab(tabId) {
    onSelectTab(tabId)
  }
</script>

<div
  class="flex relative h-10 font-mono text-base text-text-secondary w-fit gap-2 p-px bg-gray-500/5 dark:bg-gray-950 border border-border dark:border-border/50"
>
  <GroupVisual>
    {#each tabs as tab (tab.id)}
      <button
        class="w-36 h-9 relative rounded-full transition-colors duration-150 {activeTab ===
        tab.id
          ? 'text-text-primary active'
          : ''} "
        onclick={() => selectTab(tab.id)}
      >
        {#if tab.isLoading}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="4" cy="12" r="3" fill="currentColor">
              <animate
                id="svgSpinners3DotsFade0"
                fill="freeze"
                attributeName="opacity"
                begin="0;svgSpinners3DotsFade1.end-0.175s"
                dur="0.525s"
                values="1;0.35"
              />
            </circle>
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4">
              <animate
                fill="freeze"
                attributeName="opacity"
                begin="svgSpinners3DotsFade0.begin+0.105s"
                dur="0.525s"
                values="1;0.35"
              />
            </circle>
            <circle cx="20" cy="12" r="3" fill="currentColor" opacity="0.3">
              <animate
                id="svgSpinners3DotsFade1"
                fill="freeze"
                attributeName="opacity"
                begin="svgSpinners3DotsFade0.begin+0.21s"
                dur="0.525s"
                values="1;0.35"
              />
            </circle>
          </svg>
        {/if}
        <div
          class="flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 {tab.isLoading
            ? 'opacity-0'
            : ''}"
        >
          {tab.label}
        </div>
      </button>
    {/each}
  </GroupVisual>
  <PlusIcon />
</div>
