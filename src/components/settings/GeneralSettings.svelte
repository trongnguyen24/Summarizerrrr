<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonFont from '../buttons/ButtonFont.svelte'
  import ButtonIcon from '../buttons/ButtonIcon.svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import SwitchPermission from '../inputs/SwitchPermission.svelte'
  import {
    settings,
    updateSettings,
    updateFirefoxPermission,
    getFirefoxPermission,
    getCachedPermission,
  } from '../../stores/settingsStore.svelte.js'
  import {
    themeSettings,
    setTheme,
    // updateThemeSettings as updateThemeStoreSettings, // Không còn cần thiết, dùng setTheme thay thế
  } from '../../stores/themeStore.svelte' // Import themeSettings và updateThemeSettings
  import UILanguageSelect from '../inputs/UILanguageSelect.svelte'
  import { t } from 'svelte-i18n'

  // Import Firefox permission service
  import {
    checkSpecificPermission,
    requestSpecificPermission,
    removeSpecificPermission,
  } from '../../services/firefoxPermissionService.js'
  import { getBrowserCompatibility } from '../../lib/utils/browserDetection.js'
  import { browser } from 'wxt/browser'
  import ExportImport from './ExportImport.svelte'

  const browserCompatibility = getBrowserCompatibility()

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }

  // Permission states - sử dụng settings store thay vì local state
  // Đảm bảo permission state được persist khi chuyển tab
  let httpsPermission = $state(getFirefoxPermission('httpsPermission'))
  let hasInitialized = $state(false)

  // Reactive update khi settings store thay đổi - but only after initialization
  $effect(() => {
    if (hasInitialized) {
      const storePermission = getFirefoxPermission('httpsPermission')
      if (storePermission !== httpsPermission) {
        httpsPermission = storePermission
      }
    }
  })

  // State for permission list
  let grantedOrigins = $state([])
  let newPermissionDomain = $state('')

  // Load permission states từ Firefox API
  async function loadPermissionStates() {
    if (import.meta.env.BROWSER === 'firefox') {
      try {
        // Check global permission
        const globalPermission = await checkSpecificPermission('*://*/*')
        await updateFirefoxPermission('httpsPermission', globalPermission)

        // Get all granted permissions
        const permissions = await browser.permissions.getAll()
        if (permissions.origins) {
          // Filter out global permission and internal/API domains if needed
          grantedOrigins = permissions.origins.filter(
            (origin) =>
              origin !== '*://*/*' &&
              origin !== '<all_urls>' &&
              !origin.startsWith('moz-extension://'),
          )
        }
      } catch (error) {
        console.error(
          '[GeneralSettings] Error loading permission states:',
          error,
        )
      }
    }
  }

  // Add new permission
  async function addPermission() {
    if (!newPermissionDomain) return

    let domain = newPermissionDomain.trim()
    // Basic cleanup/formatting
    if (!domain.includes('://')) {
      domain = `*://*.${domain}/*`
    }

    try {
      console.log(`[GeneralSettings] Requesting permission for ${domain}...`)
      const granted = await requestSpecificPermission(domain)

      if (granted) {
        console.log(`[GeneralSettings] Permission granted for ${domain}`)
        newPermissionDomain = ''
        await loadPermissionStates() // Reload list

        // Broadcast change
        await browser.runtime.sendMessage({
          type: 'PERMISSION_CHANGED',
          pattern: domain,
          value: true,
          source: 'GeneralSettings',
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error(
        `[GeneralSettings] Error adding permission for ${domain}:`,
        error,
      )
    }
  }

  // Remove permission
  async function removePermission(origin) {
    try {
      console.log(`[GeneralSettings] Removing permission for ${origin}...`)
      const removed = await removeSpecificPermission(origin)

      if (removed) {
        console.log(`[GeneralSettings] Permission removed for ${origin}`)
        await loadPermissionStates() // Reload list

        // Broadcast change
        await browser.runtime.sendMessage({
          type: 'PERMISSION_CHANGED',
          pattern: origin,
          value: false,
          source: 'GeneralSettings',
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error(
        `[GeneralSettings] Error removing permission for ${origin}:`,
        error,
      )
    }
  }

  // Legacy handler for "All Sites"
  async function handleHttpsPermission(checked) {
    await handlePermissionChange('*://*/*', checked, async (val) => {
      await updateFirefoxPermission('httpsPermission', val)
    })
  }

  // Generic handler for permission changes (used by legacy handler)
  async function handlePermissionChange(pattern, checked, stateUpdater) {
    try {
      if (checked) {
        const granted = await requestSpecificPermission(pattern)
        stateUpdater(granted)
        await browser.runtime.sendMessage({
          type: 'PERMISSION_CHANGED',
          pattern,
          value: granted,
          source: 'GeneralSettings',
          timestamp: Date.now(),
        })
      } else {
        const removed = await removeSpecificPermission(pattern)
        stateUpdater(!removed)
        await browser.runtime.sendMessage({
          type: 'PERMISSION_CHANGED',
          pattern,
          value: !removed,
          source: 'GeneralSettings',
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      stateUpdater(!checked)
    }
  }

  // Load permissions khi component mount
  if (import.meta.env.BROWSER === 'firefox') {
    $effect(() => {
      loadPermissionStates()
    })
  }
</script>

<!-- General Section -->
<!-- Optional Permissions Section - Chỉ hiển thị trên Firefox -->
<div class=" flex flex-col gap-8 py-6">
  {#if import.meta.env.BROWSER === 'firefox'}
    <div class="flex flex-col gap-2 px-5">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block font-bold text-primary">
        {$t('permissionWarning.title')}</label
      >
      <p class="text-xs text-text-secondary">
        {$t('permissionWarning.description')}
      </p>

      <!-- Specific Sites Permissions (Dynamic List) -->
      <div class="flex flex-col gap-2 mt-4">
        <p class="text-xs text-text-secondary">
          <strong>{$t('settings.general.specific_sites')}</strong>
        </p>

        <!-- Input Area -->
        <div class="flex relative gap-1">
          <input
            type="text"
            placeholder="example.com"
            bind:value={newPermissionDomain}
            onkeydown={(e) => e.key === 'Enter' && addPermission()}
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
            inputmode="url"
            class="w-full pl-3 text-text-primary text-xs pr-9 h-8.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
          />
          <button
            onclick={addPermission}
            class=" absolute top-0 right-0 w-8.5 h-8.5 flex justify-center items-center hover:text-text-primary transition-colors duration-150"
          >
            <Icon
              icon="heroicons:plus-circle-16-solid"
              width="16"
              height="16"
            />
          </button>
        </div>

        <!-- Domain List -->
        <div
          class="xs:grid flex flex-col relative overflow-hidden min-h-32 bg-background grid-cols-2 p-2 gap-2"
        >
          <span
            class="absolute z-40 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <div
            class="absolute pointer-events-none bg-dot z-20 border border-border inset-0"
          ></div>

          {#each grantedOrigins as origin}
            <div
              class="flex gap-2 z-30 h-8 overflow-hidden relative justify-between items-center bg-surface-2 text-text-secondary pl-3 text-xs"
            >
              <span
                class="absolute z-20 size-3 rotate-45 border border-border bg-background bottom-px left-px -translate-x-1/2 translate-y-1/2"
              ></span>
              <div
                class="absolute pointer-events-none z-10 border border-border inset-0"
              ></div>
              <p class="flex-auto line-clamp-1">{origin}</p>
              <button
                onclick={() => removePermission(origin)}
                class="p-2 border-l border-blackwhite/5 transition-colors duration-150 bg-transparent hover:bg-blackwhite/5"
              >
                <Icon icon="heroicons:minus-16-solid" width="16" height="16" />
              </button>
            </div>
          {/each}

          {#if grantedOrigins.length === 0}
            <div
              class="flex items-center text-center col-span-2 justify-center font-medium text-text-secondary text-xs opacity-50"
            >
              No specific permissions granted
            </div>
          {/if}
        </div>
      </div>

      <!-- Optional Permission: Other Websites -->
      <div class="flex flex-col gap-2 mt-4">
        <p class="text-xs text-text-secondary">
          <strong>{$t('settings.general.optional_permissions')}</strong>
        </p>
        <SwitchPermission
          id="https-permission-switch"
          name={$t('permissionWarning.button')}
          bind:checked={httpsPermission}
          onCheckedChange={handleHttpsPermission}
        />

        <p class="text-xs text-text-tertiary italic">
          {$t('settings.general.optional_permissions_note')}
        </p>
      </div>
    </div>
  {/if}

  <!-- Sidepanel Support Setting - Only show on Chrome -->
  {#if import.meta.env.BROWSER === 'chrome' && !browserCompatibility.isMobile}
    <div class="flex flex-col gap-2 px-5">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-text-primary font-bold"
        >{$t('settings.general.icon_click_action.title')}</label
      >

      <p class="text-xs text-muted">
        {$t('settings.general.icon_click_action.description')}
      </p>
      <div class="flex w-full mt-1 gap-1">
        <ButtonSet
          title="Sidepanel"
          class={`setting-btn ${
            settings.iconClickAction === 'sidepanel' ? 'active' : ''
          }`}
          onclick={() => handleUpdateSetting('iconClickAction', 'sidepanel')}
          Description={$t('settings.general.icon_click_action.open_sidepanel')}
        />
        <ButtonSet
          title="Settings"
          class={`setting-btn ${
            settings.iconClickAction === 'popup' ? 'active' : ''
          }`}
          onclick={() => handleUpdateSetting('iconClickAction', 'popup')}
          Description={$t('settings.general.icon_click_action.open_popup')}
        />
        <ButtonSet
          title="FAB"
          class={`setting-btn ${
            settings.iconClickAction === 'floating' ? 'active' : ''
          }`}
          onclick={() => handleUpdateSetting('iconClickAction', 'floating')}
          Description={$t('settings.general.icon_click_action.open_floating')}
        />
      </div>
    </div>
  {/if}

  <div class="flex flex-col gap-2 px-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-primary font-bold"
      >{$t('settings.general.fontFamily')}</label
    >
    <div class="flex flex-col w-full gap-1">
      <ButtonFont
        title={$t('settings.general.font.sans')}
        class="setting-btn  {settings.selectedFont === 'default'
          ? 'active'
          : ''}"
        onclick={() => handleUpdateSetting('selectedFont', 'default')}
        Description={$t('settings.general.font.sans_desc')}
        font="sans"
      ></ButtonFont>
      <ButtonFont
        title={$t('settings.general.font.serif')}
        class="setting-btn {settings.selectedFont === 'noto-serif'
          ? 'active'
          : ''}"
        onclick={() => handleUpdateSetting('selectedFont', 'noto-serif')}
        Description={$t('settings.general.font.serif_desc')}
        font="serif"
      ></ButtonFont>
      <ButtonFont
        title={$t('settings.general.font.dyslexic')}
        class="setting-btn {settings.selectedFont === 'opendyslexic'
          ? 'active'
          : ''}"
        onclick={() => handleUpdateSetting('selectedFont', 'opendyslexic')}
        Description={$t('settings.general.font.dyslexic_desc')}
        font="dyslexic"
      ></ButtonFont>
      <ButtonFont
        title={$t('settings.general.font.mali')}
        class="setting-btn {settings.selectedFont === 'mali' ? 'active' : ''}"
        onclick={() => handleUpdateSetting('selectedFont', 'mali')}
        Description={$t('settings.general.font.mali_desc')}
        font="mali"
      ></ButtonFont>
    </div>
  </div>

  <div class="flex flex-col gap-2 px-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-primary font-bold"
      >{$t('settings.general.lang_ui')}</label
    >
    <div class="flex w-full gap-1">
      <UILanguageSelect />
    </div>
  </div>

  <div class="flex flex-col gap-2 px-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-primary font-bold"
      >{$t('settings.general.theme')}</label
    >
    <div class="flex w-full gap-1">
      <ButtonIcon
        title={$t('settings.general.theme_mode.light')}
        class="setting-btn {themeSettings.theme === 'light' ? 'active' : ''}"
        onclick={() => setTheme('light')}
        Description={$t('settings.general.theme_mode.light_desc')}
      >
        <Icon icon="heroicons:sun-16-solid" width="20" height="20" />
      </ButtonIcon>
      <ButtonIcon
        title={$t('settings.general.theme_mode.dark')}
        class="setting-btn {themeSettings.theme === 'dark' ? 'active' : ''}"
        onclick={() => setTheme('dark')}
        Description={$t('settings.general.theme_mode.dark_desc')}
      >
        <Icon icon="heroicons:moon-20-solid" width="20" height="20" />
      </ButtonIcon>
      <ButtonIcon
        title={$t('settings.general.theme_mode.system')}
        class="setting-btn {themeSettings.theme === 'system' ? 'active' : ''}"
        onclick={() => setTheme('system')}
        Description={$t('settings.general.theme_mode.system_desc')}
      >
        <Icon
          icon="heroicons:computer-desktop-20-solid"
          width="20"
          height="20"
        />
      </ButtonIcon>
    </div>
  </div>

  <ExportImport />
  {#if !browserCompatibility.isMobile}
    {#if !browserCompatibility.isMobile}
      <div class="flex flex-col gap-2 px-5">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <div class="flex items-center text-text-primary gap-1 justify-between">
          <span class=" font-bold">{$t('settings.general.shortcuts')}</span>
          {#if import.meta.env.BROWSER === 'chrome'}
            <button
              onclick={() =>
                chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
              class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
            >
              {$t('settings.general.shortcuts_settings')}
              <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
            </button>
          {/if}
        </div>

        <div class="flex flex-col pl-3 gap-3">
          {#snippet keyboard(a)}
            <span
              class=" p-1 px-2 mr-auto text-[0.65rem] ml-1 bg-blackwhite/5 rounded-sm"
              >{a}</span
            >
          {/snippet}
          {#if import.meta.env.BROWSER === 'firefox'}
            <div class="flex justify-between gap-1">
              Open Sidepanel

              <div>
                {@render keyboard('Alt')}{@render keyboard('A')}
              </div>
            </div>

            <div class="flex justify-between gap-1">
              Start Summarize

              <div>
                {@render keyboard('Alt')}{@render keyboard('Z')}
              </div>
            </div>
            <div class="flex justify-between gap-1">
              Prompt Editer

              <div>
                {@render keyboard('Alt')}{@render keyboard('P')}
              </div>
            </div>
            <div class="flex justify-between gap-1">
              History

              <div>
                {@render keyboard('Alt')}{@render keyboard('X')}
              </div>
            </div>
          {:else}
            <div class="flex justify-between gap-1">
              Open Sidepanel

              <div>
                {@render keyboard('Alt')}{@render keyboard('A')}
              </div>
            </div>

            <div class="flex justify-between gap-1">
              Start Summarize

              <div>
                {@render keyboard('Alt')}{@render keyboard('S')}
              </div>
            </div>
            <div class="flex justify-between gap-1">
              Prompt Editer

              <div>
                {@render keyboard('Alt')}{@render keyboard('P')}
              </div>
            </div>
            <div class="flex justify-between gap-1">
              History

              <div>
                {@render keyboard('Alt')}{@render keyboard('X')}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
