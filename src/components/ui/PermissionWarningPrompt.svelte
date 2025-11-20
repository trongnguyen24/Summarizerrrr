<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import { fade, slide } from 'svelte/transition'
  import {
    checkSpecificPermission,
    requestSpecificPermission,
  } from '@/services/firefoxPermissionService.js'
  import { browser } from 'wxt/browser'

  let { currentUrl = '', onPermissionGranted = () => {} } = $props()

  let hasPermission = $state(true) // Default to true to avoid flash
  let isCheckingPermission = $state(true)
  let isRequestingPermission = $state(false)
  let showWarning = $state(false)
  let permissionCheckError = $state(null)
  let isRestrictedPage = $state(false)

  // Check if page is restricted (browser pages, extensions, etc)
  function checkRestricted(url) {
    if (!url) return false
    return (
      url.startsWith('about:') ||
      url.startsWith('moz-extension:') ||
      url.startsWith('chrome:') ||
      url.startsWith('view-source:') ||
      url.startsWith('file:')
    )
  }

  // Listen for permission changes via runtime messages
  $effect(() => {
    const messageListener = (message) => {
      if (message.type === 'PERMISSION_CHANGED') {
        // If global permission changed
        if (message.pattern === '*://*/*') {
          if (message.value) {
            hasPermission = true
            showWarning = false
            onPermissionGranted(true)
          } else {
            checkPermissionStatus()
          }
        }
      }
    }

    browser.runtime.onMessage.addListener(messageListener)
    return () => {
      browser.runtime.onMessage.removeListener(messageListener)
    }
  })

  async function checkPermissionStatus() {
    if (!currentUrl || import.meta.env.BROWSER !== 'firefox') return

    isCheckingPermission = true
    permissionCheckError = null

    isRestrictedPage = checkRestricted(currentUrl)
    if (isRestrictedPage) {
      hasPermission = false
      showWarning = true
      isCheckingPermission = false
      return
    }

    try {
      // Check global permission ONLY
      const global = await checkSpecificPermission('*://*/*')
      hasPermission = global
      showWarning = !global

      if (global) {
        onPermissionGranted(true)
      }
    } catch (error) {
      console.error(
        '[PermissionWarningPrompt] Error checking permission:',
        error,
      )
      permissionCheckError = error.message
    } finally {
      isCheckingPermission = false
    }
  }

  // Watch currentUrl changes
  $effect(() => {
    checkPermissionStatus()
  })

  async function handleGrantPermission() {
    isRequestingPermission = true
    try {
      // Request GLOBAL permission
      const granted = await requestSpecificPermission('*://*/*')
      if (granted) {
        hasPermission = true
        showWarning = false
        onPermissionGranted(true)

        // Broadcast change
        await browser.runtime.sendMessage({
          type: 'PERMISSION_CHANGED',
          pattern: '*://*/*',
          value: true,
          source: 'PermissionWarningPrompt',
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error('[PermissionWarningPrompt] Request failed:', error)
    } finally {
      isRequestingPermission = false
    }
  }
</script>

{#if showWarning}
  <div
    transition:slide={{ duration: 300 }}
    class="w-full px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800/50"
  >
    <div class="flex flex-col gap-3">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 text-orange-500 shrink-0">
          <Icon icon="solar:shield-warning-bold" width="20" height="20" />
        </div>
        <div class="flex-1 min-w-0">
          <h3
            class="text-sm font-semibold text-orange-800 dark:text-orange-200"
          >
            {#if isRestrictedPage}
              {$t('permissionWarning.restricted_title') || 'Access Restricted'}
            {:else}
              {$t('permissionWarning.title')}
            {/if}
          </h3>
          <p
            class="mt-1 text-xs text-orange-700 dark:text-orange-300/80 leading-relaxed"
          >
            {#if isRestrictedPage}
              {$t('permissionWarning.restricted_description') ||
                'Summarizerrrr cannot run on this page (browser settings or internal page).'}
            {:else}
              {$t('permissionWarning.description') ||
                'Summarizerrrr needs access to this website to generate summaries.'}
            {/if}
          </p>
        </div>
      </div>

      {#if !isRestrictedPage}
        <div class="flex justify-end pl-8">
          <button
            onclick={handleGrantPermission}
            disabled={isRequestingPermission}
            class="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white transition-colors bg-orange-500 rounded-full hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isRequestingPermission}
              <Icon icon="svg-spinners:ring-resize" width="14" height="14" />
              <span>{$t('common.processing') || 'Processing...'}</span>
            {:else}
              <span>{$t('permissionWarning.button') || 'Grant Permission'}</span
              >
            {/if}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
