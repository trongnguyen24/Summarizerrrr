<script>
  // @ts-nocheck
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte' // Import Icon
  import ButtonSet from './ButtonSet.svelte'
  import GroupVisual from './GroupVisual.svelte'
  import 'overlayscrollbars/overlayscrollbars.css' // Import CSS overlayscrollbars
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte' // Import primitive
  import { theme, setTheme } from '../stores/themeStore.svelte' // Import theme store and setTheme function

  let apiKey = $state('')
  let showApiKey = $state(false) // Track API key visibility
  let summaryLength = $state('long')
  let summaryLang = $state('Vietnamese') // Changed default to 'vi' to match options
  let summaryFormat = $state('heading') // Changed default to 'heading' to match options
  let selectedModel = $state('gemini-2.0-flash') // Add state for selected model
  let temperature = $state(0.6) // Add state for temperature, default to Balanced
  let topP = $state(0.91) // Add state for topP, default to Balanced
  let saveStatus = $state('')
  let apiKeyDebounceTimer = null // Timer for debouncing API key save

  const options = {
    scrollbars: {
      // autoHide: 'never',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  onMount(() => {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.get(
        [
          'geminiApiKey',
          'summaryLength',
          'summaryLang',
          'summaryFormat',
          'selectedModel',
          'temperature', // Add temperature
          'topP', // Add topP
        ],
        (result) => {
          if (result.geminiApiKey) apiKey = result.geminiApiKey
          // Ensure defaults are set if nothing is in storage yet
          summaryLength = result.summaryLength || 'long'
          summaryLang = result.summaryLang || 'Vietnamese'
          summaryFormat = result.summaryFormat || 'heading'
          selectedModel = result.selectedModel || 'gemini-2.0-flash' // Load selected model
          temperature = result.temperature || 0.6 // Load temperature, default to Balanced
          topP = result.topP || 0.91 // Load topP, default to Balanced
        }
      )
    } else {
      console.warn('Chrome storage API is not available.')
      // Set defaults for dev environment
      apiKey = localStorage.getItem('geminiApiKey_dev') || '' // Load from local storage for dev
      summaryLength = 'long'
      summaryLang = 'Vietnamese'
      summaryFormat = 'heading'
      selectedModel =
        localStorage.getItem('selectedModel_dev') || 'gemini-2.0-flash' // Load selected model for dev
      temperature = parseFloat(localStorage.getItem('temperature_dev')) || 0.6 // Load temperature for dev
      topP = parseFloat(localStorage.getItem('topP_dev')) || 0.91 // Load topP for dev
    }
    // Initialize the overlay scrollbar
    const tocElement = document.getElementById('setting-scroll')
    if (tocElement) {
      initialize(tocElement)
    }
  })

  // Debounce function for API key saving
  function scheduleApiKeySave() {
    clearTimeout(apiKeyDebounceTimer)
    apiKeyDebounceTimer = setTimeout(() => {
      saveApiKey()
    }, 300) // Delay of 0.8 seconds
  }

  function updateSetting(key, value) {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.set({ [key]: value }, () => {
        // Update local state immediately for reactivity
        if (key === 'summaryLength') summaryLength = value
        if (key === 'summaryLang') summaryLang = value
        if (key === 'summaryFormat') summaryFormat = value
        if (key === 'selectedModel') selectedModel = value // Update selected model state
        if (key === 'temperature') temperature = value // Update temperature state
        if (key === 'topP') topP = value // Update topP state
        // Optionally show a temporary confirmation, similar to saveStatus
        // saveStatus = `Updated ${key}!`;
        // setTimeout(() => saveStatus = '', 1500);
        console.log(`Updated ${key} to ${value}`)
      })
    } else {
      console.warn('Chrome storage API is not available. Simulating update.')
      if (key === 'summaryLength') summaryLength = value
      if (key === 'summaryLang') summaryLang = value
      if (key === 'summaryFormat') summaryFormat = value
      if (key === 'selectedModel') selectedModel = value // Update selected model state for dev
      if (key === 'temperature') temperature = value // Update temperature state for dev
      if (key === 'topP') topP = value // Update topP state for dev
      // Also save to local storage for dev environment
      if (key === 'geminiApiKey' && typeof localStorage !== 'undefined') {
        localStorage.setItem('geminiApiKey_dev', value)
        console.log('Saved API Key to localStorage (dev)')
      }
      if (key === 'selectedModel' && typeof localStorage !== 'undefined') {
        localStorage.setItem('selectedModel_dev', value)
        console.log('Saved selectedModel to localStorage (dev)')
      }
      if (key === 'temperature' && typeof localStorage !== 'undefined') {
        localStorage.setItem('temperature_dev', value.toString())
        console.log('Saved temperature to localStorage (dev)')
      }
      if (key === 'topP' && typeof localStorage !== 'undefined') {
        localStorage.setItem('topP_dev', value.toString())
        console.log('Saved topP to localStorage (dev)')
      }
    }
  }

  function saveApiKey() {
    const keyToSave = apiKey.trim()
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.set({ geminiApiKey: keyToSave }, () => {
        saveStatus = 'saved!'
        setTimeout(() => (saveStatus = ''), 2000)
        console.log('saved')
      })
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('geminiApiKey_dev', keyToSave)
        saveStatus = 'saved (simulated)!'
        console.log(
          'API Key automatically saved to localStorage (dev):',
          keyToSave
        )
        setTimeout(() => (saveStatus = ''), 2000)
      } else {
        saveStatus = 'Error: Could not save API Key.'
        console.error(
          'Cannot save API Key: Neither chrome.storage nor localStorage is available.'
        )
        setTimeout(() => (saveStatus = ''), 2000)
      }
    }
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
              <!-- {saveStatus} -->

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
            class="setting {selectedModel === 'gemini-2.0-flash'
              ? 'active'
              : ''}"
            onclick={() => updateSetting('selectedModel', 'gemini-2.0-flash')}
            Description="Fast and efficient."
          ></ButtonSet>
          <ButtonSet
            title="2.5 Flash"
            class="setting {selectedModel === 'gemini-2.5-flash-preview-04-17'
              ? 'active'
              : ''}"
            onclick={() =>
              updateSetting('selectedModel', 'gemini-2.5-flash-preview-04-17')}
            Description="Powerful but slow."
          ></ButtonSet>
          <ButtonSet
            title="2.5 Pro"
            class="setting {selectedModel === 'gemini-2.5-pro-exp-03-25'
              ? 'active'
              : ''}"
            onclick={() =>
              updateSetting('selectedModel', 'gemini-2.5-pro-exp-03-25')}
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
            class="setting {temperature === 0.3 && topP === 0.82
              ? 'active'
              : ''}"
            onclick={() => {
              updateSetting('temperature', 0.3)
              updateSetting('topP', 0.82)
            }}
            Description="Adherent summary style, less creative."
          ></ButtonSet>
          <ButtonSet
            title="Balanced"
            class="setting {temperature === 0.6 && topP === 0.91
              ? 'active'
              : ''}"
            onclick={() => {
              updateSetting('temperature', 0.6)
              updateSetting('topP', 0.91)
            }}
            Description="Balanced summary style."
          ></ButtonSet>
          <ButtonSet
            title="Creative"
            class="setting {temperature === 0.9 && topP === 0.96
              ? 'active'
              : ''}"
            onclick={() => {
              updateSetting('temperature', 0.9)
              updateSetting('topP', 0.96)
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
            class="setting {summaryLength === 'short' ? 'active' : ''}"
            onclick={() => updateSetting('summaryLength', 'short')}
            Description="Short summary."
          ></ButtonSet>
          <ButtonSet
            title="Medium"
            class="setting {summaryLength === 'medium' ? 'active' : ''}"
            onclick={() => updateSetting('summaryLength', 'medium')}
            Description="Medium length summary."
          ></ButtonSet>
          <ButtonSet
            title="Long"
            class="setting {summaryLength === 'long' ? 'active' : ''}"
            onclick={() => updateSetting('summaryLength', 'long')}
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
            class="setting {summaryFormat === 'plain' ? 'active' : ''}"
            onclick={() => updateSetting('summaryFormat', 'plain')}
            Description="Plain text format."
          ></ButtonSet>
          <ButtonSet
            title="Heading"
            class="setting {summaryFormat === 'heading' ? 'active' : ''}"
            onclick={() => updateSetting('summaryFormat', 'heading')}
            Description="Format with headings."
          ></ButtonSet>
        </div>
      </div>

      <!-- Summary Language Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-primary font-bold">Language output</label>
        <div class="grid grid-cols-3 w-full gap-1">
          <ButtonSet
            title="Vietnamese"
            class="setting {summaryLang === 'Vietnamese' ? 'active' : ''}"
            onclick={() => updateSetting('summaryLang', 'Vietnamese')}
            Description="Vietnamese language."
          ></ButtonSet>
          <ButtonSet
            title="English"
            class="setting {summaryLang === 'English' ? 'active' : ''}"
            onclick={() => updateSetting('summaryLang', 'English')}
            Description="English language."
          ></ButtonSet>
          <ButtonSet
            title="Korean"
            class="setting {summaryLang === 'Korean' ? 'active' : ''}"
            onclick={() => updateSetting('summaryLang', 'Korean')}
            Description="Korean language."
          ></ButtonSet>
        </div>
      </div>

      <!-- Theme Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-primary font-bold">Theme</label>
        <div class="grid grid-cols-3 w-full gap-1">
          <ButtonSet
            title="Light"
            class="setting {$theme === 'light' ? 'active' : ''}"
            onclick={() => setTheme('light')}
            Description="Light theme."
          ></ButtonSet>
          <ButtonSet
            title="Dark"
            class="setting {$theme === 'dark' ? 'active' : ''}"
            onclick={() => setTheme('dark')}
            Description="Dark theme."
          ></ButtonSet>
          <ButtonSet
            title="System"
            class="setting {$theme === 'system' ? 'active' : ''}"
            onclick={() => setTheme('system')}
            Description="System theme."
          ></ButtonSet>
        </div>
      </div>
    </div>
  </div>
  <!-- Summary Format Section -->
</div>
