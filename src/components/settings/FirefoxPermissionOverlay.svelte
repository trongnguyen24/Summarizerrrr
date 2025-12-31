<script>
  import { t } from 'svelte-i18n'
  import { fadeOnly } from '@/lib/ui/slideScaleFade.js'
  import {
    getFirefoxPermission,
    updateFirefoxPermission,
  } from '@/stores/settingsStore.svelte.js'
  import { requestSpecificPermission } from '@/services/firefoxPermissionService.js'
  import { browser } from 'wxt/browser'
  import { isTouchDevice } from '@/lib/utils/browserDetection.js'

  let httpsPermission = $state(getFirefoxPermission('httpsPermission'))
  let isChecking = $state(false)

  // Sync with store
  $effect(() => {
    httpsPermission = getFirefoxPermission('httpsPermission')
  })

  async function grantPermission() {
    isChecking = true
    try {
      const granted = await requestSpecificPermission('<all_urls>')
      if (granted) {
        await updateFirefoxPermission('httpsPermission', true)

        // Broadcast permission change
        try {
          await browser.runtime.sendMessage({
            type: 'PERMISSION_CHANGED',
            permissionKey: 'httpsPermission',
            value: true,
            source: 'FirefoxPermissionOverlay',
            timestamp: Date.now(),
          })
        } catch (error) {
          console.warn('Failed to broadcast permission change:', error)
        }
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
    } finally {
      isChecking = false
    }
  }
</script>

{#if import.meta.env.BROWSER === 'firefox' && !httpsPermission && isTouchDevice()}
  <div
    transition:fadeOnly
    class="absolute bottom-17.5 sm:bottom-0 left-0 right-0 z-[51] flex items-center justify-center pointer-events-none"
  >
    <div
      class="bg-surface-1 dark:bg-surface-2 border border-border pl-2 w-full flex flex-row items-center justify-between gap-4 pointer-events-auto"
    >
      <div class="flex flex-col gap-1">
        <p class="text-xs text-text-secondary">
          To summarize all domains, needs to access all URLs.
        </p>
      </div>

      <button
        onclick={grantPermission}
        disabled={isChecking}
        class="whitespace-nowrap py-4 px-4 bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isChecking}
          ...
        {:else}
          Allow
        {/if}
      </button>
    </div>
  </div>
{/if}
