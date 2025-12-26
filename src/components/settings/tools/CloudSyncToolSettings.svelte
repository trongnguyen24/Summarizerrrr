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
    resolveSettingsConflict,
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
      await login()
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

  // Helper functions for conflict dialog

  // Check if settings has any API key configured
  function getApiKeyStatus(settings) {
    if (!settings) return 'No API keys'

    const apiKeyFields = [
      'geminiApiKey',
      'geminiAdvancedApiKey',
      'chatgptApiKey',
      'deepseekApiKey',
      'groqApiKey',
      'cerebrasApiKey',
      'openrouterApiKey',
      'openaiCompatibleApiKey',
    ]

    const hasKey = apiKeyFields.some(
      (field) => settings[field] && settings[field].trim() !== '',
    )
    return hasKey ? '✓ Has API keys' : 'No API keys'
  }

  // Default prompt value to compare against
  const DEFAULT_PROMPT = 'Summarize content, format by ## and ###: __CONTENT__'

  // Check if settings has any custom prompts
  function getPromptStatus(settings) {
    if (!settings) return 'Default'

    const promptFields = [
      'youtubeCustomPromptContent',
      'webCustomPromptContent',
      'chapterCustomPromptContent',
      'courseSummaryCustomPromptContent',
      'courseConceptsCustomPromptContent',
      'selectedTextCustomPromptContent',
      'analyzeCustomPromptContent',
      'explainCustomPromptContent',
      'debateCustomPromptContent',
      'commentCustomPromptContent',
    ]

    const hasCustom = promptFields.some((field) => {
      const value = settings[field]
      return value && value.trim() !== '' && value !== DEFAULT_PROMPT
    })

    return hasCustom ? '✓ Has custom prompts' : 'Default'
  }

  function formatRelativeTimestamp(timestamp) {
    if (!timestamp) return 'Unknown'
    const now = Date.now()
    const diffMs = now - timestamp
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  // Handle conflict resolution
  let isResolvingConflict = $state(false)

  async function handleConflictChoice(choice) {
    isResolvingConflict = true
    try {
      await resolveSettingsConflict(choice)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      isResolvingConflict = false
    }
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
      <div class="flex flex-col gap-6">
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
            class="flex relative gap-6 items-center bg-dot overflow-hidden text-xs"
          >
            <div
              class="overflow-hidden relative p-3 flex items-center justify-center"
            >
              <div
                class="z-40 absolute inset-2 border border-muted pointer-events-none"
              ></div>
              {#if cloudSyncStore.userPicture}
                <img
                  src={cloudSyncStore.userPicture}
                  alt={cloudSyncStore.userName}
                  class="size-18"
                />
              {:else}
                <Icon icon="heroicons:user" class="size-6 text-primary" />
              {/if}
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <p class="text-text-primary font-bold truncate">
                {cloudSyncStore.userName}
              </p>
              <p class=" text-text-primary font-bold truncate">
                {cloudSyncStore.userEmail}
              </p>
              <p class=" text-text-secondary">
                Synced {formatLastSyncTime(cloudSyncStore.lastSyncTime, now)}
              </p>
            </div>
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
          <!-- <div class="w-full h-1 border-t border-border"></div> -->
          <!-- <div
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
          </div> -->
        </div>
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
      </div>
    {/if}

    <!-- Settings Conflict Dialog -->
    {#if cloudSyncStore.pendingSettingsConflict}
      {@const conflict = cloudSyncStore.pendingSettingsConflict}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div
          class="bg-surface-1 border border-border rounded-lg p-5 max-w-md mx-4 shadow-xl"
        >
          <!-- Header -->
          <div class="flex items-center gap-3 mb-4">
            <Icon
              icon="heroicons:exclamation-triangle"
              class="size-6 text-yellow-500"
            />
            <h3 class="font-semibold text-text-primary">Settings Sync</h3>
          </div>

          <p class="text-xs text-muted mb-4">
            Your local settings differ from cloud. Choose which settings to
            keep:
          </p>

          <!-- Local Settings Card -->
          <div
            class="border border-border rounded-lg p-3 mb-3 hover:border-primary/50 transition-colors"
          >
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-2">
                <Icon
                  icon="heroicons:device-phone-mobile"
                  class="size-4 text-primary"
                />
                <span class="text-xs font-medium text-text-primary"
                  >This Device</span
                >
              </div>
              <span class="text-[10px] text-muted">
                {formatRelativeTimestamp(conflict.localTimestamp)}
              </span>
            </div>
            <div class="text-[11px] text-text-secondary space-y-1 mb-3">
              <div class="flex gap-2">
                <span class="text-muted w-16">API Keys:</span>
                <span
                  class={getApiKeyStatus(conflict.localSettings).includes('✓')
                    ? 'text-green-500'
                    : ''}>{getApiKeyStatus(conflict.localSettings)}</span
                >
              </div>
              <div class="flex gap-2">
                <span class="text-muted w-16">Prompts:</span>
                <span
                  class={getPromptStatus(conflict.localSettings).includes('✓')
                    ? 'text-green-500'
                    : ''}>{getPromptStatus(conflict.localSettings)}</span
                >
              </div>
            </div>
            <button
              onclick={() => handleConflictChoice('local')}
              disabled={isResolvingConflict}
              class="w-full px-3 py-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isResolvingConflict ? 'Processing...' : 'Use Local'}
            </button>
          </div>

          <!-- Cloud Settings Card -->
          <div
            class="border border-border rounded-lg p-3 mb-4 hover:border-blue-500/50 transition-colors"
          >
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-2">
                <Icon icon="heroicons:cloud" class="size-4 text-blue-500" />
                <span class="text-xs font-medium text-text-primary">Cloud</span>
              </div>
              <span class="text-[10px] text-muted">
                {formatRelativeTimestamp(conflict.cloudTimestamp)}
              </span>
            </div>
            <div class="text-[11px] text-text-secondary space-y-1 mb-3">
              <div class="flex gap-2">
                <span class="text-muted w-16">API Keys:</span>
                <span
                  class={getApiKeyStatus(conflict.cloudSettings).includes('✓')
                    ? 'text-green-500'
                    : ''}>{getApiKeyStatus(conflict.cloudSettings)}</span
                >
              </div>
              <div class="flex gap-2">
                <span class="text-muted w-16">Prompts:</span>
                <span
                  class={getPromptStatus(conflict.cloudSettings).includes('✓')
                    ? 'text-green-500'
                    : ''}>{getPromptStatus(conflict.cloudSettings)}</span
                >
              </div>
            </div>
            <button
              onclick={() => handleConflictChoice('cloud')}
              disabled={isResolvingConflict}
              class="w-full px-3 py-1.5 text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md hover:bg-blue-500/20 transition-colors disabled:opacity-50"
            >
              {isResolvingConflict ? 'Processing...' : 'Use Cloud'}
            </button>
          </div>

          <!-- Cancel Button -->
          <button
            onclick={() => handleConflictChoice('cancel')}
            disabled={isResolvingConflict}
            class="w-full px-3 py-2 text-xs text-muted border border-border rounded-md hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            Cancel - Don't sync settings now
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
