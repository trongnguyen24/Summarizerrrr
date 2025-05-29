<!-- @ts-nocheck -->
<script>
  import { createEventDispatcher } from 'svelte'
  import GroupVisual from './GroupVisual.svelte'

  let { tabs, activeTab } = $props()

  const dispatch = createEventDispatcher()

  function selectTab(tabId) {
    dispatch('selectTab', tabId)
  }
</script>

<div
  class="flex relative font-mono text-base text-text-secondary w-fit gap-2 p-0.5 border border-border"
>
  <GroupVisual>
    {#each tabs as tab (tab.id)}
      <button
        class="px-6 py-1 rounded-full transition-colors duration-150"
        class:text-text-primary={activeTab === tab.id}
        class:active={activeTab === tab.id}
        onclick={() => selectTab(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </GroupVisual>
  <div class="plus-icon top-left"></div>
  <div class="plus-icon bottom-right"></div>
</div>
