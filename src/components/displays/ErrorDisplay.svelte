<script>
  // @ts-nocheck
  import { fetchAndSummarize } from '../../stores/summaryStore.svelte.js'
  import { getHelpInfo } from '../../lib/error/helpSystem.js'
  import { settings } from '../../stores/settingsStore.svelte.js'
  import { t } from 'svelte-i18n' // Import t for i18n

  let { error } = $props()

  const helpInfo = $derived(getHelpInfo(error?.type))

  // Translated properties for display
  const translatedTitle = $derived($t(helpInfo.title))
  const translatedMessage = $derived($t(helpInfo.message))
  // Map actions to an array of objects containing both original key and translated text
  const translatedActions = $derived(
    helpInfo.actions.map((actionKey) => ({
      key: actionKey, // Keep original key for handling
      text: $t(actionKey), // Translate for display
    }))
  )

  function handleRetry() {
    if (error.canRetry) {
      fetchAndSummarize()
    }
  }

  // Modify handleHelpAction to use the original key
  function handleHelpAction(actionKey) {
    switch (actionKey) {
      case 'helpSystem.apiKey.actions.openSettings':
      case 'helpSystem.unauthorized.actions.openSettings':
        document.dispatchEvent(new CustomEvent('openSettings'))
        break
      case 'helpSystem.content.actions.refreshPage':
        browser.tabs.reload()
        break
      case 'helpSystem.network.actions.retry':
      case 'helpSystem.server.actions.retry':
      case 'helpSystem.unknown.actions.retry':
        handleRetry() // Use the existing retry handler
        break
      // Add other specific action handlers here
      case 'helpSystem.unauthorized.actions.checkApiPermissions':
        alert(
          $t('helpSystem.unauthorized.actions.checkApiPermissions') +
            '\n\n' +
            $t(helpInfo.message)
        )
        break
      case 'helpSystem.quota.actions.checkBilling':
        alert(
          $t('helpSystem.quota.actions.checkBilling') +
            '\n\n' +
            $t(helpInfo.message)
        )
        break
      case 'helpSystem.quota.actions.switchProvider':
      case 'helpSystem.server.actions.switchProvider':
        alert($t(actionKey) + '\n\n' + $t(helpInfo.message))
        break
      case 'helpSystem.permission.actions.checkPermissions':
        alert(
          $t('helpSystem.permission.actions.checkPermissions') +
            '\n\n' +
            $t(helpInfo.message)
        )
        break
      case 'helpSystem.unknown.actions.reportIssue':
        alert(
          $t('helpSystem.unknown.actions.reportIssue') +
            '\n\n' +
            $t(helpInfo.message)
        )
        break
      default:
        alert(`Action: ${actionKey}\n\n${$t(helpInfo.message)}`) // Fallback for unhandled actions
        break
    }
  }
</script>

{#if error}
  <div class="error-container font-mono" role="alert">
    <div class="flex w-full flex-col gap-2">
      <div class="flex gap-0.5">
        <div class="bg-error rounded-l-sm w-3"></div>
        <div
          class="flex relative overflow-hidden w-full px-4 py-2 gap-0 flex-col bg-blackwhite/5"
        >
          <span
            class="size-6 rotate-45 absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-surface-1"
          ></span>
          <div class="text-xs font-bold text-error">Error</div>
          <div class=" ">
            {translatedTitle}
          </div>
        </div>
      </div>

      <p class="text-sm">
        {translatedMessage || 'Something went wrong.'}
      </p>
    </div>
    <div class="flex justify-end mt-4 space-x-2">
      {#if translatedActions}
        {#each translatedActions as action}
          <button
            onclick={() => handleHelpAction(action.key)}
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            {action.text}
          </button>
        {/each}
      {/if}
      {#if error.canRetry && !helpInfo.actions?.includes('helpSystem.network.actions.retry') && !helpInfo.actions?.includes('helpSystem.server.actions.retry') && !helpInfo.actions?.includes('helpSystem.unknown.actions.retry')}
        <button
          onclick={handleRetry}
          class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          Retry
        </button>
      {/if}
    </div>
  </div>
{/if}
