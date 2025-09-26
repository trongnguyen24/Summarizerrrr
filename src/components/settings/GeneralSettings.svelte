<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonFont from '../buttons/ButtonFont.svelte'
  import ButtonIcon from '../buttons/ButtonIcon.svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import {
    themeSettings,
    setTheme,
    // updateThemeSettings as updateThemeStoreSettings, // Không còn cần thiết, dùng setTheme thay thế
  } from '../../stores/themeStore.svelte' // Import themeSettings và updateThemeSettings
  import UILanguageSelect from '../inputs/UILanguageSelect.svelte'
  import { t } from 'svelte-i18n'
  import { onMount } from 'svelte'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }

  const all_origins = [
    'https://*/*',
    '*://*.youtube.com/*',
    '*://*.udemy.com/*',
    '*://*.coursera.org/*',
  ]

  let permissionsStatus = {}

  async function checkAllPermissions() {
    const newStatus = {}
    for (const origin of all_origins) {
      newStatus[origin] = await browser.permissions.contains({
        origins: [origin],
      })
    }
    permissionsStatus = newStatus
  }

  async function togglePermission(origin, checked) {
    const permission = { origins: [origin] }
    let success = false
    if (checked) {
      success = await browser.permissions.request(permission)
    } else {
      success = await browser.permissions.remove(permission)
    }

    // After request/remove, re-check the actual status
    if (success) {
      permissionsStatus[origin] = await browser.permissions.contains(permission)
      permissionsStatus = { ...permissionsStatus } // Trigger reactivity
    } else {
      // If the user denied the request, the checkbox should reflect the actual state
      permissionsStatus[origin] = false
      permissionsStatus = { ...permissionsStatus }
    }
  }

  onMount(checkAllPermissions)
  // effect on load update settings.hasCompletedOnboarding = false
  // $effect(() => {
  //   // This effect runs once when the component is mounted
  //   // and sets hasCompletedOnboarding to false for development purposes.
  //   // In a production environment, this might be removed or conditionally applied.
  //   updateSettings({ hasCompletedOnboarding: false })
  // })
</script>

<!-- General Section -->
<div class="setting-block flex pb-6 pt-5 flex-col">
  <div class="flex items-center h-6 justify-between px-5">
    <label for="advanced-mode-toggle" class="block font-bold text-text-primary"
      >{$t('settings.general.title')}</label
    >
  </div>
  <div class="flex flex-col gap-2 p-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-secondary"
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
    <label class="block text-text-secondary"
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
    <label class="block text-text-secondary"
      >{$t('settings.general.lang_ui')}</label
    >
    <div class="flex w-full gap-1">
      <UILanguageSelect />
    </div>
  </div>

  <div class="flex flex-col gap-2 px-5 pb-4">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <div class="flex items-center gap-1 justify-between">
      {$t('settings.general.shortcuts')}
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
  {#if import.meta.env.BROWSER === 'firefox'}
    <div class="flex flex-col gap-2 px-5 pb-4">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-text-secondary">Optional permissions</label>

      <div class="space-y-2">
        {#each all_origins as origin (origin)}
          <label
            class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100"
          >
            <span class="font-mono text-sm">{origin}</span>
            <input
              type="checkbox"
              class="h-6 w-6 rounded"
              bind:checked={permissionsStatus[origin]}
              onchange={(e) =>
                togglePermission(origin, e.currentTarget.checked)}
            />
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>
