<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import { fade, slide } from 'svelte/transition'
  import {
    checkPermission,
    requestPermission,
  } from '@/services/firefoxPermissionService.js'
  import {
    updateFirefoxPermission,
    getFirefoxPermission,
    getCachedPermission,
  } from '@/stores/settingsStore.svelte.js'
  import { browser } from 'wxt/browser'

  let { currentUrl = '', onPermissionGranted = () => {} } = $props()

  // Use settings store instead of local state for permission persistence
  let hasPermission = $state(getFirefoxPermission('httpsPermission'))
  let isCheckingPermission = $state(true)
  let isRequestingPermission = $state(false)
  let showWarning = $state(false)
  let permissionCheckError = $state(null)

  // Track if permission check has been completed to avoid infinite loops
  let hasInitialized = $state(false)

  // Listen for permission changes via runtime messages
  $effect(() => {
    const messageListener = (message) => {
      if (
        message.type === 'PERMISSION_CHANGED' &&
        message.permissionKey === 'httpsPermission'
      ) {
        console.log(
          '[PermissionWarningPrompt] Received permission change message:',
          message
        )

        // Update local state immediately
        hasPermission = message.value
        showWarning = !message.value && !isCheckingPermission

        // Sync with store for consistency
        updateFirefoxPermission('httpsPermission', message.value)

        // Notify parent component if permission was granted
        if (message.value && onPermissionGranted) {
          onPermissionGranted(true)
        }
      }
    }

    // Add message listener
    browser.runtime.onMessage.addListener(messageListener)

    // Cleanup function
    return () => {
      browser.runtime.onMessage.removeListener(messageListener)
    }
  })

  // Reactive update when settings store changes - but only after initialization
  $effect(() => {
    if (hasInitialized) {
      const storePermission = getFirefoxPermission('httpsPermission')
      if (storePermission !== hasPermission) {
        hasPermission = storePermission
        showWarning = !storePermission && !isCheckingPermission
      }
    }
  })

  // Check permission with store integration and caching - run only once per URL change
  $effect(async () => {
    if (currentUrl && import.meta.env.BROWSER === 'firefox') {
      isCheckingPermission = true
      permissionCheckError = null

      try {
        // Kiểm tra ngay nếu là educational sites (có host permissions)
        const isEducationalSite =
          currentUrl.includes('youtube.com') ||
          currentUrl.includes('udemy.com') ||
          currentUrl.includes('coursera.org')

        if (isEducationalSite) {
          // Educational sites có host permissions - ngay lập tức set true
          await updateFirefoxPermission('httpsPermission', true)
          showWarning = false
          if (onPermissionGranted) {
            onPermissionGranted(true)
          }
        } else {
          // Check cache first
          const permissionKey = 'httpsPermission'
          const cached = getCachedPermission(permissionKey)

          if (cached) {
            console.log(
              '[PermissionWarningPrompt] Using cached permission:',
              cached.value
            )
            await updateFirefoxPermission(permissionKey, cached.value)
            showWarning = !cached.value

            if (cached.value && onPermissionGranted) {
              onPermissionGranted(true)
            }
          } else {
            // Check actual permission for general sites
            console.log(
              '[PermissionWarningPrompt] Checking Firefox permission for:',
              currentUrl
            )
            const permission = await checkPermission(currentUrl)
            console.log(
              '[PermissionWarningPrompt] Permission result:',
              permission
            )

            // Update store with result
            await updateFirefoxPermission(permissionKey, permission)
            showWarning = !permission

            // Notify parent component về permission status
            if (permission && onPermissionGranted) {
              onPermissionGranted(true)
            }
          }
        }
      } catch (error) {
        console.error(
          '[PermissionWarningPrompt] Permission check failed:',
          error
        )
        permissionCheckError = error.message
        showWarning = true
        await updateFirefoxPermission('httpsPermission', false)
      } finally {
        isCheckingPermission = false
      }
    } else {
      // Non-Firefox browsers hoặc không có URL
      await updateFirefoxPermission('httpsPermission', true)
      showWarning = false
      isCheckingPermission = false
      if (onPermissionGranted) {
        onPermissionGranted(true)
      }
    }
  })

  async function handleGrantPermission() {
    if (isRequestingPermission) return

    isRequestingPermission = true

    try {
      console.log(
        '[PermissionWarningPrompt] Requesting permission for:',
        currentUrl
      )
      const granted = await requestPermission(currentUrl)
      console.log(
        '[PermissionWarningPrompt] Permission request result:',
        granted
      )

      if (granted) {
        // Update store instead of local state
        await updateFirefoxPermission('httpsPermission', true)
        showWarning = false

        // Broadcast permission change via runtime message
        try {
          await browser.runtime.sendMessage({
            type: 'PERMISSION_CHANGED',
            permissionKey: 'httpsPermission',
            value: true,
            source: 'PermissionWarningPrompt',
            timestamp: Date.now(),
          })
          console.log(
            '[PermissionWarningPrompt] Permission change broadcasted successfully'
          )
        } catch (error) {
          console.warn(
            '[PermissionWarningPrompt] Failed to broadcast permission change:',
            error
          )
        }

        // Notify parent component
        if (onPermissionGranted) {
          onPermissionGranted(true)
        }

        // Show success feedback briefly
        setTimeout(() => {
          console.log(
            '[PermissionWarningPrompt] Permission granted successfully'
          )
        }, 500)
      } else {
        // User denied permission
        console.log('[PermissionWarningPrompt] Permission denied by user')
        await updateFirefoxPermission('httpsPermission', false)
      }
    } catch (error) {
      console.error(
        '[PermissionWarningPrompt] Permission request failed:',
        error
      )
      permissionCheckError = error.message
      await updateFirefoxPermission('httpsPermission', false)
    } finally {
      isRequestingPermission = false
    }
  }

  // triggerSidepanelUpdate function removed - now using browser.runtime.sendMessage instead

  // Expose permission status to parent
  let permissionStatus = $derived({
    hasPermission,
    isChecking: isCheckingPermission,
    showWarning,
    error: permissionCheckError,
  })
</script>

<!-- Warning banner khi cần permission - chỉ cho Reddit và general websites -->
<!-- YouTube, Udemy, Coursera đã có host_permissions nên không bao giờ hiển thị warning -->
{#if showWarning && !isCheckingPermission}
  <div class="p-4 min-w-90 absolute abs-center bg-surface-1 z-10">
    <div class="flex gap-1 justify-center flex-col space-y-3">
      <p class="text-xs text-balance !text-center text-text-secondary mt-4">
        {$t('permissionWarning.description')}
      </p>

      <button
        onclick={handleGrantPermission}
        disabled={isRequestingPermission}
        class="flex w-fit mx-auto items-center gap-2 px-3 py-1.5 bg-blackwhite/5 text-text-primary rounded-2xl text-xs font-medium hover:bg-blackwhite/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {#if isRequestingPermission}
          <Icon icon="solar:loader-2-bold" class="w-3 h-3 animate-spin" />
          <span>{$t('permissionWarning.requesting')}</span>
        {:else}
          <Icon icon="solar:shield-check-bold" class="w-3 h-3" />
          <span>{$t('permissionWarning.grant_permissions')}</span>
        {/if}
      </button>
    </div>
  </div>
{/if}
