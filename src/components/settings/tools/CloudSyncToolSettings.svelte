<script>
  // @ts-nocheck
  import Icon, { loadIcons } from '@iconify/svelte'
  import ToolIcon96 from '@/components/ui/ToolIcon96.svelte'
  import ToolEnableToggle from '@/components/inputs/ToolEnableToggle.svelte'
  import { onMount } from 'svelte'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import {
    cloudSyncStore,
    initSync,
    login,
    logout,
    syncNow,
    setAutoSync,
    setSyncPreferences,
  } from '@/services/cloudSync/cloudSyncService.svelte.js'

  // Load icons
  loadIcons([
    'logos:google-icon',
    'heroicons:cloud-arrow-up',
    'heroicons:cloud-arrow-down',
    'heroicons:arrow-path',
    'heroicons:check-circle',
    'heroicons:exclamation-circle',
    'heroicons:arrow-right-on-rectangle',
  ])

  // Cloud Sync enabled state
  let cloudSyncEnabled = $derived.by(
    () => settings.tools?.cloudSync?.enabled ?? true,
  )

  function updateCloudSyncEnabled(value) {
    updateSettings({
      tools: {
        ...settings.tools,
        cloudSync: {
          ...settings.tools.cloudSync,
          enabled: value,
        },
      },
    })
  }

  let isLoggingIn = $state(false)
  let showAutoSyncPrompt = $state(false)
  let loginError = $state(null)

  onMount(async () => {
    await initSync()
  })

  async function handleLogin() {
    isLoggingIn = true
    loginError = null

    try {
      const result = await login()

      if (result.needsAutoSyncChoice) {
        showAutoSyncPrompt = true
      }
    } catch (error) {
      loginError = error.message
    } finally {
      isLoggingIn = false
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  async function handleSyncNow() {
    try {
      await syncNow()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  async function handleAutoSyncChoice(enabled) {
    await setAutoSync(enabled)
    showAutoSyncPrompt = false
  }

  async function handleSyncPreferenceChange(type, enabled) {
    await setSyncPreferences({ [type]: enabled })
  }

  function formatLastSyncTime(isoString) {
    if (!isoString) return 'Never'

    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

    return date.toLocaleDateString()
  }
</script>

<div class="flex flex-col gap-6 py-5">
  <div class="flex gap-4">
    <div class="size-24 bg-background shrink-0 overflow-hidden relative">
      <ToolIcon96 animated={cloudSyncEnabled} />
      <Icon
        icon="mdi:google-drive"
        class="size-8 center-abs text-muted dark:text-text-primary dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
      />
    </div>

    <div class="text-left">
      <div class="font-bold text-text-primary text-xs">Cloud Sync</div>
      <div class="text-xs mt-2 pb-3 text-text-secondary text-pretty">
        Sync your data across all your devices via Google Drive.
      </div>
      <!-- Enable Cloud Sync Toggle -->
      <ToolEnableToggle
        id="cloudsync-enabled"
        bind:checked={cloudSyncEnabled}
        onCheckedChange={(value) => updateCloudSyncEnabled(value)}
        icon="heroicons:cloud"
        enabledText="Enabled"
        disabledText="Disabled"
      />
    </div>
  </div>

  {#if cloudSyncEnabled}
    {#if !cloudSyncStore.isLoggedIn}
      <!-- Not logged in state -->
      <button
        onclick={handleLogin}
        disabled={isLoggingIn}
        class="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-surface-2 border border-border rounded-md hover:bg-gray-50 dark:hover:bg-surface-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isLoggingIn}
          <Icon icon="heroicons:arrow-path" class="size-5 animate-spin" />
          <span>Signing in...</span>
        {:else}
          <Icon icon="logos:google-icon" class="size-5" />
          <span>Sign in with Google</span>
        {/if}
      </button>

      {#if loginError}
        <div class="flex items-center gap-2 text-red-500 text-xs">
          <Icon icon="heroicons:exclamation-circle" class="size-4" />
          <span>{loginError}</span>
        </div>
      {/if}
    {:else}
      <!-- Logged in state -->
      <div class="flex flex-col gap-4">
        <!-- User info -->
        <div
          class="flex items-center gap-3 p-3 bg-background rounded-md border border-border/50"
        >
          {#if cloudSyncStore.userPicture}
            <img
              src={cloudSyncStore.userPicture}
              alt={cloudSyncStore.userName}
              class="size-10 rounded-full"
            />
          {:else}
            <div
              class="size-10 rounded-full bg-primary/20 flex items-center justify-center"
            >
              <Icon icon="heroicons:user" class="size-6 text-primary" />
            </div>
          {/if}
          <div class="flex-1 min-w-0">
            <p class="font-medium text-text-primary truncate">
              {cloudSyncStore.userName}
            </p>
            <p class="text-xs text-muted truncate">
              {cloudSyncStore.userEmail}
            </p>
          </div>
        </div>

        <!-- Sync status -->
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted">Last sync:</span>
          <div class="flex items-center gap-1">
            {#if cloudSyncStore.isSyncing}
              <Icon
                icon="heroicons:arrow-path"
                class="size-4 animate-spin text-primary"
              />
              <span class="text-primary">Syncing...</span>
            {:else if cloudSyncStore.syncError}
              <Icon
                icon="heroicons:exclamation-circle"
                class="size-4 text-red-500"
              />
              <span class="text-red-500" title={cloudSyncStore.syncError}>
                Sync failed
              </span>
            {:else}
              <Icon
                icon="heroicons:check-circle"
                class="size-4 text-green-500"
              />
              <span>{formatLastSyncTime(cloudSyncStore.lastSyncTime)}</span>
            {/if}
          </div>
        </div>

        <!-- Auto-sync toggle -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-text-secondary">Auto sync</span>
          <button
            onclick={() => setAutoSync(!cloudSyncStore.autoSyncEnabled)}
            aria-label="Auto sync"
            class="relative w-10 h-5 rounded-full transition-colors {cloudSyncStore.autoSyncEnabled
              ? 'bg-primary'
              : 'bg-gray-300 dark:bg-surface-3'}"
          >
            <span
              class="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform {cloudSyncStore.autoSyncEnabled
                ? 'translate-x-5'
                : 'translate-x-0'}"
            ></span>
          </button>
        </div>

        <!-- Sync Preferences -->
        <div class="border-t border-border pt-4 mt-2">
          <div class="mb-3">
            <h4 class="text-sm font-medium text-text-primary">
              Sync Preferences
            </h4>
            <p class="text-xs text-muted mt-1">
              Choose which data types to sync with cloud
            </p>
          </div>

          <!-- Settings Checkbox -->
          <label class="flex items-start gap-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cloudSyncStore.syncPreferences.settings}
              onchange={(e) =>
                handleSyncPreferenceChange('settings', e.target.checked)}
              disabled={cloudSyncStore.isSyncing}
              class="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
            />
            <div class="flex-1">
              <div class="text-sm text-text-primary">Settings</div>
              <div class="text-xs text-muted">
                Sync app settings and preferences
              </div>
            </div>
          </label>

          <!-- History Checkbox -->
          <label class="flex items-start gap-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cloudSyncStore.syncPreferences.history}
              onchange={(e) =>
                handleSyncPreferenceChange('history', e.target.checked)}
              disabled={cloudSyncStore.isSyncing}
              class="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
            />
            <div class="flex-1">
              <div class="text-sm text-text-primary">History</div>
              <div class="text-xs text-muted">Sync summary history</div>
            </div>
          </label>

          <!-- Archive + Tags Checkbox -->
          <label class="flex items-start gap-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cloudSyncStore.syncPreferences.archive}
              onchange={(e) =>
                handleSyncPreferenceChange('archive', e.target.checked)}
              disabled={cloudSyncStore.isSyncing}
              class="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
            />
            <div class="flex-1">
              <div class="text-sm text-text-primary">Archive & Tags</div>
              <div class="text-xs text-muted">Sync archived items and tags</div>
            </div>
          </label>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2">
          <button
            onclick={handleSyncNow}
            disabled={cloudSyncStore.isSyncing}
            class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              icon="heroicons:arrow-path"
              class="size-4 {cloudSyncStore.isSyncing ? 'animate-spin' : ''}"
            />
            <span class="text-xs">Sync Now</span>
          </button>

          <button
            onclick={handleLogout}
            class="flex items-center justify-center gap-2 px-3 py-2 text-red-500 border border-red-500/20 rounded-md hover:bg-red-500/10 transition-colors"
          >
            <Icon icon="heroicons:arrow-right-on-rectangle" class="size-4" />
            <span class="text-xs">Sign Out</span>
          </button>
        </div>

        <!-- Error Display -->
        {#if cloudSyncStore.syncError}
          <div
            class="mt-2 p-2 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-md break-all"
          >
            <span class="font-bold">Error:</span>
            {cloudSyncStore.syncError}
          </div>
        {/if}

        <!-- Debug Logs (Temporary for debugging) -->
        <div class="mt-4 border-t border-border pt-2">
          <div class="flex items-center justify-between mb-1">
            <div class="text-[10px] uppercase font-bold text-muted">
              Debug Logs
            </div>
            <div class="text-[10px] text-muted">
              {cloudSyncStore.debugLogs?.length || 0} events
            </div>
          </div>
          <div
            class="bg-background border border-border rounded p-2 h-32 overflow-y-auto font-mono text-[10px] space-y-1"
          >
            {#if cloudSyncStore.debugLogs && cloudSyncStore.debugLogs.length > 0}
              {#each cloudSyncStore.debugLogs as log}
                <div
                  class={log.type === 'error'
                    ? 'text-red-500'
                    : log.type === 'success'
                      ? 'text-green-500'
                      : 'text-text-secondary'}
                >
                  <span class="opacity-50">[{log.time}]</span>
                  {log.msg}
                </div>
              {/each}
            {:else}
              <div class="text-muted italic">
                No logs yet... Try clicking Sync Now.
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Auto-sync prompt modal -->
    {#if showAutoSyncPrompt}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div
          class="bg-surface-1 border border-border rounded-lg p-6 max-w-sm mx-4 shadow-xl"
        >
          <div class="flex items-center gap-3 mb-4">
            <Icon icon="heroicons:cloud-arrow-up" class="size-8 text-primary" />
            <h3 class="font-semibold text-text-primary">Enable Auto Sync?</h3>
          </div>

          <p class="text-xs text-muted mb-6">
            Auto sync will keep your data synchronized across devices. You can
            change this setting anytime.
          </p>

          <div class="flex gap-3">
            <button
              onclick={() => handleAutoSyncChoice(false)}
              class="flex-1 px-4 py-2 text-xs border border-border rounded-md hover:bg-surface-2 transition-colors"
            >
              Manual Sync
            </button>
            <button
              onclick={() => handleAutoSyncChoice(true)}
              class="flex-1 px-4 py-2 text-xs bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Enable Auto Sync
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
