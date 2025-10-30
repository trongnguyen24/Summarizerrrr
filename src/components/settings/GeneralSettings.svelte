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

  // Load permission states từ Firefox API với caching
  async function loadPermissionStates() {
    if (import.meta.env.BROWSER === 'firefox') {
      try {
        const permissionKey = 'httpsPermission'

        // Check cache trước
        const cached = getCachedPermission(permissionKey)
        if (cached) {
          console.log(
            '[GeneralSettings] Using cached permission state:',
            cached.value
          )
          await updateFirefoxPermission(permissionKey, cached.value)
          return
        }

        // Nếu không có cache, check actual permission
        console.log('[GeneralSettings] Checking actual Firefox permission...')
        const hasPermission = await checkSpecificPermission('https://*/*')
        console.log(
          '[GeneralSettings] Firefox permission result:',
          hasPermission
        )

        // Update store với kết quả
        await updateFirefoxPermission(permissionKey, hasPermission)
      } catch (error) {
        console.error(
          '[GeneralSettings] Error loading permission states:',
          error
        )
      }
    }
  }

  // Event handlers cho checkbox - persist state qua settings store
  async function handleHttpsPermission(checked) {
    const permissionKey = 'httpsPermission'

    try {
      if (checked) {
        console.log('[GeneralSettings] Requesting Firefox permission...')
        const granted = await requestSpecificPermission('https://*/*')
        console.log('[GeneralSettings] Permission granted:', granted)

        // Update store thay vì local state
        await updateFirefoxPermission(permissionKey, granted)

        // Broadcast permission change via runtime message
        try {
          await browser.runtime.sendMessage({
            type: 'PERMISSION_CHANGED',
            permissionKey,
            value: granted,
            source: 'GeneralSettings',
            timestamp: Date.now(),
          })
          console.log(
            '[GeneralSettings] Permission change broadcasted successfully'
          )
        } catch (error) {
          console.warn(
            '[GeneralSettings] Failed to broadcast permission change:',
            error
          )
          // Store updates will still work as fallback
        }
      } else {
        console.log('[GeneralSettings] Removing Firefox permission...')
        const removed = await removeSpecificPermission('https://*/*')
        console.log('[GeneralSettings] Permission removed:', removed)

        // Update store - nếu removed thành công thì permission = false
        const newPermissionState = !removed
        await updateFirefoxPermission(permissionKey, newPermissionState)

        // Broadcast permission change via runtime message
        try {
          await browser.runtime.sendMessage({
            type: 'PERMISSION_CHANGED',
            permissionKey,
            value: newPermissionState,
            source: 'GeneralSettings',
            timestamp: Date.now(),
          })
          console.log(
            '[GeneralSettings] Permission removal broadcasted successfully'
          )
        } catch (error) {
          console.warn(
            '[GeneralSettings] Failed to broadcast permission change:',
            error
          )
          // Store updates will still work as fallback
        }
      }
    } catch (error) {
      console.error(
        '[GeneralSettings] Error handling permission change:',
        error
      )
      // Reset về trạng thái trước đó nếu có lỗi
      await updateFirefoxPermission(permissionKey, !checked)
    }
  }

  // triggerSidepanelUpdate function removed - now using browser.runtime.sendMessage instead

  // Load permissions khi component mount
  if (import.meta.env.BROWSER === 'firefox') {
    $effect(() => {
      loadPermissionStates()
    })
  }

  // effect on load update settings.hasCompletedOnboarding = false
  // $effect(() => {
  //   // This effect runs once when the component is mounted
  //   // and sets hasCompletedOnboarding to false for development purposes.
  //   // In a production environment, this might be removed or conditionally applied.
  //   updateSettings({ hasCompletedOnboarding: false })
  // })
</script>

<!-- General Section -->
<!-- Optional Permissions Section - Chỉ hiển thị trên Firefox -->
{#if import.meta.env.BROWSER === 'firefox'}
  <div class="flex flex-col gap-2 px-5 mt-6">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block font-bold text-primary">
      {$t('permissionWarning.title')}</label
    >
    <p class="text-xs text-text-secondary">
      {$t('permissionWarning.description')}
    </p>

    <!-- Chỉ còn 1 checkbox: General Website Access -->
    <!-- YouTube, Udemy, Coursera, Reddit đã có host_permissions nên không cần settings -->

    <SwitchPermission
      id="https-permission-switch"
      name=" {$t('permissionWarning.button')}"
      bind:checked={httpsPermission}
      onCheckedChange={handleHttpsPermission}
    />
  </div>
{/if}

<!-- Sidepanel Support Setting - Only show on Chrome -->
{#if import.meta.env.BROWSER === 'chrome' && !browserCompatibility.isMobile}
  <div class="flex flex-col gap-2 px-5 mt-6">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-primary font-bold"
      >{$t('settings.general.icon_click_action.title')}</label
    >

    <p class="text-xs text-text-secondary">
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

<div class="setting-block flex pb-6 pt-6 flex-col">
  <ExportImport />
  <div class="flex flex-col gap-2 p-5">
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

  <div class="flex flex-col gap-2 px-5 pb-4">
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

  <div class="flex flex-col gap-2 px-5 pb-4">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-primary font-bold"
      >{$t('settings.general.lang_ui')}</label
    >
    <div class="flex w-full gap-1">
      <UILanguageSelect />
    </div>
  </div>

  {#if !browserCompatibility.isMobile}
    {#if !browserCompatibility.isMobile}
      <div class="flex flex-col gap-2 mt-2 px-5 pb-4">
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
