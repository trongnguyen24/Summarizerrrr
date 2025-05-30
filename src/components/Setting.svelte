<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import ButtonSet from './ButtonSet.svelte'
  import GroupVisual from './GroupVisual.svelte'
  import LanguageSelect from './LanguageSelect.svelte' // Import LanguageSelect
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'

  // Import trực tiếp từ stores đã refactor
  import {
    settings,
    getIsInitialized,
    updateSettings,
  } from '../stores/settingsStore.svelte.js'
  import { getTheme, setTheme } from '../stores/themeStore.svelte'

  let apiKey = $state('')
  let showApiKey = $state(false)
  let summaryLength = $state('long')
  let summaryLang = $state('Vietnamese')
  let summaryFormat = $state('heading')
  let selectedModel = $state('gemini-2.0-flash')
  let temperature = $state(0.6)
  let topP = $state(0.91)
  let saveStatus = $state('')
  let apiKeyDebounceTimer = null

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
      apiKey = settings.geminiApiKey
      summaryLength = settings.summaryLength
      summaryLang = settings.summaryLang
      summaryFormat = settings.summaryFormat
      selectedModel = settings.selectedModel
      temperature = settings.temperature
      topP = settings.topP
    }
  })

  function scheduleApiKeySave() {
    clearTimeout(apiKeyDebounceTimer)
    apiKeyDebounceTimer = setTimeout(() => {
      updateSettings({ geminiApiKey: apiKey.trim() })
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
</script>

<!-- Apply Tailwind classes for overall layout and styling -->
<div
  class="relative font-mono text-text-primary dark:text-text-secondary text-xs bg-surface-2 dark:bg-surface-1 overflow-hidden border border-border w-full flex-shrink-0 flex flex-col"
>
  <div
    class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
  >
    <h2 class="">Settings</h2>
  </div>

  <!-- API Key Section -->
  <div id="setting-scroll" class="max-h-[calc(100vh-64px)]">
    <div class="p-4 flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-1 justify-between">
          <label for="api-key" class="block dark:text-muted"
            >Gemini API Key</label
          >
          {#if saveStatus}
            <p
              id="save-status"
              transition:fade
              class="text-success flex mr-auto"
            >
              Auto saved!
            </p>
          {/if}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            class="text-xs flex items-center gap-0.5 text-primary hover:underline"
            >Get a key <Icon
              width={12}
              icon="heroicons:arrow-up-right-16-solid"
            /></a
          >
        </div>

        <div class="relative">
          <div class="plus-icon top-left"></div>
          <div class="plus-icon bottom-right"></div>
          <input
            type={showApiKey ? 'text' : 'password'}
            id="api-key"
            bind:value={apiKey}
            class="w-full pl-3 pr-9 py-1.5 h-10 bg-surface-1/50 border border-border focus:outline-none focus:ring-1 placeholder:text-muted"
            oninput={scheduleApiKeySave}
          />
          <button
            class="absolute size-8 text-muted right-0.5 top-1 grid place-items-center cursor-pointer"
            onclick={() => (showApiKey = !showApiKey)}
            tabindex="0"
            aria-label={showApiKey ? 'Hide API Key' : 'Show API Key'}
            onkeypress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                showApiKey = !showApiKey
              }
            }}
          >
            {#if !showApiKey}
              <Icon
                class="absolute"
                width={16}
                icon="heroicons:eye-slash-16-solid"
              />
            {:else}
              <Icon class="absolute" width={16} icon="heroicons:eye-16-solid" />
            {/if}
          </button>
        </div>
      </div>

      <!-- Gemini Model Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-primary font-bold">Gemini Model</label>
        <div class="grid grid-cols-3 w-full gap-1">
          <ButtonSet
            title="2.0 Flash"
            class="setting-btn {selectedModel === 'gemini-2.0-flash'
              ? 'active'
              : ''}"
            onclick={() =>
              handleUpdateSetting('selectedModel', 'gemini-2.0-flash')}
            Description="Fast and efficient."
          ></ButtonSet>
          <ButtonSet
            title="2.5 Flash"
            class="setting-btn {selectedModel ===
            'gemini-2.5-flash-preview-05-20'
              ? 'active'
              : ''}"
            onclick={() =>
              handleUpdateSetting(
                'selectedModel',
                'gemini-2.5-flash-preview-05-20'
              )}
            Description="Powerful but slow."
          ></ButtonSet>
          <ButtonSet
            title="2.5 Pro"
            class="setting-btn {selectedModel === 'gemini-2.5-pro-preview-05-06'
              ? 'active'
              : ''}"
            onclick={() =>
              handleUpdateSetting(
                'selectedModel',
                'gemini-2.5-pro-preview-05-06'
              )}
            Description="Most powerful, Very slow + limit."
          ></ButtonSet>
        </div>
      </div>

      <!-- Temperature and Top P Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-primary font-bold">Summary Style</label>
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

      <!-- Summary Length Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-primary font-bold">Summary Size</label>
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
        <label class="block text-text-primary font-bold">Summary format</label>
        <div class="grid grid-cols-3 w-full gap-1">
          <ButtonSet
            title="Plain"
            class="setting-btn {summaryFormat === 'plain' ? 'active' : ''}"
            onclick={() => handleUpdateSetting('summaryFormat', 'plain')}
            Description="Plain text format."
          ></ButtonSet>
          <ButtonSet
            title="Heading"
            class="setting-btn {summaryFormat === 'heading' ? 'active' : ''}"
            onclick={() => handleUpdateSetting('summaryFormat', 'heading')}
            Description="Format with headings."
          ></ButtonSet>
        </div>
      </div>

      <!-- Summary Language Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-primary font-bold">Language output</label>
        <LanguageSelect
          value={summaryLang}
          on:change={(e) => handleUpdateSetting('summaryLang', e.detail)}
        />
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
