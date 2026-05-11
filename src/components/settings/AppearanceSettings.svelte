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
  } from '../../stores/themeStore.svelte'
  import UILanguageSelect from '../inputs/UILanguageSelect.svelte'
  import { t } from 'svelte-i18n'
  import { getBrowserCompatibility } from '../../lib/utils/browserDetection.js'
  import { browser } from 'wxt/browser'
  import PerTabCacheToolSettings from './tools/PerTabCacheToolSettings.svelte'

  const browserCompatibility = getBrowserCompatibility()

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
</script>

<div class=" flex flex-col gap-8 py-6">
  <!-- Sidepanel Support Setting - Only show on Chrome -->
  {#if import.meta.env.BROWSER === 'chrome' && !browserCompatibility.isMobile}
    <div class="flex flex-col gap-2 px-5">
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
    <label class="block text-text-primary font-bold"
      >{$t('settings.general.fontFamily')}</label
    >
    <div class="flex flex-col w-full gap-1">
      <ButtonFont
        title={$t('settings.general.font.sans')}
        class="setting-btn {settings.selectedFont === 'default'
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
    <label class="block text-text-primary font-bold"
      >{$t('settings.general.lang_ui')}</label
    >
    <div class="flex w-full gap-1">
      <UILanguageSelect />
    </div>
  </div>

  <div class="flex flex-col gap-2 px-5">
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

  <div class="flex flex-col gap-2 px-5">
    <label class="block text-text-primary font-bold"
      >{$t('settings.general.reduce_motion.title')}</label
    >
    <p class="text-xs text-muted">
      {$t('settings.general.reduce_motion.description')}
    </p>
    <div class="flex w-full gap-1">
      <ButtonSet
        title={$t('settings.general.reduce_motion.disabled')}
        class={`setting-btn ${!settings.reduceMotion ? 'active' : ''}`}
        onclick={() => handleUpdateSetting('reduceMotion', false)}
        Description={$t('settings.general.reduce_motion.disabled_desc')}
      />
      <ButtonSet
        title={$t('settings.general.reduce_motion.enabled')}
        class={`setting-btn ${settings.reduceMotion ? 'active' : ''}`}
        onclick={() => handleUpdateSetting('reduceMotion', true)}
        Description={$t('settings.general.reduce_motion.enabled_desc')}
      />
    </div>
  </div>

  {#if !browserCompatibility.isMobile}
    <div class="flex flex-col gap-2 px-5">
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

  <div class="border-t border-border/50 pt-4">
    <PerTabCacheToolSettings />
  </div>
</div>
