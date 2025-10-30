<!-- @ts-nocheck -->
<script>
  import TabNavigation from '@/components/navigation/TabNavigation.svelte'
  import MobileGenericSummaryDisplay from './MobileGenericSummaryDisplay.svelte'

  let { summary = '', isLoading = false, error = null } = $props()
</script>

<div class="mobile-summary-display">
  <div class="mt-4">
    <MobileGenericSummaryDisplay {summary} {isLoading} {error} />
  </div>
</div>
