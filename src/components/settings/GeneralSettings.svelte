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

  // Import Firefox permission service
  import {
    checkSpecificPermission,
    requestSpecificPermission,
    removeSpecificPermission,
  } from '../../services/firefoxPermissionService.js'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }

  // Permission states - chỉ dùng khi build cho Firefox
  let youtubePermission = $state(false)
  let udemyPermission = $state(false)
  let redditPermission = $state(false)
  let courseraPermission = $state(false)
  let httpsPermission = $state(false)

  // Load permission states từ Firefox API khi component mount
  async function loadPermissionStates() {
    if (import.meta.env.BROWSER === 'firefox') {
      try {
        youtubePermission = await checkSpecificPermission('*://*.youtube.com/*')
        udemyPermission = await checkSpecificPermission('*://*.udemy.com/*')
        redditPermission = await checkSpecificPermission('*://*.reddit.com/*')
        courseraPermission = await checkSpecificPermission(
          '*://*.coursera.org/*'
        )
        httpsPermission = await checkSpecificPermission('https://*/*')
      } catch (error) {
        console.error('Error loading permission states:', error)
      }
    }
  }

  // Event handlers cho các checkbox
  async function handleYouTubePermission(event) {
    const checked = event.target.checked
    if (checked) {
      const granted = await requestSpecificPermission('*://*.youtube.com/*')
      youtubePermission = granted
      if (granted) {
        showPermissionGrantedMessage()
      }
    } else {
      const removed = await removeSpecificPermission('*://*.youtube.com/*')
      youtubePermission = !removed
    }
  }

  async function handleUdemyPermission(event) {
    const checked = event.target.checked
    if (checked) {
      const granted = await requestSpecificPermission('*://*.udemy.com/*')
      udemyPermission = granted
      if (granted) {
        showPermissionGrantedMessage()
      }
    } else {
      const removed = await removeSpecificPermission('*://*.udemy.com/*')
      udemyPermission = !removed
    }
  }

  async function handleRedditPermission(event) {
    const checked = event.target.checked
    if (checked) {
      const granted = await requestSpecificPermission('*://*.reddit.com/*')
      redditPermission = granted
      if (granted) {
        showPermissionGrantedMessage()
      }
    } else {
      const removed = await removeSpecificPermission('*://*.reddit.com/*')
      redditPermission = !removed
    }
  }

  async function handleCourseraPermission(event) {
    const checked = event.target.checked
    if (checked) {
      const granted = await requestSpecificPermission('*://*.coursera.org/*')
      courseraPermission = granted
      if (granted) {
        showPermissionGrantedMessage()
      }
    } else {
      const removed = await removeSpecificPermission('*://*.coursera.org/*')
      courseraPermission = !removed
    }
  }

  async function handleHttpsPermission(event) {
    const checked = event.target.checked
    if (checked) {
      const granted = await requestSpecificPermission('https://*/*')
      httpsPermission = granted
      if (granted) {
        showPermissionGrantedMessage()
      }
    } else {
      const removed = await removeSpecificPermission('https://*/*')
      httpsPermission = !removed
    }
  }

  // State để hiển thị thông báo
  let showMessage = $state(false)

  // Function để hiển thị thông báo
  function showPermissionGrantedMessage() {
    showMessage = true
    // Tự động ẩn sau 10 giây
    setTimeout(() => {
      showMessage = false
    }, 10000)
  }

  // Load permissions khi component mount
  $effect(() => {
    loadPermissionStates()
  })

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

  <!-- Optional Permissions Section - Chỉ hiển thị trên Firefox -->
  {#if import.meta.env.BROWSER === 'firefox'}
    <div class="flex flex-col gap-2 px-5 pb-4">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-text-secondary"> Optional Permissions </label>

      <!-- Checkbox đơn giản, check trực tiếp từ Firefox API -->
      <div class="flex flex-col gap-3">
        <label
          class="flex items-center gap-2 text-text-primary hover:text-text-secondary transition-colors"
        >
          <input
            type="checkbox"
            bind:checked={youtubePermission}
            onchange={handleYouTubePermission}
            class="w-4 h-4 text-primary bg-surface-2 border-border rounded focus:ring-primary focus:ring-2"
          />
          <span>YouTube Access</span>
        </label>

        <label
          class="flex items-center gap-2 text-text-primary hover:text-text-secondary transition-colors"
        >
          <input
            type="checkbox"
            bind:checked={udemyPermission}
            onchange={handleUdemyPermission}
            class="w-4 h-4 text-primary bg-surface-2 border-border rounded focus:ring-primary focus:ring-2"
          />
          <span>Udemy Access</span>
        </label>

        <label
          class="flex items-center gap-2 text-text-primary hover:text-text-secondary transition-colors"
        >
          <input
            type="checkbox"
            bind:checked={redditPermission}
            onchange={handleRedditPermission}
            class="w-4 h-4 text-primary bg-surface-2 border-border rounded focus:ring-primary focus:ring-2"
          />
          <span>Reddit Access</span>
        </label>

        <label
          class="flex items-center gap-2 text-text-primary hover:text-text-secondary transition-colors"
        >
          <input
            type="checkbox"
            bind:checked={courseraPermission}
            onchange={handleCourseraPermission}
            class="w-4 h-4 text-primary bg-surface-2 border-border rounded focus:ring-primary focus:ring-2"
          />
          <span>Coursera Access</span>
        </label>

        <label
          class="flex items-center gap-2 text-text-primary hover:text-text-secondary transition-colors"
        >
          <input
            type="checkbox"
            bind:checked={httpsPermission}
            onchange={handleHttpsPermission}
            class="w-4 h-4 text-primary bg-surface-2 border-border rounded focus:ring-primary focus:ring-2"
          />
          <span>General Website Access</span>
        </label>
      </div>
    </div>

    <!-- Thông báo reload trang -->
    {#if showMessage}
      <div class="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
        <div class="flex items-start gap-2">
          <Icon
            icon="heroicons:information-circle-20-solid"
            class="text-primary mt-0.5"
            width="16"
            height="16"
          />
          <div class="text-sm text-text-primary">
            <p class="font-medium mb-1">Permission granted successfully!</p>
            <p class="text-text-secondary">
              Please <strong>reload any open tabs</strong> where you want to use
              the extension. The extension will work properly after reloading the
              page.
            </p>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
