<script>
  // @ts-nocheck
  import { onMount } from 'svelte'
  import { summaryStore } from '../../stores/summaryStore.svelte.js'
  import FloatingButton from './components/FloatingButton.svelte'
  import FloatingPanel from './components/FloatingPanel.svelte'
  import MobileSheet from './components/MobileSheet.svelte'
  import SettingsMini from './components/SettingsMini.svelte' // Import SettingsMini

  let isPanelVisible = false
  let isMobile = false

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
  <FloatingButton on:toggle={togglePanel} />

  {#if isMobile}
    <MobileSheet
      visible={isPanelVisible}
      on:close={() => (isPanelVisible = false)}
      summary={$summaryStore.summary}
      status={$summaryStore.status}
    >
      <button slot="action-button" on:click={requestSummary}
        >Summarize Mobile</button
      >
      <SettingsMini slot="settings-mini" />
    </MobileSheet>
  {:else}
    <FloatingPanel
      visible={isPanelVisible}
      on:close={() => (isPanelVisible = false)}
      summary={$summaryStore.summary}
      status={$summaryStore.status}
    >
      <button slot="action-button" on:click={requestSummary}
        >Summarize Desktop</button
      >
      <SettingsMini slot="settings-mini" />
    </FloatingPanel>
  {/if}
</div>
