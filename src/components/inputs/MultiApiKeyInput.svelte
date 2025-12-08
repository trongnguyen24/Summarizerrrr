<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import {
    addGeminiApiKey,
    removeGeminiApiKey,
    setActiveGeminiApiKey,
    MAX_API_KEYS,
  } from '@/services/apiKeyRotationService.js'
  import { t } from 'svelte-i18n'

  let {
    apiKeys = $bindable([]),
    currentIndex = $bindable(0),
    label = '',
    linkHref = '',
    linkText = '',
    onKeysChange = () => {},
  } = $props()

  let newKeyInput = $state('')
  let showNewKeyInput = $state(false)
  let showNewKey = $state(false)
  let saveStatus = $state('')

  /**
   * Masks an API key for display (shows last 4 characters)
   */
  function maskApiKey(key) {
    if (!key || key.length < 8) return '••••••••'
    return '••••••••••••' + key.slice(-4)
  }

  /**
   * Handles adding a new API key
   */
  async function handleAddKey() {
    if (!newKeyInput.trim()) return

    const success = await addGeminiApiKey(newKeyInput)
    if (success) {
      newKeyInput = ''
      showNewKeyInput = false
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
      onKeysChange()
    }
  }

  /**
   * Handles removing an API key
   */
  async function handleRemoveKey(index) {
    const success = await removeGeminiApiKey(index)
    if (success) {
      onKeysChange()
    }
  }

  /**
   * Handles setting a key as active
   */
  async function handleSetActive(index) {
    const success = await setActiveGeminiApiKey(index)
    if (success) {
      onKeysChange()
    }
  }

  /**
   * Toggles visibility of new key input
   */
  function toggleNewKeyInput() {
    showNewKeyInput = !showNewKeyInput
    if (!showNewKeyInput) {
      newKeyInput = ''
      showNewKey = false
    }
  }

  // Check if we can add more keys
  const canAddMore = $derived(apiKeys.length < MAX_API_KEYS)
</script>

<div class="flex flex-col gap-2">
  <!-- Header with label and link -->
  <div class="flex items-center gap-1 justify-between">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block">
      {label}
      <span class="text-xs text-muted">({apiKeys.length}/{MAX_API_KEYS})</span>
    </label>
    {#if saveStatus}
      <p
        id="save-status"
        transition:fade
        class="text-success flex mr-auto ml-2"
      >
        {$t('settings.gemini_basic_config.saved_status') || 'Saved!'}
      </p>
    {/if}
    {#if linkHref && linkText}
      <a
        href={linkHref}
        target="_blank"
        class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
      >
        {linkText}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </a>
    {/if}
  </div>

  <!-- List of API keys -->
  <div class="flex flex-col gap-1.5">
    {#each apiKeys as key, index (index)}
      <div
        class="relative flex items-center gap-2 h-8.5 px-3 bg-muted/5 border border-border rounded transition-colors {index ===
        currentIndex
          ? 'border-primary/50 bg-primary/5'
          : ''}"
        transition:fade={{ duration: 150 }}
      >
        <!-- Key display -->
        <span class="flex-1 text-sm text-text-secondary font-mono">
          {maskApiKey(key)}
        </span>

        <!-- Active badge -->
        {#if index === currentIndex}
          <span
            class="text-xs text-primary font-medium px-1.5 py-0.5 bg-primary/10 rounded"
          >
            {$t('settings.gemini_basic_config.active_key') || 'Active'}
          </span>
        {:else}
          <!-- Set active button -->
          <button
            class="text-xs text-muted hover:text-text-primary cursor-pointer transition-colors"
            onclick={() => handleSetActive(index)}
            title={$t('settings.gemini_basic_config.set_active') ||
              'Set as active'}
          >
            {$t('settings.gemini_basic_config.set_active') || 'Use'}
          </button>
        {/if}

        <!-- Remove button -->
        {#if apiKeys.length > 1}
          <button
            class="size-5 text-muted hover:text-error cursor-pointer transition-colors grid place-items-center"
            onclick={() => handleRemoveKey(index)}
            title={$t('settings.gemini_basic_config.remove_api_key') ||
              'Remove'}
          >
            <Icon width={14} icon="heroicons:x-mark-16-solid" />
          </button>
        {/if}
      </div>
    {/each}

    <!-- No keys message -->
    {#if apiKeys.length === 0}
      <p class="text-sm text-muted py-2">
        {$t('settings.gemini_basic_config.no_api_keys') || 'No API keys added'}
      </p>
    {/if}

    <!-- New key input -->
    {#if showNewKeyInput}
      <div
        class="relative flex items-center gap-2"
        transition:fade={{ duration: 150 }}
      >
        <div
          class="relative flex-1 h-8.5 bg-muted/5 border border-border hover:border-blackwhite/15 focus-within:border-primary/50 transition-colors overflow-hidden rounded"
        >
          <input
            type={showNewKey ? 'text' : 'password'}
            placeholder="Enter new API key..."
            bind:value={newKeyInput}
            class="absolute top-0 left-0 w-[133.33%] h-[133.33%] pl-3 pr-12 text-base text-text-primary bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted origin-top-left scale-75"
            onkeypress={(e) => {
              if (e.key === 'Enter') handleAddKey()
            }}
          />
          <!-- Show/hide password button -->
          <button
            class="absolute size-6 text-muted right-1 top-1.25 grid place-items-center cursor-pointer"
            onclick={() => (showNewKey = !showNewKey)}
            type="button"
          >
            {#if !showNewKey}
              <Icon width={16} icon="heroicons:eye-slash-16-solid" />
            {:else}
              <Icon width={16} icon="heroicons:eye-16-solid" />
            {/if}
          </button>
        </div>

        <!-- Add button -->
        <button
          class="h-8.5 px-3 bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors cursor-pointer text-sm font-medium"
          onclick={handleAddKey}
          disabled={!newKeyInput.trim()}
        >
          {$t('settings.gemini_basic_config.add_api_key') || 'Add'}
        </button>

        <!-- Cancel button -->
        <button
          class="size-8.5 text-muted hover:text-text-primary grid place-items-center cursor-pointer transition-colors"
          onclick={toggleNewKeyInput}
        >
          <Icon width={18} icon="heroicons:x-mark-16-solid" />
        </button>
      </div>
    {/if}

    <!-- Add new key button -->
    {#if !showNewKeyInput && canAddMore}
      <button
        class="flex items-center justify-center gap-1.5 h-8.5 border border-dashed border-muted/50 hover:border-primary/50 hover:bg-primary/5 rounded transition-colors cursor-pointer text-sm text-muted hover:text-primary"
        onclick={toggleNewKeyInput}
      >
        <Icon width={16} icon="heroicons:plus-16-solid" />
        {$t('settings.gemini_basic_config.add_api_key') || 'Add API Key'}
      </button>
    {/if}

    <!-- Max keys reached message -->
    {#if apiKeys.length >= MAX_API_KEYS}
      <p class="text-xs text-muted text-center py-1">
        {$t('settings.gemini_basic_config.max_keys_reached', {
          values: { max: MAX_API_KEYS },
        }) || `Maximum ${MAX_API_KEYS} keys reached`}
      </p>
    {/if}
  </div>
</div>
