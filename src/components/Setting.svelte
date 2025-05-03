<script>
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte' // Import Icon
  import { theme, setTheme } from '../stores/themeStore.svelte' // Import theme store and setTheme function

  let apiKey = $state('')
  let showApiKey = $state(false) // Track API key visibility
  let summaryLength = $state('medium')
  let summaryLang = $state('vi') // Changed default to 'vi' to match options
  let summaryFormat = $state('heading') // Changed default to 'heading' to match options
  let selectedModel = $state('gemini-1.5-flash') // Add state for selected model
  let saveStatus = $state('')
  let apiKeyDebounceTimer = null // Timer for debouncing API key save

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
        ],
        (result) => {
          if (result.geminiApiKey) apiKey = result.geminiApiKey
          // Ensure defaults are set if nothing is in storage yet
          summaryLength = result.summaryLength || 'medium'
          summaryLang = result.summaryLang || 'vi'
          summaryFormat = result.summaryFormat || 'paragraph'
          selectedModel = result.selectedModel || 'gemini-1.5-flash' // Load selected model
        }
      )
    } else {
      console.warn('Chrome storage API is not available.')
      // Set defaults for dev environment
      apiKey = localStorage.getItem('geminiApiKey_dev') || '' // Load from local storage for dev
      summaryLength = 'medium'
      summaryLang = 'vi'
      summaryFormat = 'paragraph'
      selectedModel =
        localStorage.getItem('selectedModel_dev') || 'gemini-1.5-flash' // Load selected model for dev
    }
  })

  // Debounce function for API key saving
  function scheduleApiKeySave() {
    clearTimeout(apiKeyDebounceTimer)
    apiKeyDebounceTimer = setTimeout(() => {
      saveApiKey()
    }, 800) // Delay of 0.8 seconds
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
      // Also save to local storage for dev environment
      if (key === 'geminiApiKey' && typeof localStorage !== 'undefined') {
        localStorage.setItem('geminiApiKey_dev', value)
        console.log('Saved API Key to localStorage (dev)')
      }
      if (key === 'selectedModel' && typeof localStorage !== 'undefined') {
        localStorage.setItem('selectedModel_dev', value)
        console.log('Saved selectedModel to localStorage (dev)')
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
  class="font-mono text-text-primary dark:text-muted text-xs bg-surface-2 dark:bg-background backdrop-blur-3xl overflow-hidden border border-border/50 rounded-2xl w-full flex-shrink-0 flex flex-col"
>
  <div
    class="px-4 bg-surface-1 dark:bg-background backdrop-blur-3xl py-2 flex border-t border-border rounded-t-2xl items-center justify-between border-b border-b-border/50"
  >
    <h2 class="  ">Settings</h2>
  </div>

  <!-- API Key Section -->
  <div class="p-4 flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-1 justify-between">
        <label for="api-key" class="block dark:text-muted">Gemini API Key</label
        >
        {#if saveStatus}
          <p id="save-status" transition:fade class="text-success mr-auto">
            <!-- {saveStatus} -->
            <Icon width={12} icon="heroicons:check-circle-16-solid" />
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
        <input
          type={showApiKey ? 'text' : 'password'}
          id="api-key"
          bind:value={apiKey}
          class="w-full pl-3 pr-9 py-1.5 h-10 bg-surface-1/50 border border-border rounded-md focus:outline-none focus:ring-1 placeholder:text-muted"
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
      <label class="block">Gemini Model</label>
      <div class="flex p-0.5 gap-1">
        <button
          onclick={() => updateSetting('selectedModel', 'gemini-1.5-flash')}
          class="setting-lang-btn {selectedModel === 'gemini-1.5-flash'
            ? 'active'
            : ''}"
          title="gemini-1.5-flash"
        >
          1.5 flash
        </button>
        <button
          onclick={() => updateSetting('selectedModel', 'gemini-2.0-flash')}
          class="setting-lang-btn {selectedModel === 'gemini-2.0-flash'
            ? 'active'
            : ''}"
          title="gemini-2.0-flash"
        >
          2.0 flash
        </button>
        <button
          onclick={() =>
            updateSetting('selectedModel', 'gemini-2.5-flash-preview-04-17')}
          class="setting-lang-btn {selectedModel ===
          'gemini-2.5-flash-preview-04-17'
            ? 'active'
            : ''}"
          title="gemini-2.5-flash-preview-04-17"
        >
          2.5 flash
        </button>
      </div>
    </div>

    <!-- Summary Length Section -->
    <div class="flex flex-col gap-1">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block">Summary Size</label>
      <div class="flex gap-2 w-fit">
        <button
          onclick={() => updateSetting('summaryLength', 'short')}
          class="setting-length-btn {summaryLength === 'short' ? 'active' : ''}"
          title="Short"
        >
          <!-- <Icon width={16} icon="heroicons:minus" /> -->
          <span class="text-xs">Short</span>
        </button>
        <button
          onclick={() => updateSetting('summaryLength', 'medium')}
          class="setting-length-btn {summaryLength === 'medium'
            ? 'active'
            : ''}"
          title="Medium"
        >
          <!-- <Icon width={16} icon="heroicons:bars-2" /> -->
          <span class="text-xs">Medium</span>
        </button>
        <button
          onclick={() => updateSetting('summaryLength', 'long')}
          class="setting-length-btn {summaryLength === 'long' ? 'active' : ''}"
          title="Long"
        >
          <!-- <Icon width={16} icon="heroicons:bars-3" /> -->
          <span class="text-xs">Long</span>
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block">Summary Format</label>
      <div class="flex gap-1">
        <button
          onclick={() => updateSetting('summaryFormat', 'heading')}
          class="setting-format-btn {summaryFormat === 'heading'
            ? 'active'
            : ''}"
          title="Heading"
        >
          <!-- <Icon width={16} icon="heroicons:list-bullet-16-solid" /> -->
          <span class="text-xs">Heading</span>
        </button>
        <button
          onclick={() => updateSetting('summaryFormat', 'paragraph')}
          class="setting-format-btn {summaryFormat === 'paragraph'
            ? 'active'
            : ''}"
          title="Paragraph"
        >
          <!-- <Icon width={16} icon="heroicons:bars-4" /> -->
          <span class="text-xs">Paragraph</span>
        </button>
      </div>
    </div>

    <!-- Summary Language Section -->
    <div class="flex flex-col gap-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block">Language output</label>
      <div class="flex p-0.5 gap-1">
        <button
          onclick={() => updateSetting('summaryLang', 'vi')}
          class="setting-lang-btn {summaryLang === 'vi' ? 'active' : ''}"
          title="Vietnamese"
        >
          Vietnamese
        </button>
        <button
          onclick={() => updateSetting('summaryLang', 'en')}
          class="setting-lang-btn {summaryLang === 'en' ? 'active' : ''}"
          title="English"
        >
          English
        </button>
        <!-- Add button for other languages if needed -->
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block">Theme</label>
      <div class="flex p-0.5 gap-1">
        <button
          onclick={() => setTheme('light')}
          class="setting-lang-btn {$theme === 'light' ? 'active' : ''}"
          title="Light"
        >
          Light
        </button>
        <button
          onclick={() => setTheme('dark')}
          class="setting-lang-btn {$theme === 'dark' ? 'active' : ''}"
          title="Dark"
        >
          Dark
        </button>
        <button
          onclick={() => setTheme('system')}
          class="setting-lang-btn {$theme === 'system' ? 'active' : ''}"
          title="System"
        >
          System
        </button>
      </div>
    </div>
  </div>
  <!-- Summary Format Section -->
</div>

<style>
  /* Remove unused .active class if present */
  /* Tailwind handles the active state visually now */
</style>
