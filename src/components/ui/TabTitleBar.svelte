<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { tabTitle } from '@/stores/tabTitleStore.svelte.js'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import {
    getTabsWithSummary,
    navigateToNextCachedTab,
    navigateToPreviousCachedTab,
  } from '@/services/tabCacheService.js'

  // Props
  let { cachedTabsCount = 0 } = $props()

  // Computed: Check if should show navigation buttons
  let showNavigation = $derived(
    settings.tools?.perTabCache?.enabled && cachedTabsCount > 1,
  )
</script>

<div class="text-text-secondary w-full flex px-2 gap-1">
  {#if showNavigation}
    <!-- Navigation mode: buttons on left, then title -->
    <button
      onclick={() => navigateToPreviousCachedTab()}
      class="py-0.5 px-1.5 hover:bg-surface-2 rounded transition-colors hover:text-text-primary"
      title="Previous cached tab"
    >
      <Icon icon="solar:alt-arrow-left-linear" width="16" height="16" />
    </button>
    <button
      onclick={() => navigateToNextCachedTab()}
      class="py-0.5 px-1.5 hover:bg-surface-2 rounded transition-colors hover:text-text-primary"
      title="Next cached tab"
    >
      <Icon icon="solar:alt-arrow-right-linear" width="16" height="16" />
    </button>
    <div class="line-clamp-1 w-full text-[0.75rem] px-2 text-text-secondary">
      {$tabTitle}
    </div>
  {:else}
    <!-- Centered title mode -->
    <div
      class="line-clamp-1 max-w-[280px] text-center text-[0.75rem] px-2 text-text-secondary"
    >
      {$tabTitle}
    </div>
  {/if}
</div>
