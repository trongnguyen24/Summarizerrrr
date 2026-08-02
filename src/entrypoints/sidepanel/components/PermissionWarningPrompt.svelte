<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import {
    checkPermission,
    requestPermission,
  } from '@/services/firefoxPermissionService.js'
  import {
    updateFirefoxPermission,
    getFirefoxPermission,
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
          message,
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
        // Always ask the API, never the settingsStore permission cache: that
        // cache is keyed by the bare string 'httpsPermission' with no URL
        // dimension, which was sound while getRequiredPermission() returned a
        // global '<all_urls>' but is not now that the answer is per-site. A
        // cached `false` from an ungranted site would otherwise cover the side
        // panel with this warning on youtube.com (a static host permission),
        // and a cached `true` would skip the prompt on an ungranted site and
        // hand the user a silent extraction failure instead.
        //
        // checkPermission() already returns true immediately for sites covered
        // by the manifest's static host_permissions (YouTube, Udemy, Coursera,
        // Reddit, Wikipedia) via getRequiredPermission() returning null - no
        // separate hardcoded site list needed here.
        console.log(
          '[PermissionWarningPrompt] Checking Firefox permission for:',
          currentUrl,
        )
        const permission = await checkPermission(currentUrl)
        console.log('[PermissionWarningPrompt] Permission result:', permission)

        // Update store with result
        await updateFirefoxPermission('httpsPermission', permission)
        showWarning = !permission

        // Notify parent component về permission status
        if (permission && onPermissionGranted) {
          onPermissionGranted(true)
        }
      } catch (error) {
        console.error(
          '[PermissionWarningPrompt] Permission check failed:',
          error,
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
        currentUrl,
      )
      const granted = await requestPermission(currentUrl)
      console.log(
        '[PermissionWarningPrompt] Permission request result:',
        granted,
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
            '[PermissionWarningPrompt] Permission change broadcasted successfully',
          )
        } catch (error) {
          console.warn(
            '[PermissionWarningPrompt] Failed to broadcast permission change:',
            error,
          )
        }

        // Notify parent component
        if (onPermissionGranted) {
          onPermissionGranted(true)
        }

        // Show success feedback briefly
        setTimeout(() => {
          console.log(
            '[PermissionWarningPrompt] Permission granted successfully',
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
        error,
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

<!-- Overlay khi thiếu permission cho site hiện tại. Sites đã có
     host_permissions tĩnh (YouTube, Udemy, Coursera, Reddit, Wikipedia) không
     bao giờ hiển thị vì checkPermission() trả true ngay.

     `fixed inset-0` + z-[45]: phải che toàn bộ panel, không chỉ khối nút.
     Thang z của sidepanel, giữ đúng thứ tự này khi thêm layer mới:
       ≤ 40  content (ChatEmptyState z-40, composer z-30, summary content z-10)
         45  overlay này
         50  chrome luôn phải bấm được (sticky header 2 surface, nút
             archive/settings) - đó là đường duy nhất vào Settings → Site
             Access khi panel đang bị che, cần cho cả trang mà Firefox không
             bao giờ cấp quyền (restricted domain như addons.mozilla.org).
       ≥ 50  onboarding / Noti.
     Đừng đặt content ở z-45+ nữa: ChatEmptyState từng ở z-40 ngang sticky
     header nên overlay không có khe nào để chen vào giữa. -->
{#if showWarning && !isCheckingPermission}
  <div
    class="fixed inset-0 z-[45] flex items-center justify-center bg-surface-1 p-4"
  >
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
          <Icon icon="svg-spinners:ring-resize" width="12" height="12" />
          <span>{$t('permissionWarning.requesting')}</span>
        {:else}
          <Icon icon="solar:shield-check-bold" width="12" height="12" />
          <span>{$t('permissionWarning.grant_permissions')}</span>
        {/if}
      </button>
    </div>
  </div>
{/if}
