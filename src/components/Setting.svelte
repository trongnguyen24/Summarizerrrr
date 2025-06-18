<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import ButtonSet from './ButtonSet.svelte'
  import ButtonIcon from './ButtonIcon.svelte'
  import ButtonFont from './ButtonFont.svelte'
  import GroupVisual from './GroupVisual.svelte'
  import LanguageSelect from './LanguageSelect.svelte' // Import LanguageSelect
  import ProvidersSelect from './ProvidersSelect.svelte' // Import ProvidersSelect
  import GeminiBasicConfig from './providerConfigs/GeminiBasicConfig.svelte' // Import GeminiBasicConfig
  import GeminiAdvancedConfig from './providerConfigs/GeminiAdvancedConfig.svelte' // Import GeminiAdvancedConfig
  import OpenrouterConfig from './providerConfigs/OpenrouterConfig.svelte' // Import OpenrouterConfig
  import OllamaConfig from './providerConfigs/OllamaConfig.svelte' // Import OllamaConfig
  import 'overlayscrollbars/overlayscrollbars.css'
  import { Label, Switch } from 'bits-ui'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { providersConfig } from '../lib/providersConfig.js'
  import Dyslexic from './icon/Dyslexic.svelte'
  import Mix from './icon/Mix.svelte'
  import SanSerif from './icon/San-serif.svelte'
  import Serif from './icon/Serif.svelte'
  import {
    settings,
    loadSettings,
    updateSettings,
  } from '../stores/settingsStore.svelte.js'
  import {
    advancedModeSettings,
    loadAdvancedModeSettings,
    updateAdvancedModeSettings,
    subscribeToAdvancedModeSettingsChanges,
  } from '../stores/advancedModeSettingsStore.svelte.js'
  import {
    basicModeSettings,
    loadBasicModeSettings,
    updateBasicModeSettings,
    subscribeToBasicModeSettingsChanges,
  } from '../stores/basicModeSettingsStore.svelte.js'
  import { getTheme, setTheme } from '../stores/themeStore.svelte'

  // Bind directly to settings store properties
  // let summaryLength = $state('long') // Removed, bind directly
  // let summaryFormat = $state('heading') // Removed, bind directly
  let activeTab = $state('ai-model') // State variable for current tab
  let activeBarTransformClass = $state('-translate-x-18') // New variable to control transform
  const options = {
    scrollbars: {
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Use $effect to initialize OverlayScrollbars
  $effect(() => {
    const tocElement = document.getElementById('setting-scroll')
    if (tocElement) {
      initialize(tocElement)
    }
  })

  // Use $effect to load settings from stores when the component mounts
  $effect(async () => {
    await loadSettings()
    await loadAdvancedModeSettings()
    await loadBasicModeSettings()
    // No need to manually assign to local state if binding directly
  })

  // Use $effect to save settings when they change
  $effect(() => {
    // Save summaryLength and summaryFormat when they change
    updateSettings({
      summaryLength: settings.summaryLength,
      summaryFormat: settings.summaryFormat,
      summaryLang: settings.summaryLang,
      selectedModel: settings.selectedModel,
      isAdvancedMode: settings.isAdvancedMode,
      selectedFont: settings.selectedFont,
      selectedProvider: settings.selectedProvider,
      geminiApiKey: settings.geminiApiKey,
      selectedGeminiModel: settings.selectedGeminiModel,
      geminiAdvancedApiKey: settings.geminiAdvancedApiKey,
      selectedGeminiAdvancedModel: settings.selectedGeminiAdvancedModel,
      openrouterApiKey: settings.openrouterApiKey,
      selectedOpenrouterModel: settings.selectedOpenrouterModel,
      deepseekApiKey: settings.deepseekApiKey,
      chatgptApiKey: settings.chatgptApiKey,
      ollamaEndpoint: settings.ollamaEndpoint,
      selectedOllamaModel: settings.selectedOllamaModel,
    })
  })

  // Use $effect to save temperature and topP when they change
  $effect(() => {
    if (settings.isAdvancedMode) {
      updateAdvancedModeSettings({
        temperature: advancedModeSettings.temperature,
        topP: advancedModeSettings.topP,
      })
    } else {
      updateBasicModeSettings({
        temperature: basicModeSettings.temperature,
        topP: basicModeSettings.topP,
      })
    }
  })

  // Effect to update transform class for activebar
  $effect(() => {
    switch (activeTab) {
      case 'ai-model':
        activeBarTransformClass = '-translate-x-18'
        break
      case 'summary':
        activeBarTransformClass = 'translate-x-0'
        break
      case 'general': // Note: this tab has id 'general' in the button
        activeBarTransformClass = 'translate-x-18'
        break
      default:
        activeBarTransformClass = '-translate-x-18' // Default value
    }
  })

  function handleUpdateSetting(key, value) {
    if (key === 'temperature' || key === 'topP') {
      if (settings.isAdvancedMode) {
        updateAdvancedModeSettings({ [key]: value })
      } else {
        updateBasicModeSettings({ [key]: value })
      }
    } else {
      updateSettings({ [key]: value })
    }
  }
</script>

<!-- Apply Tailwind classes for overall layout and styling -->
<div
  class="relative font-mono rounded-lg text-text-primary dark:text-text-secondary text-xs bg-background dark:bg-surface-1 overflow-hidden border border-border w-full flex-shrink-0 flex flex-col"
>
  <div
    class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
  >
    <p class="!text-center">Settings</p>
  </div>

  <div
    class="flex bg-background items-center text-[0.65rem] justify-center p-3 gap-2"
  >
    <button
      class="flex flex-col w-16 items-center justify-center gap-1 cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'ai-model'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => (activeTab = 'ai-model')}
    >
      {#if activeTab === 'ai-model'}
        <Icon icon="heroicons:sparkles-solid" width="20" height="20" />
      {:else}
        <Icon icon="heroicons:sparkles" width="20" height="20" />
      {/if}

      <span>Model</span>
    </button>
    <button
      class="flex flex-col w-16 items-center gap-1 justify-center cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'summary'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => (activeTab = 'summary')}
    >
      {#if activeTab === 'summary'}
        <Icon icon="heroicons:document-text-solid" width="20" height="20" />
      {:else}
        <Icon icon="heroicons:document-text" width="20" height="20" />
      {/if}

      <span> Summary</span>
    </button>
    <button
      class="flex flex-col w-16 items-center gap-1 justify-center cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'general'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => (activeTab = 'general')}
    >
      {#if activeTab === 'general'}
        <Icon icon="heroicons:swatch-solid" width="20" height="20" />
      {:else}
        <Icon icon="heroicons:swatch" width="20" height="20" />
      {/if}
      <span> General</span>
    </button>
  </div>
  <div
    class="top-stripes relative bg-background z-10 flex justify-center items-center h-2 border border-border border-l-0 border-r-0"
  >
    <div
      id="activebar"
      class="w-14 h-1 rounded-xs relative bg-white skew-x-[45deg] transition-transform duration-400 ease-out {activeBarTransformClass}"
    >
      <div class=" absolute rounded-xs -inset-px bg-white"></div>
      <div
        class=" -skew-x-[30deg] absolute -inset-px bg-white/50 blur-xs"
      ></div>
      <div
        class=" -skew-x-[30deg] absolute -inset-px bg-white/50 blur-[2px]"
      ></div>
    </div>
  </div>
  <div id="setting-scroll" class="max-h-[calc(100vh-64px)]">
    <div>
      {#if activeTab === 'ai-model'}
        <!--AI Model Section -->
        <div class="setting-block flex gap-5 pb-6 pt-5 flex-col">
          <div class="flex items-center h-6 justify-between px-5">
            <label
              for="advanced-mode-toggle"
              class="block font-bold text-text-primary">Provider settings</label
            >
            <div class="flex items-center">
              <Label.Root
                class="cursor-pointer pr-2 py-2 w-20 text-right font-bold select-none {settings.isAdvancedMode
                  ? 'text-primary'
                  : 'text-text-primary'}"
                for="provider-toggle"
              >
                {settings.isAdvancedMode ? 'Advanced' : 'Basic'}
              </Label.Root>
              <Switch.Root
                id="provider-toggle"
                bind:checked={settings.isAdvancedMode}
                name="Advanced Mode"
                class="focus-visible:ring-primary border border-blackwhite/5 text-text-secondary flex justify-center items-center focus-visible:ring-offset-background  bg-blackwhite/5 hover:bg-blackwhite/10 transition-colors rounded-full  focus-visible:outline-hidden  size-7.5  shrink-0 cursor-pointer  focus-visible:ring-1 focus-visible:ring-offset-1 disabled:cursor-not-allowed data-[state=checked]:text-white disabled:opacity50"
              >
                <Switch.Thumb
                  class="bg-primary rounded-full pointer-events-none block shrink-0 size-7.5 transition-all duration-300 data-[state=checked]:scale-100 data-[state=unchecked]:scale-60  data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-0"
                />
                <Icon
                  icon="heroicons:wrench-16-solid"
                  width="20"
                  height="20"
                  class="origin-[75%_25%] animate-wiggle absolute z-10"
                />
              </Switch.Root>
            </div>
          </div>

          <div class="setting-secsion flex flex-col gap-6 px-5">
            {#if settings.isAdvancedMode}
              <!-- Providers Select Section -->
              <div class="flex flex-col gap-2">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="block text-text-secondary"
                  >Selected Provider</label
                >
                <ProvidersSelect bind:value={settings.selectedProvider} />
              </div>

              <!-- Dynamic Provider Config Section -->
              {#if settings.selectedProvider === 'gemini'}
                <GeminiAdvancedConfig
                  bind:geminiAdvancedApiKey={settings.geminiAdvancedApiKey}
                  bind:selectedGeminiAdvancedModel={
                    settings.selectedGeminiAdvancedModel
                  }
                />
              {:else if settings.selectedProvider === 'openrouter'}
                <OpenrouterConfig
                  bind:openrouterApiKey={settings.openrouterApiKey}
                  bind:selectedOpenrouterModel={
                    settings.selectedOpenrouterModel
                  }
                />
              {:else if settings.selectedProvider === 'ollama'}
                <OllamaConfig />
              {/if}

              <div class="grid grid-cols-2 gap-4">
                <!-- Temperature Section -->
                <div class="flex flex-col gap-2">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label
                    class=" text-text-secondary flex justify-between items-center"
                  >
                    <span>Temperature</span>
                    <span class="text-text-primary font-bold"
                      >{advancedModeSettings.temperature.toFixed(2)}</span
                    >
                  </label>
                  <input
                    type="range"
                    id="temperature-range"
                    min="0"
                    max="1"
                    step="0.05"
                    bind:value={advancedModeSettings.temperature}
                    onchange={() =>
                      handleUpdateSetting(
                        'temperature',
                        advancedModeSettings.temperature
                      )}
                    class="range range-primary"
                  />
                </div>

                <!-- Top P Section -->
                <div class="flex flex-col gap-2 relative">
                  <!-- Added relative here -->
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label
                    class=" text-text-secondary flex justify-between items-center"
                  >
                    <span>Top P</span>
                    <span class="text-text-primary font-bold"
                      >{advancedModeSettings.topP.toFixed(2)}</span
                    >
                  </label>
                  <input
                    type="range"
                    id="topP-range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={advancedModeSettings.topP}
                    onchange={() =>
                      handleUpdateSetting('topP', advancedModeSettings.topP)}
                    class="range range-primary"
                  />
                </div>
              </div>
            {:else}
              <div class="setting-block flex gap-5 pb-2 flex-col">
                <GeminiBasicConfig
                  bind:geminiApiKey={settings.geminiApiKey}
                  bind:selectedGeminiModel={settings.selectedGeminiModel}
                />
                <!-- Temperature Section for Basic Mode -->
                <div class="flex flex-col gap-2">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label
                    class=" text-text-secondary flex justify-between items-center"
                  >
                    <span>Temperature</span>
                    <span class="text-text-primary block font-bold"
                      >{basicModeSettings.temperature.toFixed(2)}</span
                    >
                  </label>
                  <div class="grid grid-cols-3 w-full gap-1">
                    <ButtonSet
                      title="Precise"
                      class="setting-btn {basicModeSettings.temperature === 0.3
                        ? 'active'
                        : ''}"
                      onclick={() => handleUpdateSetting('temperature', 0.3)}
                      Description="0.3 - Less creative."
                    ></ButtonSet>
                    <ButtonSet
                      title="Balanced"
                      class="setting-btn {basicModeSettings.temperature === 0.7
                        ? 'active'
                        : ''}"
                      onclick={() => handleUpdateSetting('temperature', 0.7)}
                      Description="0.7 - Balanced."
                    ></ButtonSet>
                    <ButtonSet
                      title="Creative"
                      class="setting-btn {basicModeSettings.temperature === 0.9
                        ? 'active'
                        : ''}"
                      onclick={() => handleUpdateSetting('temperature', 0.9)}
                      Description="0.9 - More creative."
                    ></ButtonSet>
                  </div>
                </div>

                <!-- Top P Section for Basic Mode -->
                <div class="flex flex-col gap-2">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label
                    class=" text-text-secondary flex justify-between items-center"
                  >
                    <span>Top P</span>
                    <span class="text-text-primary block font-bold"
                      >{basicModeSettings.topP.toFixed(2)}</span
                    >
                  </label>
                  <div class="grid grid-cols-3 w-full gap-1">
                    <ButtonSet
                      title="Narrow"
                      class="setting-btn {basicModeSettings.topP === 0.9
                        ? 'active'
                        : ''}"
                      onclick={() => handleUpdateSetting('topP', 0.9)}
                      Description="0.9 - Focus on most likely tokens."
                    ></ButtonSet>
                    <ButtonSet
                      title="Balanced"
                      class="setting-btn {basicModeSettings.topP === 0.95
                        ? 'active'
                        : ''}"
                      onclick={() => handleUpdateSetting('topP', 0.95)}
                      Description="0.95 - Broader range of tokens."
                    ></ButtonSet>
                    <ButtonSet
                      title="Wide"
                      class="setting-btn {basicModeSettings.topP === 0.98
                        ? 'active'
                        : ''}"
                      onclick={() => handleUpdateSetting('topP', 0.98)}
                      Description="0.98 - Wider range of tokens."
                    ></ButtonSet>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      {#if activeTab === 'summary'}
        <!-- Summmary Section -->

        <div class="setting-block flex flex-col gap-5 pb-6 pt-5">
          <div class="flex items-center h-6 justify-between px-5">
            <label
              for="advanced-mode-toggle"
              class="block font-bold text-text-primary">Summmary settings</label
            >
            <div class="flex items-center">
              <!-- <Label.Root
                class="cursor-pointer pr-2 py-2 w-20 text-right font-bold select-none {settings.isSummaryEnabled
                  ? 'text-primary'
                  : 'text-text-primary'}"
                for="provider-toggle"
              >
                {settings.isSummaryEnabled ? 'Advanced' : 'Basic'}
              </Label.Root>
              <Switch.Root
                id="provider-toggle"
                bind:checked={settings.isSummaryEnabled}
                name="Advanced Mode"
                class="focus-visible:ring-primary border border-blackwhite/5 text-text-secondary flex justify-center items-center focus-visible:ring-offset-background  bg-blackwhite/5 hover:bg-blackwhite/10 transition-colors rounded-full  focus-visible:outline-hidden  size-7.5  shrink-0 cursor-pointer  focus-visible:ring-1 focus-visible:ring-offset-1 disabled:cursor-not-allowed data-[state=checked]:text-white disabled:opacity50"
              >
                <Switch.Thumb
                  class="bg-primary rounded-full pointer-events-none block shrink-0 size-7.5 transition-all duration-300 data-[state=checked]:scale-100 data-[state=unchecked]:scale-60  data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-0"
                />
                <Icon
                  icon="heroicons:wrench-16-solid"
                  width="20"
                  height="20"
                  class="origin-[75%_25%] animate-wiggle absolute z-10"
                />
              </Switch.Root> -->
            </div>
          </div>
          <div class="setting-secsion flex flex-col gap-6 px-5">
            <!-- Summary Length Section -->
            <div class="flex flex-col gap-2">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-text-secondary">Summary Size</label>
              <div class="grid grid-cols-3 w-full gap-1">
                <ButtonSet
                  title="Short"
                  class="setting-btn {settings.summaryLength === 'short'
                    ? 'active'
                    : ''}"
                  onclick={() => handleUpdateSetting('summaryLength', 'short')}
                  Description="Short summary."
                ></ButtonSet>
                <ButtonSet
                  title="Medium"
                  class="setting-btn {settings.summaryLength === 'medium'
                    ? 'active'
                    : ''}"
                  onclick={() => handleUpdateSetting('summaryLength', 'medium')}
                  Description="Medium length summary."
                ></ButtonSet>
                <ButtonSet
                  title="Long"
                  class="setting-btn {settings.summaryLength === 'long'
                    ? 'active'
                    : ''}"
                  onclick={() => handleUpdateSetting('summaryLength', 'long')}
                  Description="Detailed summary."
                ></ButtonSet>
              </div>
            </div>

            <!-- Summary Format Section -->
            <div class="flex flex-col gap-2">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-text-secondary">Format</label>
              <div class="grid grid-cols-3 w-full gap-1">
                <ButtonSet
                  title="Plain"
                  class="setting-btn {settings.summaryFormat === 'plain'
                    ? 'active'
                    : ''}"
                  onclick={() => handleUpdateSetting('summaryFormat', 'plain')}
                  Description="Plain text format."
                ></ButtonSet>
                <ButtonSet
                  title="Heading"
                  class="setting-btn {settings.summaryFormat === 'heading'
                    ? 'active'
                    : ''}"
                  onclick={() =>
                    handleUpdateSetting('summaryFormat', 'heading')}
                  Description="Format with headings."
                ></ButtonSet>
              </div>
            </div>

            <!-- Summary Tone Section -->
            <div class="flex flex-col gap-2">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-text-secondary">Tone</label>
              <div class="grid grid-cols-3 w-full gap-1">
                <ButtonSet
                  title="Simple"
                  class="setting-btn {settings.summaryTone === 'simple'
                    ? 'active'
                    : ''}"
                  onclick={() => handleUpdateSetting('summaryTone', 'simple')}
                  Description="Easy to understand, friendly."
                ></ButtonSet>
                <ButtonSet
                  title="Expert"
                  class="setting-btn {settings.summaryTone === 'expert'
                    ? 'active'
                    : ''}"
                  onclick={() => handleUpdateSetting('summaryTone', 'expert')}
                  Description="Professional, technical, authoritative."
                ></ButtonSet>
                <ButtonSet
                  title="Alien"
                  class="setting-btn {settings.summaryTone === 'alien'
                    ? 'active'
                    : ''}"
                  onclick={() => handleUpdateSetting('summaryTone', 'alien')}
                  Description="Curious, analytical, detached."
                ></ButtonSet>
              </div>
            </div>

            <!-- Summary Language Section -->
            <div class="flex flex-col gap-2">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-text-secondary">Language output</label>
              <LanguageSelect bind:value={settings.summaryLang} />
            </div>
          </div>
        </div>
      {/if}

      {#if activeTab === 'general'}
        <!-- General Section -->
        <div class="setting-block flex pb-6 pt-5 flex-col">
          <div class="flex items-center h-6 justify-between px-5">
            <label
              for="advanced-mode-toggle"
              class="block font-bold text-text-primary">General Settings</label
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
                onclick={() =>
                  handleUpdateSetting('selectedFont', 'noto-serif')}
                Description="Noto Serif font."
                font="serif"
              ></ButtonFont>
              <ButtonFont
                title="OpenDyslexic"
                class="setting-btn {settings.selectedFont === 'opendyslexic'
                  ? 'active'
                  : ''}"
                onclick={() =>
                  handleUpdateSetting('selectedFont', 'opendyslexic')}
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
                /></ButtonIcon
              >
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
  <!-- Summary Format Section -->
</div>

<style>
  .setting-block {
    background-color: var(--color-surface-1);
  }
</style>
