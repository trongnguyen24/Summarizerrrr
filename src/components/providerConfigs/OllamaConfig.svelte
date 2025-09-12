<script>
  // @ts-nocheck
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { fade } from 'svelte/transition'
  import { t } from 'svelte-i18n'
  import ButtonIcon from '../buttons/ButtonIcon.svelte'
  import Icon from '@iconify/svelte'
  import { onMount } from 'svelte'

  // @ts-nocheck

  let ollamaModels = $state([])
  let saveStatus = $state('')
  let ollamaModelDebounceTimer = null

  const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434/'

  /**
   * Schedules saving the selected Ollama model with a debounce.
   * @param {string} value - The value of the selected Ollama model.
   */
  function scheduleOllamaModelSave(value) {
    clearTimeout(ollamaModelDebounceTimer)
    ollamaModelDebounceTimer = setTimeout(() => {
      updateSettings({
        selectedOllamaModel: value.trim(),
      })
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }

  function resetOllamaEndpoint() {
    settings.ollamaEndpoint = DEFAULT_OLLAMA_ENDPOINT
    updateSettings({ ollamaEndpoint: DEFAULT_OLLAMA_ENDPOINT })
    browser.runtime.sendMessage({
      type: 'UPDATE_OLLAMA_ENDPOINT',
      endpoint: DEFAULT_OLLAMA_ENDPOINT,
    })
    console.log(
      'OllamaConfig: Reset ollamaEndpoint to default',
      DEFAULT_OLLAMA_ENDPOINT
    )
  }

  onMount(async () => {
    try {
      const response = await fetch(`${settings.ollamaEndpoint}api/tags`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      ollamaModels = data.models.map((model) => model.name)
    } catch (error) {
      console.error('Error fetching Ollama models:', error)
      // Optionally, set an error status or show a message to the user
    }
  })
</script>

<div class=" relative w-full">
  <TextInput
    label={$t('settings.ollama_config.endpoint_label')}
    id="Endpoint"
    placeholder={DEFAULT_OLLAMA_ENDPOINT}
    bind:value={settings.ollamaEndpoint}
    onSave={(value) => {
      // Chuẩn hóa URL: đảm bảo có dấu '/' ở cuối nếu không có
      let normalizedValue = value.trim()
      if (normalizedValue && !normalizedValue.endsWith('/')) {
        normalizedValue += '/'
      }
      console.log('OllamaConfig: Saving ollamaEndpoint', normalizedValue)
      updateSettings({ ollamaEndpoint: normalizedValue })
      browser.runtime.sendMessage({
        type: 'UPDATE_OLLAMA_ENDPOINT',
        endpoint: normalizedValue,
      })
    }}
  />
  <button class="absolute right-2 p-0.5 top-8" onclick={resetOllamaEndpoint}>
    <Icon icon="heroicons:arrow-path-16-solid" width="16" height="16" />
  </button>
</div>
<div class="flex flex-col gap-2">
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-1 justify-between">
      <label for="ollama-model-input" class="block"
        >{$t('settings.ollama_config.model_label')}</label
      >
      {#if saveStatus}
        <p id="save-status" transition:fade class="text-success flex mr-auto">
          Save!
        </p>
      {/if}
    </div>
    <input
      type="text"
      id="ollama-model-input"
      list="ollama-model-list"
      bind:value={settings.selectedOllamaModel}
      class="select-none font-mono w-full relative text-xs overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-2 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150 ollama-model-input"
      placeholder={$t('settings.ollama_config.model_placeholder')}
      oninput={(e) => scheduleOllamaModelSave(e.target.value)}
    />

    <datalist id="ollama-model-list">
      {#each ollamaModels as model}
        <option value={model}>
          {model}
        </option>
      {/each}
    </datalist>
  </div>
</div>

<style>
  .ollama-model-input::picker-input {
    appearance: none;
    -moz-appearance: none; /* Firefox */
    -webkit-appearance: none; /* Safari and Chrome */
  }

  input::-webkit-calendar-picker-indicator {
    display: none !important;
  }
</style>
