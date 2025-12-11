<script>
  // @ts-nocheck
  import TextInput from '../../inputs/TextInput.svelte'
  import ReusableCombobox from '../../inputs/ReusableCombobox.svelte'
  import {
    settings,
    updateSettings,
  } from '../../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'

  let { selectedModel = $bindable(''), onModelChange = () => {} } = $props()

  let ollamaModels = $state([])
  let endpointDebounceTimer = null

  const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434/'

  const comboboxItems = $derived(
    ollamaModels.map((model) => ({ value: model, label: model })),
  )

  async function fetchOllamaModels(endpoint) {
    if (!endpoint) return
    try {
      const response = await fetch(`${endpoint}api/tags`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      ollamaModels = data.models.map((model) => model.name)
    } catch (error) {
      console.error('Error fetching Ollama models:', error)
      ollamaModels = []
    }
  }

  function resetOllamaEndpoint() {
    settings.ollamaEndpoint = DEFAULT_OLLAMA_ENDPOINT
    // Also trigger the update in the store
    handleEndpointInput(DEFAULT_OLLAMA_ENDPOINT)
  }

  function handleEndpointInput(value) {
    clearTimeout(endpointDebounceTimer)
    endpointDebounceTimer = setTimeout(() => {
      let normalizedValue = value.trim()
      if (normalizedValue && !normalizedValue.endsWith('/')) {
        normalizedValue += '/'
      }
      updateSettings({ ollamaEndpoint: normalizedValue })
    }, 500) // 500ms debounce
  }

  function handleModelChange(value) {
    onModelChange(value)
  }

  // Fetch models when the component mounts and whenever the endpoint changes
  $effect(() => {
    fetchOllamaModels(settings.ollamaEndpoint)
  })
</script>

<div class="relative w-full">
  <TextInput
    label={$t('settings.ollama_config.endpoint_label')}
    id="Endpoint"
    placeholder={DEFAULT_OLLAMA_ENDPOINT}
    bind:value={settings.ollamaEndpoint}
    oninput={(e) => handleEndpointInput(e.target.value)}
  />
  <button
    class="absolute right-2 top-8 p-0.5 text-text-secondary hover:text-text-primary transition-colors"
    onclick={resetOllamaEndpoint}
    title={$t('settings.ollama_config.reset_endpoint_tooltip')}
  >
    <Icon icon="heroicons:arrow-path-16-solid" width="16" height="16" />
  </button>
</div>

<div class="flex flex-col gap-2 relative z-50">
  <label
    for="ollama-model-input"
    class="block text-xs font-medium text-text-primary"
    >{$t('settings.ollama_config.model_label')}</label
  >
  <ReusableCombobox
    items={comboboxItems}
    bind:bindValue={selectedModel}
    placeholder={$t('settings.ollama_config.model_placeholder')}
    id="ollama-model-input"
    ariaLabel="Search Ollama model"
    onValueChangeCallback={handleModelChange}
  />
</div>
