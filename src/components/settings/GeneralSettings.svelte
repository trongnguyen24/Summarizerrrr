<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonFont from '../buttons/ButtonFont.svelte'
  import ButtonIcon from '../buttons/ButtonIcon.svelte'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import { getTheme, setTheme } from '../../stores/themeStore.svelte'

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
        title="Mix Sans Serif &  Serif"
        class="setting-btn {settings.selectedFont === 'noto-mix'
          ? 'active'
          : ''}"
        onclick={() => handleUpdateSetting('selectedFont', 'noto-mix')}
        Description="Noto Serif for headings, Noto Sans for body."
        font="mix"
      ></ButtonFont>
    </div>
  </div>
  <div class="flex flex-col gap-2 px-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-secondary">Theme</label>
    <div class="flexw-full gap-1">
      <ButtonIcon
        title="Light"
        class="setting-btn {getTheme() === 'light' ? 'active' : ''}"
        onclick={() => setTheme('light')}
        Description="Light theme."
      >
        <Icon icon="heroicons:sun-16-solid" width="20" height="20" />
      </ButtonIcon>
      <ButtonIcon
        title="Dark"
        class="setting-btn {getTheme() === 'dark' ? 'active' : ''}"
        onclick={() => setTheme('dark')}
        Description="Dark theme."
      >
        <Icon icon="heroicons:moon-20-solid" width="20" height="20" />
      </ButtonIcon>
      <ButtonIcon
        title="System"
        class="setting-btn {getTheme() === 'system' ? 'active' : ''}"
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
</div>
