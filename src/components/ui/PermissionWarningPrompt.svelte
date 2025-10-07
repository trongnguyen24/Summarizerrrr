<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { fade, slide } from 'svelte/transition'
  import {
    checkPermission,
    requestPermission,
  } from '@/services/firefoxPermissionService.js'
  import { browser } from 'wxt/browser'

  let { currentUrl = '', onPermissionGranted = () => {} } = $props()

  let hasPermission = $state(false)
  let isCheckingPermission = $state(true)
  let isRequestingPermission = $state(false)
  let showWarning = $state(false)
  let permissionCheckError = $state(null)

  // Check permission khi component mount hoặc URL thay đổi
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
          hasPermission = true
          showWarning = false
          if (onPermissionGranted) {
            onPermissionGranted(true)
          }
        } else {
          // Chỉ check permission cho Reddit và general sites
          hasPermission = await checkPermission(currentUrl)
          showWarning = !hasPermission

          // Notify parent component về permission status
          if (hasPermission && onPermissionGranted) {
            onPermissionGranted(true)
          }
        }
      } catch (error) {
        console.error(
          '[PermissionWarningPrompt] Permission check failed:',
          error
        )
        permissionCheckError = error.message
        showWarning = true
        hasPermission = false
      } finally {
        isCheckingPermission = false
      }
    } else {
      // Non-Firefox browsers hoặc không có URL
      hasPermission = true
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
      const granted = await requestPermission(currentUrl)

      if (granted) {
        hasPermission = true
        showWarning = false

        // Notify parent component
        if (onPermissionGranted) {
          onPermissionGranted(true)
        }

        // Trigger sidepanel update để refresh permission status
        triggerSidepanelUpdate()

        // Show success feedback briefly
        setTimeout(() => {
          console.log(
            '[PermissionWarningPrompt] Permission granted successfully'
          )
        }, 500)
      } else {
        // User denied permission
        console.log('[PermissionWarningPrompt] Permission denied by user')
      }
    } catch (error) {
      console.error(
        '[PermissionWarningPrompt] Permission request failed:',
        error
      )
      permissionCheckError = error.message
    } finally {
      isRequestingPermission = false
    }
  }

  // Trigger sidepanel update bằng cách fake history change
  function triggerSidepanelUpdate() {
    try {
      const currentUrl = window.location.href
      // Push state với temporary hash
      window.history.pushState({}, '', currentUrl + '#permission-updated')
      // Sử dụng history.back() để quay lại state trước đó
      setTimeout(() => {
        window.history.back()
      }, 50)
    } catch (error) {
      console.log('Could not trigger sidepanel update:', error)
    }
  }

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
        Default access YouTube, Udemy and Coursera. For summarize other sites,
        please grant permissions below.
      </p>

      {#if permissionCheckError}
        <p class="text-xs text-error mt-1">
          Error: {permissionCheckError}
        </p>
      {/if}

      <button
        onclick={handleGrantPermission}
        disabled={isRequestingPermission}
        class="flex w-fit mx-auto items-center gap-2 px-3 py-1.5 bg-blackwhite/5 text-text-primary rounded-2xl text-xs font-medium hover:bg-blackwhite/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {#if isRequestingPermission}
          <Icon icon="solar:loader-2-bold" class="w-3 h-3 animate-spin" />
          <span>Requesting...</span>
        {:else}
          <Icon icon="solar:shield-check-bold" class="w-3 h-3" />
          <span>Grant permissions</span>
        {/if}
      </button>

      <!-- Thông tin về educational sites -->
      <!-- <p class="text-xs text-text-secondary/70 !text-center">
        YouTube, Udemy, and Coursera work automatically without permission.
      </p> -->
    </div>
  </div>
{/if}

<!-- Success state (optional, minimal) -->
<!-- {#if hasPermission && !isCheckingPermission && import.meta.env.BROWSER === 'firefox'}
  <div
    class="mx-6 mb-2 rounded-xl border border-success/20 bg-success/5 p-2"
    in:fade={{ duration: 300 }}
    out:fade={{ duration: 200 }}
  >
    <div class="flex items-center gap-2">
      <Icon
        icon="solar:shield-check-bold"
        class="w-3 h-3 text-success shrink-0"
      />
      <span class="text-xs text-success"> Permissions granted </span>
    </div>
  </div>
{/if} -->
