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
        hasPermission = await checkPermission(currentUrl)
        showWarning = !hasPermission

        // Notify parent component về permission status
        if (hasPermission && onPermissionGranted) {
          onPermissionGranted(true)
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

  // Expose permission status to parent
  let permissionStatus = $derived({
    hasPermission,
    isChecking: isCheckingPermission,
    showWarning,
    error: permissionCheckError,
  })
</script>

<!-- Loading state khi đang check permission -->
{#if isCheckingPermission}
  <div
    class="mx-6 mb-2 rounded-xl border border-surface-2 bg-surface-1/50 p-3"
    in:fade={{ duration: 200 }}
    out:fade={{ duration: 200 }}
  >
    <div class="flex items-center gap-3">
      <Icon
        icon="solar:loader-2-bold"
        class="w-4 h-4 text-text-secondary animate-spin shrink-0"
      />
      <span class="text-xs text-text-secondary"> Checking permissions... </span>
    </div>
  </div>
{/if}

<!-- Warning banner khi cần permission -->
{#if showWarning && !isCheckingPermission}
  <div
    class="mx-6 mb-4 rounded-xl border border-warning/20 bg-warning/5 p-4"
    in:slide={{ duration: 300 }}
    out:slide={{ duration: 200 }}
  >
    <div class="flex items-start gap-3">
      <Icon
        icon="solar:shield-warning-bold"
        class="w-5 h-5 text-warning mt-0.5 shrink-0"
      />
      <div class="flex-1 space-y-3">
        <div>
          <h3 class="text-sm font-medium text-text-primary">
            Permission Required
          </h3>
          <p class="text-xs text-text-secondary mt-1">
            This website requires permission to access content for
            summarization.
          </p>
          {#if permissionCheckError}
            <p class="text-xs text-error mt-1">
              Error: {permissionCheckError}
            </p>
          {/if}
        </div>

        <button
          onclick={handleGrantPermission}
          disabled={isRequestingPermission}
          class="flex items-center gap-2 px-3 py-1.5 bg-warning text-white rounded-lg text-xs font-medium hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {#if isRequestingPermission}
            <Icon icon="solar:loader-2-bold" class="w-3 h-3 animate-spin" />
            <span>Requesting...</span>
          {:else}
            <Icon icon="solar:shield-check-bold" class="w-3 h-3" />
            <span>Grant Permission</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Success state (optional, minimal) -->
{#if hasPermission && !isCheckingPermission && import.meta.env.BROWSER === 'firefox'}
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
{/if}
