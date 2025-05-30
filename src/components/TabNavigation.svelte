<!-- @ts-nocheck -->
<script>
  import GroupVisual from './GroupVisual.svelte'

  let { tabs, activeTab, onSelectTab } = $props()

  function selectTab(tabId) {
    onSelectTab(tabId)
  }
</script>

<div
  class="flex relative font-mono text-base text-text-secondary w-fit gap-2 p-0.5 border border-border"
>
  <GroupVisual>
    {#each tabs as tab (tab.id)}
      <button
        class="px-6 py-1 relative rounded-full transition-colors duration-150 {activeTab ===
        tab.id
          ? 'text-text-primary active'
          : ''} "
        onclick={() => selectTab(tab.id)}
      >
        {tab.label}
        {#if tab.isLoading}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="8"
            viewBox="0 0 24 24"
            class="absolute left-1 top-1 pointer-events-none"
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
      </button>
    {/each}
  </GroupVisual>
  <!-- Giữ lại các div plus-icon và các lớp vị trí, sẽ xử lý CSS sau -->
  <div class="plus-icon top-left"></div>
  <div class="plus-icon bottom-right"></div>
</div>
