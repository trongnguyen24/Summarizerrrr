<script>
  // @ts-nocheck
  import { onMount } from 'svelte'
  import './styles/floating-ui.css'
  import { summaryState } from '../../stores/summaryStore.svelte.js'
  import FloatingButton from './components/FloatingButton.svelte'
  import FloatingPanel from './components/FloatingPanel.svelte'
  import MobileSheet from './components/MobileSheet.svelte'
  import SettingsMini from './components/SettingsMini.svelte' // Import SettingsMini

  let isPanelVisible = $state(false) // Add $state
  let isMobile = $state(false) // Add $state

  onMount(() => {
    const checkMobile = () => {
      isMobile = window.innerWidth < 768
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  })

  function togglePanel() {
    isPanelVisible = !isPanelVisible
  }

  async function requestSummary() {
    console.log('Requesting page summary...')
    try {
      const response = await browser.runtime.sendMessage({
        type: 'REQUEST_SUMMARY',
        payload: {
          url: window.location.href,
        },
        // For page summary, we assume type is 'pageSummary'
        type: 'pageSummary',
      })
      console.log('Summary request response:', response)
    } catch (error) {
      console.error('Failed to request summary:', error)
    }
  }
</script>

<div class="floating-ui-root">
  <FloatingButton toggle={togglePanel} />

  {#if isMobile}
    <MobileSheet
      visible={isPanelVisible}
      onclose={() => (isPanelVisible = false)}
      summary={summaryState.summary}
      status={summaryState.isLoading
        ? 'loading'
        : summaryState.summaryError
          ? 'error'
          : 'idle'}
    >
      {#snippet actionButton()}
        <button onclick={requestSummary}>Summarize Mobile</button>
      {/snippet}
      {#snippet settingsMini()}
        <SettingsMini />
      {/snippet}
    </MobileSheet>
  {:else}
    <FloatingPanel
      visible={isPanelVisible}
      onclose={() => (isPanelVisible = false)}
      summary={summaryState.summary}
      status={summaryState.isLoading
        ? 'loading'
        : summaryState.summaryError
          ? 'error'
          : 'idle'}
    >
      {#snippet actionButton()}
        <!-- FloatingPanel now has its own summarizePageContent function -->
        <button onclick={requestSummary}>Summarize (Global)</button>
      {/snippet}
      {#snippet settingsMini()}
        <SettingsMini />
      {/snippet}
    </FloatingPanel>
  {/if}
</div>
