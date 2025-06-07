<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import ButtonSet from './ButtonSet.svelte'
  import GroupVisual from './GroupVisual.svelte'
  import LanguageSelect from './LanguageSelect.svelte' // Import LanguageSelect
  import ProvidersSelect from './ProvidersSelect.svelte' // Import ProvidersSelect
  import GeminiBasicConfig from './providerConfigs/GeminiBasicConfig.svelte' // Import GeminiBasicConfig
  import GeminiAdvancedConfig from './providerConfigs/GeminiAdvancedConfig.svelte' // Import GeminiAdvancedConfig
  import OpenrouterConfig from './providerConfigs/OpenrouterConfig.svelte' // Import OpenrouterConfig
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { providersConfig } from '../lib/providersConfig.js'

  // Import trực tiếp từ stores đã refactor
  import {
    settings,
    getIsInitialized,
    updateSettings,
  } from '../stores/settingsStore.svelte.js'
  import { getTheme, setTheme } from '../stores/themeStore.svelte'

  let summaryLength = $state('long')
  let summaryFormat = $state('heading')
  let temperature = $state(0.6)
  let topP = $state(0.91)
  let isAdvancedMode = $state(false)

  const options = {
    scrollbars: {
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Sử dụng $effect để khởi tạo OverlayScrollbars
  $effect(() => {
    const tocElement = document.getElementById('setting-scroll')
    if (tocElement) {
      initialize(tocElement)
    }
  })

  // Sử dụng $effect để tải cài đặt từ store khi nó được khởi tạo
  $effect(() => {
    if (getIsInitialized()) {
      summaryLength = settings.summaryLength
      settings.summaryLang = settings.summaryLang
      summaryFormat = settings.summaryFormat
      settings.selectedModel = settings.selectedModel
      temperature = settings.temperature
      topP = settings.topP
      isAdvancedMode = settings.isAdvancedMode
    }
  })

  // Sử dụng $effect để lưu summaryLang khi nó thay đổi
  $effect(() => {
    if (getIsInitialized() && settings.summaryLang !== undefined) {
      updateSettings({ summaryLang: settings.summaryLang })
    }
  })

  // Sử dụng $effect để lưu selectedModel khi nó thay đổi
  $effect(() => {
    if (getIsInitialized() && settings.selectedModel !== undefined) {
      updateSettings({ selectedModel: settings.selectedModel })
    }
  })

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
</script>

<!-- Apply Tailwind classes for overall layout and styling -->
<div
  class="relative font-mono rounded-lg text-text-primary dark:text-text-secondary text-xs bg-background dark:bg-background overflow-hidden border border-border w-full flex-shrink-0 flex flex-col"
>
  <div
    class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
  >
    <h2 class="text-center">Settings</h2>
  </div>

  <div
    class="flex items-center justify-center px-4 py-2 border-b border-border gap-2"
  >
    <div class="flex flex-col items-center gap-2">
      <Icon icon="heroicons:sparkles" width="20" height="20" />
      <span class="text-text-primary dark:text-text-secondary"> AI</span>
    </div>
    <div class="flex flex-col items-center gap-2">
      <Icon icon="heroicons:document-text" width="20" height="20" />
      <span class="text-text-primary dark:text-text-secondary"> Summary</span>
    </div>
    <div class="flex flex-col items-center gap-2">
      <Icon icon="heroicons:swatch" width="20" height="20" />
      <span class="text-text-primary dark:text-text-secondary"> General</span>
    </div>
  </div>

  <!-- Advanced Mode Toggle -->
  <div id="setting-scroll" class="max-h-[calc(100vh-64px)]">
    <div class="flex flex-col">
      <div
        class="top-stripes h-2 border border-border border-l-0 border-r-0"
      ></div>
      <div class="setting-block flex flex-col">
        <div
          class="flex border-b border-border border-dashed items-center justify-between py-2 px-4"
        >
          <label for="advanced-mode-toggle" class="block dark:text-muted"
            >Provider</label
          >
          <input
            type="checkbox"
            id="advanced-mode-toggle"
            bind:checked={isAdvancedMode}
            onchange={() => updateSettings({ isAdvancedMode })}
            class="toggle toggle-primary"
          />
        </div>
        <div class="setting-secsion flex flex-col gap-4 p-4">
          {#if isAdvancedMode}
            <!-- Providers Select Section -->
            <div class="flex flex-col gap-2">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-text-primary font-bold"
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
                bind:selectedOpenrouterModel={settings.selectedOpenrouterModel}
              />
            {/if}
          {:else}
            <GeminiBasicConfig
              bind:geminiApiKey={settings.geminiApiKey}
              bind:selectedGeminiModel={settings.selectedGeminiModel}
            />
          {/if}

          <!-- Temperature and Top P Section -->
          <div class="flex flex-col gap-2">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-text-primary font-bold"
              >Summary Style</label
            >
            <div class="grid grid-cols-3 w-full gap-1">
              <ButtonSet
                title="Adherent"
                class="setting-btn {temperature === 0.3 && topP === 0.82
                  ? 'active'
                  : ''}"
                onclick={() => {
                  handleUpdateSetting('temperature', 0.3)
                  handleUpdateSetting('topP', 0.82)
                }}
                Description="Adherent summary style, less creative."
              ></ButtonSet>
              <ButtonSet
                title="Balanced"
                class="setting-btn {temperature === 0.6 && topP === 0.91
                  ? 'active'
                  : ''}"
                onclick={() => {
                  handleUpdateSetting('temperature', 0.6)
                  handleUpdateSetting('topP', 0.91)
                }}
                Description="Balanced summary style."
              ></ButtonSet>
              <ButtonSet
                title="Creative"
                class="setting-btn {temperature === 0.9 && topP === 0.96
                  ? 'active'
                  : ''}"
                onclick={() => {
                  handleUpdateSetting('temperature', 0.9)
                  handleUpdateSetting('topP', 0.96)
                }}
                Description="Creative summary style, more imaginative."
              ></ButtonSet>
            </div>
          </div>
        </div>
      </div>
      <div
        class="top-stripes h-2 border border-border border-l-0 border-r-0"
      ></div>
      <div class="setting-block flex flex-col gap-4">
        <div
          class="flex border-b border-border items-center justify-between py-2 px-4"
        >
          <label for="summary-settings-toggle" class="block dark:text-muted"
            >Summary Settings</label
          >
          <input
            type="checkbox"
            id="summary-settings-toggle"
            bind:checked={settings.isSummaryEnabled}
            onchange={() =>
              updateSettings({ isSummaryEnabled: settings.isSummaryEnabled })}
            class="toggle toggle-primary"
          />
        </div>
        <div class="setting-secsion flex flex-col gap-4 px-4">
          <!-- Summary Length Section -->
          <div class="flex flex-col gap-2">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-text-primary font-bold">Summary Size</label
            >
            <div class="grid grid-cols-3 w-full gap-1">
              <ButtonSet
                title="Short"
                class="setting-btn {summaryLength === 'short' ? 'active' : ''}"
                onclick={() => handleUpdateSetting('summaryLength', 'short')}
                Description="Short summary."
              ></ButtonSet>
              <ButtonSet
                title="Medium"
                class="setting-btn {summaryLength === 'medium' ? 'active' : ''}"
                onclick={() => handleUpdateSetting('summaryLength', 'medium')}
                Description="Medium length summary."
              ></ButtonSet>
              <ButtonSet
                title="Long"
                class="setting-btn {summaryLength === 'long' ? 'active' : ''}"
                onclick={() => handleUpdateSetting('summaryLength', 'long')}
                Description="Detailed summary."
              ></ButtonSet>
            </div>
          </div>

          <!-- Summary Format Section -->
          <div class="flex flex-col gap-2">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-text-primary font-bold"
              >Summary format</label
            >
            <div class="grid grid-cols-3 w-full gap-1">
              <ButtonSet
                title="Plain"
                class="setting-btn {summaryFormat === 'plain' ? 'active' : ''}"
                onclick={() => handleUpdateSetting('summaryFormat', 'plain')}
                Description="Plain text format."
              ></ButtonSet>
              <ButtonSet
                title="Heading"
                class="setting-btn {summaryFormat === 'heading'
                  ? 'active'
                  : ''}"
                onclick={() => handleUpdateSetting('summaryFormat', 'heading')}
                Description="Format with headings."
              ></ButtonSet>
            </div>
          </div>

          <!-- Summary Language Section -->
          <div class="flex flex-col gap-2">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-text-primary font-bold"
              >Language output</label
            >
            <LanguageSelect bind:value={settings.summaryLang} />
          </div>
        </div>
      </div>
      <!-- Theme Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-primary font-bold">Theme</label>
        <div class="grid grid-cols-3 w-full gap-1">
          <ButtonSet
            title="Light"
            class="setting-btn {getTheme() === 'light' ? 'active' : ''}"
            onclick={() => setTheme('light')}
            Description="Light theme."
          ></ButtonSet>
          <ButtonSet
            title="Dark"
            class="setting-btn {getTheme() === 'dark' ? 'active' : ''}"
            onclick={() => setTheme('dark')}
            Description="Dark theme."
          ></ButtonSet>
          <ButtonSet
            title="System"
            class="setting-btn {getTheme() === 'system' ? 'active' : ''}"
            onclick={() => setTheme('system')}
            Description="System theme."
          ></ButtonSet>
        </div>
      </div>
    </div>
  </div>
  <!-- Summary Format Section -->
</div>

<style>
  .setting-block {
    background-color: var(--color-surface-1);
  }
</style>
