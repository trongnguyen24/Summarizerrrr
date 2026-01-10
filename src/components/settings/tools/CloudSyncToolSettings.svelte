<script>
  // @ts-nocheck
  import Icon, { loadIcons } from '@iconify/svelte'
  import ToolIcon96 from '@/components/ui/ToolIcon96.svelte'
  import ToolEnableToggle from '@/components/inputs/ToolEnableToggle.svelte'
  import EnableToggle from '@/components/inputs/EnableToggle.svelte'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'
  import { onMount } from 'svelte'
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import {
    cloudSyncStore,
    initSync,
    refreshSyncState,
    login,
    logout,
    syncNow,
    setAutoSync,
    setSyncPreferences,
    resolveSettingsConflict,
    saveCustomCredentials,
    getCustomCredentials,
  } from '@/services/cloudSync/cloudSyncService.svelte.js'

  // Import refactored components
  import CloudSyncUserCard from '@/components/tools/cloudsync/CloudSyncUserCard.svelte'
  import SettingsConflictDialog from '@/components/tools/cloudsync/SettingsConflictDialog.svelte'
  import TextInput from '@/components/inputs/TextInput.svelte'
  import ApiKeyInput from '@/components/inputs/ApiKeyInput.svelte'
  import { Dialog } from 'bits-ui'
  import { slideScaleFade, fadeOnly } from '@/lib/ui/slideScaleFade.js'

  // Load icons
  loadIcons([
    'logos:google-icon',
    'heroicons:cloud-arrow-up',
    'heroicons:cloud-arrow-down',
    'heroicons:arrow-path',
    'heroicons:check-circle',
    'heroicons:exclamation-circle',
    'heroicons:arrow-right-on-rectangle',
    'heroicons:shield-check',
    'heroicons:key',
    'heroicons:cog-6-tooth',
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

  // BYOK OAuth credentials state
  let customClientId = $state('')
  let customClientSecret = $state('')
  let credentialsSaved = $state(false)
  let credentialsError = $state(null)
  let showRedirectUrisDialog = $state(false)
  let copiedUri = $state(null)

  const redirectUris = [
    {
      browser: 'Chrome Extension',
      url: 'https://ahfjndakflcegianjdojpldllodpkkpc.chromiumapp.org/',
    },
    {
      browser: 'Firefox Addon',
      url: 'https://5addcb3f-a5ee-4df3-b7e6-a30bf3445a6d.extensions.allizom.org/',
    },
    {
      browser: 'Edge Extension',
      url: 'https://kgoolaebmcbhbjokofmhdcjbljagaiif.chromiumapp.org/',
    },
  ]

  async function copyToClipboard(url, browser) {
    await navigator.clipboard.writeText(url)
    copiedUri = browser
    setTimeout(() => (copiedUri = null), 2000)
  }

  onMount(async () => {
    // Load existing custom credentials if any
    const existingCreds = await getCustomCredentials()
    if (existingCreds) {
      customClientId = existingCreds.clientId
      customClientSecret = existingCreds.clientSecret
      credentialsSaved = true
    }

    await initSync()

    const interval = setInterval(async () => {
      await refreshSyncState()
    }, 30000)

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

  // --- BYOK (Bring Your Own Key) Handlers ---

  async function handleSaveCredentials() {
    credentialsError = null
    credentialsSaved = false

    const trimmedClientId = customClientId.trim()
    const trimmedClientSecret = customClientSecret.trim()

    // If both are empty, clear credentials
    if (!trimmedClientId && !trimmedClientSecret) {
      try {
        await saveCustomCredentials('', '')
        credentialsSaved = false // Not saved, just cleared
        return
      } catch (error) {
        console.error('Failed to clear credentials:', error)
        credentialsError = error.message
        return
      }
    }

    // Validate inputs - both required if one is provided
    if (!trimmedClientId || !trimmedClientSecret) {
      credentialsError = 'Both Client ID and Client Secret are required'
      return
    }

    // Basic format validation for Client ID
    if (!trimmedClientId.includes('.apps.googleusercontent.com')) {
      credentialsError =
        'Invalid Client ID format (should end with .apps.googleusercontent.com)'
      return
    }

    try {
      await saveCustomCredentials(trimmedClientId, trimmedClientSecret)
      credentialsSaved = true
    } catch (error) {
      console.error('Failed to save credentials:', error)
      credentialsError = error.message
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
      <div class="font-bold text-text-primary text-xs">
        {$t('cloudSync.title')}
      </div>
      <div class="text-xs mt-2 pb-3 text-text-secondary text-pretty">
        {$t('cloudSync.beta_description')}
      </div>
      <!-- Enable Cloud Sync Toggle -->
      <ToolEnableToggle
        id="cloudsync-enabled"
        bind:checked={cloudSyncEnabled}
        onCheckedChange={(value) => updateCloudSyncEnabled(value)}
        icon="heroicons:cloud"
        enabledText={$t('cloudSync.enabled')}
        disabledText={$t('cloudSync.disabled')}
      />
    </div>
  </div>

  {#if cloudSyncEnabled}
    {#if !cloudSyncStore.isLoggedIn}
      <!-- Not logged in state - BYOK Only Mode -->
      <div class="flex flex-col gap-4">
        <!-- OAuth Credentials Section -->

        <p class="text-xs text-muted">
          Enter your own OAuth credentials from your Google Cloud Console, your
          data never through third-party servers.
        </p>

        <!-- Client ID Input -->
        <TextInput
          id="byok-client-id"
          label="Client ID"
          placeholder="xxxxx.apps.googleusercontent.com"
          bind:value={customClientId}
          onSave={handleSaveCredentials}
        />

        <!-- Client Secret Input -->
        <ApiKeyInput
          label="Client Secret"
          placeholder="Your client secret"
          bind:apiKey={customClientSecret}
          onSave={handleSaveCredentials}
          linkHref="https://console.cloud.google.com/projectselector2/auth"
          linkText="Get credentials"
        />

        <!-- Error Message -->
        {#if credentialsError}
          <div class="flex items-center gap-2 text-red-500 text-xs">
            <Icon icon="heroicons:exclamation-circle" class="size-4" />
            <span>{credentialsError}</span>
          </div>
        {/if}

        <!-- Login Button -->
        <button
          onclick={handleLogin}
          disabled={isLoggingIn || !credentialsSaved}
          class="relative group mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={$t('cloudSync.signInWithGoogle')}
        >
          <div
            class="relative flex items-center font-bold justify-center gap-1 px-3 py-2.25 font-mono text-xs inset-0 overflow-hidden"
          >
            <div
              class="relative z-20 flex gap-2 text-text-primary justify-center items-center"
            >
              {#if isLoggingIn}
                <Icon icon="heroicons:arrow-path" class="size-4 animate-spin" />
                <span>{$t('cloudSync.signingIn')}</span>
              {:else}
                <Icon icon="logos:google-icon" class="size-4" />
                <span>{$t('cloudSync.signInWithGoogle')}</span>
              {/if}
            </div>
            <span
              class="absolute z-50 size-4 border border-transparent group-hover:border-blackwhite/15 rotate-45 bg-surface-1 -bottom-px -left-px -translate-x-1/2 translate-y-1/2 duration-150"
            ></span>
            <div
              class="absolute z-40 inset-0 text-text-secondary py-2 font-mono bg-blackwhite/5 dark:bg-blackwhite/5 border border-transparent hover:border-blackwhite/15 focus:border-blackwhite/30 dark:focus:border-blackwhite/10 focus:outline-none focus:ring-0 transition-colors duration-150"
            ></div>
          </div>
        </button>
        <div class="flex justify-center items-center gap-4">
          <a
            href="##"
            class="text-primary underline underline-offset-2 w-fit flex items-center mt-1 gap-1"
            >Setup Tutorial
            <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
          </a>

          <button
            onclick={() => (showRedirectUrisDialog = true)}
            class="text-text-secondary underline underline-offset-2 w-fit flex items-center mt-1 gap-1"
          >
            Redirect URIs list<Icon
              width={12}
              icon="heroicons:information-circle-20-solid"
            />
          </button>
        </div>
        {#if loginError}
          <div class="flex items-center gap-2 text-red-500 text-xs">
            <Icon icon="heroicons:exclamation-circle" class="size-4" />
            <span>{loginError}</span>
          </div>
        {/if}
      </div>
    {:else}
      <div class="flex flex-col gap-6">
        <!-- User Info Card Component -->
        <CloudSyncUserCard
          userPicture={cloudSyncStore.userPicture}
          userName={cloudSyncStore.userName}
          userEmail={cloudSyncStore.userEmail}
          lastSyncTime={cloudSyncStore.lastSyncTime}
          isSyncing={cloudSyncStore.isSyncing}
          debugLogs={cloudSyncStore.debugLogs}
          clientId={customClientId}
          clientSecret={customClientSecret}
          onSyncNow={handleSyncNow}
          onLogout={handleLogout}
        />

        <!-- Sync Mode -->
        <div>
          <h4 class="text-text-primary font-medium text-xs">
            {$t('cloudSync.syncMode')}
          </h4>
          <p class="mt-1 text-muted text-xs">
            {$t('cloudSync.syncModeDescription')}
          </p>
          <div class="grid mt-3 grid-cols-2 gap-2">
            <ButtonSet
              title={$t('cloudSync.manualSync')}
              class="setting-btn {!cloudSyncStore.autoSyncEnabled
                ? 'active'
                : ''}"
              onclick={() => setAutoSync(false)}
              Description={$t('cloudSync.manualDescription')}
            >
              <Icon icon="heroicons:hand-raised" width="16" height="16" />
            </ButtonSet>
            <ButtonSet
              title={$t('cloudSync.auto')}
              class="setting-btn {cloudSyncStore.autoSyncEnabled
                ? 'active'
                : ''}"
              onclick={() => setAutoSync(true)}
              Description={$t('cloudSync.autoDescription')}
            >
              <Icon icon="heroicons:bolt" width="16" height="16" />
            </ButtonSet>
          </div>
        </div>

        <!-- Sync Preferences -->
        <div class="">
          <div class="mb-3">
            <h4 class="text-xs font-medium text-text-primary">
              {$t('cloudSync.syncPreferences')}
            </h4>
            <p class="text-xs text-muted mt-1">
              {$t('cloudSync.syncPreferencesDescription')}
            </p>
          </div>

          <div class="grid mt-3 grid-cols-3 gap-2">
            <EnableToggle
              id="sync-settings"
              bind:checked={cloudSyncStore.syncPreferences.settings}
              onCheckedChange={(value) =>
                handleSyncPreferenceChange('settings', value)}
              text={$t('exportImport.settings')}
              useAnimation={false}
            />

            <EnableToggle
              id="sync-history"
              bind:checked={cloudSyncStore.syncPreferences.history}
              onCheckedChange={(value) =>
                handleSyncPreferenceChange('history', value)}
              text={$t('exportImport.history')}
              useAnimation={false}
            />

            <!-- Library (Archive + Tags) Toggle -->
            <EnableToggle
              id="sync-library"
              bind:checked={cloudSyncStore.syncPreferences.library}
              onCheckedChange={(value) =>
                handleSyncPreferenceChange('library', value)}
              text={$t('cloudSync.library')}
              useAnimation={false}
            />
          </div>
        </div>

        <!-- Error Display -->
        {#if cloudSyncStore.syncError}
          <div
            class="mt-2 p-2 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-md break-all"
          >
            <span class="font-bold">{$t('cloudSync.error')}:</span>
            {cloudSyncStore.syncError}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Settings Conflict Dialog Component -->
    <SettingsConflictDialog
      conflict={cloudSyncStore.pendingSettingsConflict}
      isResolving={isResolvingConflict}
      onResolve={handleConflictChoice}
    />
  {/if}
</div>

<!-- Redirect URIs Dialog -->
<Dialog.Root bind:open={showRedirectUrisDialog}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-[999] bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fadeOnly></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      class="outline-hidden flex flex-col font-mono fixed left-[50%] top-1/2 w-[calc(100vw-32px)] max-w-xl z-[1000] -translate-y-1/2 rounded-lg overflow-hidden shadow-lg translate-x-[-50%]"
    >
      {#snippet child({ props, open })}
        {#if open}
          <div
            {...props}
            transition:slideScaleFade={{
              duration: 300,
              slideFrom: 'bottom',
              slideDistance: '0rem',
              startScale: 0.95,
            }}
          >
            <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                class="block size-3.5 bg-error rounded-full"
                onclick={() => (showRedirectUrisDialog = false)}
              >
                <Icon
                  class="text-red-800 transition-opacity duration-150"
                  width={14}
                  icon="heroicons:x-mark-16-solid"
                />
              </button>
            </div>
            <div class="px-4 text-xs top-0 w-full bg-surface-2 py-2">
              <p class="!text-center text-text-primary select-none font-bold">
                Redirect URIs
              </p>
            </div>

            <div class="bg-surface-1 flex flex-col p-4 gap-4">
              <p class="text-text-primary text-xs">
                Add these URIs to your "Authorized redirect URIs" in Google
                Cloud OAuth consent screen.
              </p>

              {#each redirectUris as { browser, url }}
                <div class="flex flex-col gap-0">
                  <span class="text-xs text-muted font-medium">{browser}</span>
                  <div class="flex items-center">
                    <div
                      class="relative flex w-full h-8 transition-colors duration-150 overflow-hidden"
                    >
                      <input
                        type="text"
                        id="api-key-input"
                        value={url}
                        readonly
                        class="absolute top-0 left-0 w-[133.33%] h-[133.33%] pr-10 text-base text-text-secondary bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted truncate origin-top-left scale-75"
                      />
                      <button
                        onclick={() => copyToClipboard(url, browser)}
                        class="shrink-0 w-8 relative z-30 ml-auto hover:bg-muted/10 rounded transition-colors"
                        title="Copy"
                      >
                        {#if copiedUri === browser}
                          <span transition:fadeOnly>
                            <Icon
                              icon="heroicons:check"
                              class="size-4 text-text-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                            />
                          </span>
                        {:else}
                          <span transition:fadeOnly>
                            <Icon
                              icon="heroicons:square-2-stack"
                              class="size-4 text-text-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                            />
                          </span>
                        {/if}
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
