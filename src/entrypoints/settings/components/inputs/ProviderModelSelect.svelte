<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import ReusableCombobox from '@/entrypoints/settings/components/inputs/ReusableCombobox.svelte'
  import {
    FALLBACK_PROVIDER_MODELS,
    fetchProviderModels,
  } from '@/lib/api/providerModelService.js'
  import {
    sortFreeTierFirst,
    toModelItem,
  } from '@/lib/providers/geminiFreeTier.js'

  let {
    providerId,
    apiKey = '',
    selectedModel = $bindable(),
    label,
    inputId,
    placeholder,
    ariaLabel,
    modelInfoHref = '',
    modelInfoText = '',
    allowCustomValue = true,
    onModelChange = () => {},
  } = $props()

  let models = $state([])
  let isLoading = $state(false)
  let loadError = $state(null)
  let requestId = 0

  const badgeLabel = $derived(
    $t('settings.feature_model_picker.free_tier_badge', { default: 'Free' }),
  )

  const items = $derived(
    models.map((model) => toModelItem(providerId, model, badgeLabel)),
  )

  async function loadModels() {
    const currentRequestId = ++requestId
    isLoading = true
    loadError = null

    try {
      const loadedModels = sortFreeTierFirst(
        providerId,
        await fetchProviderModels(providerId, apiKey),
      )
      if (currentRequestId !== requestId) return

      models = selectedModel && !loadedModels.includes(selectedModel)
        ? [selectedModel, ...loadedModels]
        : loadedModels
    } catch (error) {
      if (currentRequestId !== requestId) return

      loadError = error
      const fallbackModels = sortFreeTierFirst(
        providerId,
        FALLBACK_PROVIDER_MODELS[providerId] || [],
      )
      models = selectedModel && !fallbackModels.includes(selectedModel)
        ? [selectedModel, ...fallbackModels]
        : fallbackModels
      console.warn(`[ProviderModelSelect] Could not load ${providerId} models:`, error)
    } finally {
      if (currentRequestId === requestId) isLoading = false
    }
  }

  $effect(() => {
    providerId
    apiKey
    loadModels()
  })
</script>

<div class="flex flex-col gap-2 relative z-50">
  <div class="flex items-center justify-between gap-2">
    <label for={inputId} class="block text-xs font-medium text-text-primary">
      {label}
    </label>
    <div class="flex items-center gap-1">
      {#if modelInfoHref}
        <a
          href={modelInfoHref}
          target="_blank"
          rel="noreferrer"
          class="flex items-center gap-0.5 text-xs text-primary outline-gray-500 hover:underline"
        >
          {modelInfoText}
          <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
        </a>
      {/if}
      <button
        type="button"
        class="grid size-6 place-items-center text-muted transition-colors hover:text-text-primary disabled:cursor-wait disabled:opacity-50"
        onclick={loadModels}
        disabled={isLoading}
        aria-label={`Refresh ${providerId} models`}
        title={loadError ? `${loadError.message}. Using fallback models.` : 'Refresh models'}
      >
        <Icon
          width={14}
          icon="heroicons:arrow-path-16-solid"
          class={isLoading ? 'is-loading' : ''}
        />
      </button>
    </div>
  </div>

  <ReusableCombobox
    {items}
    bind:bindValue={selectedModel}
    {placeholder}
    id={inputId}
    {ariaLabel}
    {allowCustomValue}
    onValueChangeCallback={onModelChange}
  />
</div>

<style>
  :global(.is-loading) {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
