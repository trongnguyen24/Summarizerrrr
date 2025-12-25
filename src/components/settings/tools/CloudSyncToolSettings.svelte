<script>
  // @ts-nocheck
  import Icon, { loadIcons } from '@iconify/svelte'
  import ToolIcon96 from '@/components/ui/ToolIcon96.svelte'
  import ToolEnableToggle from '@/components/inputs/ToolEnableToggle.svelte'
  import EnableToggle from '@/components/inputs/EnableToggle.svelte'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'
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

  let now = $state(Date.now())

  onMount(async () => {
    await initSync()

    const interval = setInterval(() => {
      now = Date.now()
    }, 30000) // Update every 30 seconds for better responsiveness

    return () => clearInterval(interval)
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

  function formatLastSyncTime(isoString, currentNow) {
    if (!isoString) return 'Never'

    const date = new Date(isoString)
    const diffMs = currentNow - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`

    // After 1 hour, show full date and time
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
</script>

<div class="flex flex-col gap-8 py-5">
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
      <div class="flex flex-col gap-6">
        <div>
          <label class="text-text-primary">Sync Mode</label>
          <p class="mt-1 text-muted text-xs">
            Choose how your data syncs with Google Drive
          </p>
          <div class="grid mt-3 grid-cols-2 gap-2">
            <ButtonSet
              title="Manual"
              class="setting-btn {!cloudSyncStore.autoSyncEnabled
                ? 'active'
                : ''}"
              onclick={() => setAutoSync(false)}
              Description="Sync only when you click Sync Now"
            >
              <Icon icon="heroicons:hand-raised" width="16" height="16" />
            </ButtonSet>
            <ButtonSet
              title="Auto"
              class="setting-btn {cloudSyncStore.autoSyncEnabled
                ? 'active'
                : ''}"
              onclick={() => setAutoSync(true)}
              Description="Sync automatically in the background"
            >
              <Icon icon="heroicons:bolt" width="16" height="16" />
            </ButtonSet>
          </div>
        </div>

        <!-- Sync Preferences -->
        <div class="">
          <div class="mb-3">
            <h4 class="text-xs font-medium text-text-primary">
              Sync Preferences
            </h4>
            <p class="text-xs text-muted mt-1">
              Choose which data types to sync with cloud
            </p>
          </div>

          <div class="grid mt-3 grid-cols-3 gap-2">
            <EnableToggle
              id="sync-settings"
              bind:checked={cloudSyncStore.syncPreferences.settings}
              onCheckedChange={(value) =>
                handleSyncPreferenceChange('settings', value)}
              text="Settings"
              useAnimation={false}
            />

            <EnableToggle
              id="sync-history"
              bind:checked={cloudSyncStore.syncPreferences.history}
              onCheckedChange={(value) =>
                handleSyncPreferenceChange('history', value)}
              text="History"
              useAnimation={false}
            />

            <!-- Library (Archive + Tags) Toggle -->

            <EnableToggle
              id="sync-library"
              bind:checked={cloudSyncStore.syncPreferences.library}
              onCheckedChange={(value) =>
                handleSyncPreferenceChange('library', value)}
              text="Library"
              useAnimation={false}
            />
          </div>
        </div>

        <!-- Action buttons -->
        <!-- <div class="flex gap-2">
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
        </div> -->

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

        <div class="relative bg-background overflow-hidden">
          <span
            class="absolute z-50 size-6 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <span
            class="absolute z-[2] size-6 rotate-45 bg-surface-1 top-px border border-border right-px translate-x-1/2 -translate-y-1/2"
          ></span>
          <span
            class="absolute z-[5] size-4 rotate-45 bg-text-primary top-px right-px translate-x-1/2 -translate-y-1/2"
          ></span>
          <div
            class="z-[1] absolute inset-0 border border-border pointer-events-none"
          ></div>
          <!-- User info -->
          <div
            class="flex relative pr-2 gap-2 items-center bg-blackwhite-5 overflow-hidden text-xs"
          >
            <div
              class="overflow-hidden relative p-2 flex items-center justify-center"
            >
              <div
                class="z-40 absolute inset-2 border border-muted pointer-events-none"
              ></div>
              {#if cloudSyncStore.userPicture}
                <img
                  src={cloudSyncStore.userPicture}
                  alt={cloudSyncStore.userName}
                  class="size-12"
                />
              {:else}
                <Icon icon="heroicons:user" class="size-6 text-primary" />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <!-- <p class="text-text-primary font-bold truncate">
                {cloudSyncStore.userName}
              </p> -->
              <p class=" text-text-primary font-bold truncate">
                {cloudSyncStore.userEmail}
              </p>
              <p class="mt-1 text-text-secondary">
                Synced {formatLastSyncTime(cloudSyncStore.lastSyncTime, now)}
              </p>
            </div>
            <!-- <div class=" w-fit justify-center items-end flex shrink-0 relative">
              <div
                class="flex justify-center items-center size-10 w-16 border-l border-dashed border-border"
              >
                <Icon
                  icon="heroicons:cog-6-tooth"
                  class="size-4 shrink-0 transition-colors {cloudSyncStore
                    .syncPreferences.settings
                    ? 'text-text-secondary'
                    : 'text-border'}"
                />
              </div>
              <div
                class="flex justify-center items-center size-10 w-16 border-l border-dashed border-border"
              >
                <Icon
                  icon="heroicons:clock"
                  class="size-4 shrink-0 transition-colors {cloudSyncStore
                    .syncPreferences.history
                    ? 'text-text-secondary'
                    : 'text-border'}"
                />
              </div>
              <div
                class="flex justify-center items-center size-10 w-16 border-l border-dashed border-border"
              >
                <Icon
                  icon="heroicons:archive-box"
                  class="size-4 shrink-0 transition-colors {cloudSyncStore
                    .syncPreferences.archive
                    ? 'text-text-secondary'
                    : 'text-border'}"
                />
              </div>
              <div
                class="flex justify-center items-center size-10 w-16 border-l border-dashed border-border"
              >
                <Icon
                  icon="tabler:tag"
                  class="size-4 shrink-0 transition-colors {cloudSyncStore
                    .syncPreferences.archive
                    ? 'text-text-secondary'
                    : 'text-border'}"
                />
              </div>
            </div> -->
          </div>

          <div
            class="flex gap-0 justify-center items-center border-t border-border"
          >
            <button
              onclick={handleSyncNow}
              disabled={cloudSyncStore.isSyncing}
              class="flex flex-1 items-center justify-center gap-2 py-3 px-4 text-text-primary hover:bg-blackwhite/10 transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon
                icon="heroicons:arrow-path"
                class="size-4 {cloudSyncStore.isSyncing ? 'animate-spin' : ''}"
              />
              Sync Now
            </button>
            <button
              onclick={handleLogout}
              class="flex w-fit items-center justify-center gap-2 py-3 px-4 border-l border-border text-text-primary hover:bg-blackwhite/10 duration-100 transition-colors"
            >
              <Icon
                icon="heroicons:arrow-right-on-rectangle"
                class="size-4"
              />Sign Out
            </button>
          </div>
          <!-- Debug Logs -->
          <div
            class="bg-background border thin-scroll border-border rounded p-2 h-32 overflow-y-auto font-mono text-[10px] space-y-1"
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
