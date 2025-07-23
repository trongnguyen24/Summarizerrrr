<script>
  // @ts-nocheck
  import TabNavigation from '../TabNavigation.svelte';

  let { tabs, activeTab, onSelectTab, children } = $props();
</script>

<div class="summary-container">
  <TabNavigation {tabs} {activeTab} {onSelectTab} />

  <div class="content mt-6">
    {@render children()}
  </div>
</div>