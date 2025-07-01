<!-- @ts-nocheck -->
<script>
  import { updateSettings } from '../../stores/settingsStore.svelte.js' // Chỉ import updateSettings
  import { settings } from '../../stores/settingsStore.svelte.js'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import { Combobox } from 'bits-ui'
  import { fade } from 'svelte/transition'

  let {
    openrouterApiKey = $bindable(),
    selectedOpenrouterModel = $bindable(),
  } = $props()

  import { onMount } from 'svelte'
  import { loadSettings } from '../../stores/settingsStore.svelte.js'
  let openrouterModels = $state([])
  let modelLoadError = $state(null)
  let myValue = $state('')
  let isOpen = $state(false)

  function getValue() {
    return myValue || settings.selectedOpenrouterModel || ''
  }

  function setValue(newValue) {
    myValue = newValue
    scheduleSelectedOpenrouterModelSave(newValue)
  }

  onMount(async () => {
    await loadSettings()
    console.log(
      '[OpenrouterConfig] onMount - selectedOpenrouterModel:',
      selectedOpenrouterModel
    )
    myValue = selectedOpenrouterModel || settings.selectedOpenrouterModel || ''
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
        openrouterModels = body.data.map((model) => ({
          value: model.id,
          label: model.id,
        }))
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

  let selectedOpenrouterModelDebounceTimer = null
  let saveStatus = $state('')

  function scheduleSelectedOpenrouterModelSave(newValue) {
    clearTimeout(selectedOpenrouterModelDebounceTimer)
    selectedOpenrouterModelDebounceTimer = setTimeout(() => {
      updateSettings({ selectedOpenrouterModel: newValue })
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }

  const filteredOpenrouterModels = $derived(
    getValue() === ''
      ? openrouterModels
      : openrouterModels.filter((model) =>
          model.label.toLowerCase().includes(getValue().toLowerCase())
        )
  )
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
  <div class="flex items-center gap-1 justify-between">
    <label for="openrouter-model-input" class="block">OpenRouter Model</label>
    {#if saveStatus}
      <p transition:fade class="text-success flex mr-auto">Saved!</p>
    {/if}
  </div>

  {#if modelLoadError}
    <p class="text-red-500">Error loading models: {modelLoadError.message}</p>
  {:else}
    <Combobox.Root
      onOpenChange={(o) => {
        isOpen = o
        if (!o) myValue = ''
      }}
      bind:value={getValue, setValue}
    >
      <div class="relative">
        <Combobox.Input
          oninput={(e) => setValue(e.currentTarget.value)}
          class="select-none font-mono w-full relative text-xs overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-1.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150"
          placeholder="Enter model id or name"
          aria-label="Enter model id or name"
          id="openrouter-model-input"
        />
      </div>
      <Combobox.Portal>
        {#if isOpen}
          <Combobox.Content
            class="focus-override text-text-primary bg-surface-2 outline-hidden z-50 max-h-[var(--bits-combobox-content-available-height)] w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] select-none border border-border"
            sideOffset={4}
            forceMount
          >
            <Combobox.ScrollUpButton
              class="flex w-full py-1 items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  d="M7.47 3.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1-1.06 1.06L8 4.81L5.28 7.53a.75.75 0 0 1-1.06-1.06zm-3.25 8.25l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 1 1-1.06 1.06L8 9.81l-2.72 2.72a.75.75 0 0 1-1.06-1.06"
                  clip-rule="evenodd"
                />
              </svg>
            </Combobox.ScrollUpButton>
            <Combobox.Viewport>
              {#each filteredOpenrouterModels as model, i (i + model.value)}
                <Combobox.Item
                  class=" relative font-mono text-xs data-selected:text-text-primary text-text-secondary data-highlighted:bg-blackwhite/10 outline-hidden flex w-full select-none items-center py-1 pl-3 pr-2 capitalize duration-75"
                  value={model.value}
                  label={model.label}
                  onclick={() => {
                    setValue(model.value)
                    selectedOpenrouterModel = model.value
                  }}
                >
                  {#snippet children({ selected })}
                    <div class="line-clamp-1 truncate">
                      {model.label}
                    </div>
                  {/snippet}
                </Combobox.Item>
              {/each}
            </Combobox.Viewport>
            <Combobox.ScrollDownButton
              class="flex w-full py-1 items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  d="M7.47 12.78a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8 11.19L5.28 8.47a.75.75 0 0 0-1.06 1.06zM4.22 4.53l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8 6.19L5.28 3.47a.75.75 0 0 0-1.06 1.06"
                  clip-rule="evenodd"
                />
              </svg></Combobox.ScrollDownButton
            >
          </Combobox.Content>
        {/if}
      </Combobox.Portal>
    </Combobox.Root>
  {/if}
</div>
