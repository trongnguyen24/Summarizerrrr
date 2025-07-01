<!-- @ts-nocheck -->
<script>
  import { updateSettings } from '../../stores/settingsStore.svelte.js' // Chỉ import updateSettings
  import { settings } from '../../stores/settingsStore.svelte.js'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import { fade } from 'svelte/transition'

  let {
    openrouterApiKey = $bindable(),
    selectedOpenrouterModel = $bindable(),
  } = $props()

  import { onMount } from 'svelte'
  let openrouterModels = $state([])
  let modelLoadError = $state(null)

  onMount(async () => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          Authorization: settings.openrouterApiKey
            ? `Bearer ${settings.openrouterApiKey}`
            : undefined,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const body = await response.json()
      console.log(body)
      if (body.data) {
        openrouterModels = body.data.map((model) => model.id)
      } else {
        modelLoadError = new Error("Invalid API response: missing 'data' field")
        console.error("Invalid API response: missing 'data' field", body)
      }
    } catch (error) {
      console.error('Could not load OpenRouter models:', error)
      modelLoadError = error
    }
  })

  $effect(() => {
    if (selectedOpenrouterModel) {
      updateSettings({ selectedOpenrouterModel })
    }
  })

  let saveStatus = $state('')
  let openrouterModelDebounceTimer = null

  function scheduleOpenrouterModelSave() {
    clearTimeout(openrouterModelDebounceTimer)
    openrouterModelDebounceTimer = setTimeout(() => {
      updateSettings({
        selectedOpenrouterModel: selectedOpenrouterModel.trim(),
      })
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }
</script>

<div class="flex flex-col gap-2">
  <ApiKeyInput
    apiKey={openrouterApiKey}
    label="OpenRouter API Key"
    linkHref="https://openrouter.ai/keys"
    linkText="Get a key"
  />
</div>
<div class="flex flex-col gap-2">
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-1 justify-between">
      <label for="openrouter-model-input" class="block">OpenRouter Model</label>
      {#if saveStatus}
        <p id="save-status" transition:fade class="text-success flex mr-auto">
          Saved!
        </p>
      {/if}
    </div>
    {#if modelLoadError}
      <p class="text-red-500">Error loading models: {modelLoadError.message}</p>
    {:else}
      <input
        type="text"
        id="openrouter-model-input"
        list="openrouter-model-list"
        bind:value={selectedOpenrouterModel}
        class="select-none font-mono w-full relative text-xs overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-1.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150 openrouter-model-input"
        placeholder="Enter OpenRouter Model"
        oninput={scheduleOpenrouterModelSave}
      />

      <datalist id="openrouter-model-list">
        {#each openrouterModels as model}
          <option value={model}>
            {model}
          </option>
        {/each}
      </datalist>
    {/if}
  </div>
</div>

<style>
  .openrouter-model-input::picker-input {
    appearance: none;
    -moz-appearance: none; /* Firefox */
    -webkit-appearance: none; /* Safari and Chrome */
  }
  #openrouter-model-list::-webkit-calendar-picker-indicator {
    display: none;
  }
  input::-webkit-calendar-picker-indicator {
    display: none !important;
  }
</style>
