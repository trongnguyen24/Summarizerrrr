<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonFont from '../buttons/ButtonFont.svelte'
  import ButtonIcon from '../buttons/ButtonIcon.svelte'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import {
    themeSettings,
    setTheme,
    // updateThemeSettings as updateThemeStoreSettings, // Không còn cần thiết, dùng setTheme thay thế
  } from '../../stores/themeStore.svelte' // Import themeSettings và updateThemeSettings

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
</script>

<!-- General Section -->
<div class="setting-block flex pb-6 pt-5 flex-col">
  <div class="flex items-center h-6 justify-between px-5">
    <label for="advanced-mode-toggle" class="block font-bold text-text-primary"
      >General Settings</label
    >
  </div>
  <div class="flex flex-col gap-2 p-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-secondary">Font Family</label>
    <div class="flex flex-col w-full gap-1">
      <ButtonFont
        title="Sans Serif"
        class="setting-btn  {settings.selectedFont === 'default'
          ? 'active'
          : ''}"
        onclick={() => handleUpdateSetting('selectedFont', 'default')}
        Description="Default font."
        font="sans"
      ></ButtonFont>
      <ButtonFont
        title="Serif"
        class="setting-btn {settings.selectedFont === 'noto-serif'
          ? 'active'
          : ''}"
        onclick={() => handleUpdateSetting('selectedFont', 'noto-serif')}
        Description="Noto Serif font."
        font="serif"
      ></ButtonFont>
      <ButtonFont
        title="OpenDyslexic"
        class="setting-btn {settings.selectedFont === 'opendyslexic'
          ? 'active'
          : ''}"
        onclick={() => handleUpdateSetting('selectedFont', 'opendyslexic')}
        Description="OpenDyslexic font for dyslexia."
        font="dyslexic"
      ></ButtonFont>
      <ButtonFont
        title="Mali"
        class="setting-btn {settings.selectedFont === 'mali' ? 'active' : ''}"
        onclick={() => handleUpdateSetting('selectedFont', 'mali')}
        Description="Mali font for all text."
        font="mali"
      ></ButtonFont>
    </div>
  </div>
  <div class="flex flex-col gap-2 p-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-secondary">Response Mode</label>
    <div class="grid grid-cols-2 w-full gap-1">
      <ButtonIcon
        title="⚡ Streaming"
        class="setting-btn {settings.enableStreaming ? 'active' : ''}"
        onclick={() => handleUpdateSetting('enableStreaming', true)}
        Description="Real-time response display, better experience."
      >
        <Icon icon="heroicons:bolt-20-solid" width="20" height="20" />
      </ButtonIcon>
      <ButtonIcon
        title="📱 Non-streaming"
        class="setting-btn {!settings.enableStreaming ? 'active' : ''}"
        onclick={() => handleUpdateSetting('enableStreaming', false)}
        Description="Suitable for low-end devices, reduce lag."
      >
        <Icon
          icon="heroicons:device-phone-mobile-20-solid"
          width="20"
          height="20"
        />
      </ButtonIcon>
    </div>
  </div>
  <div class="flex flex-col gap-2 px-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-secondary">Theme</label>
    <div class="flexw-full gap-1">
      <ButtonIcon
        title="Light"
        class="setting-btn {themeSettings.theme === 'light' ? 'active' : ''}"
        onclick={() => setTheme('light')}
        Description="Light theme."
      >
        <Icon icon="heroicons:sun-16-solid" width="20" height="20" />
      </ButtonIcon>
      <ButtonIcon
        title="Dark"
        class="setting-btn {themeSettings.theme === 'dark' ? 'active' : ''}"
        onclick={() => setTheme('dark')}
        Description="Dark theme."
      >
        <Icon icon="heroicons:moon-20-solid" width="20" height="20" />
      </ButtonIcon>
      <ButtonIcon
        title="System"
        class="setting-btn {themeSettings.theme === 'system' ? 'active' : ''}"
        onclick={() => setTheme('system')}
        Description="System theme."
      >
        <Icon
          icon="heroicons:computer-desktop-20-solid"
          width="20"
          height="20"
        />
      </ButtonIcon>
    </div>
  </div>
  <div class="flex flex-col gap-2 p-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <div class="flex items-center gap-1 justify-between">
      Shortcuts
      {#if import.meta.env.BROWSER === 'chrome'}
        <button
          on:click|preventDefault={() =>
            chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
          class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
        >
          Shortcut Settings
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
</div>
