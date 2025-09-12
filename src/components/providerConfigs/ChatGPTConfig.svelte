<script>
  // @ts-nocheck
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import { onMount } from 'svelte'
  import { t } from 'svelte-i18n'

  let { selectedChatgptModel = $bindable() } = $props()

  let chatgptModels = $state([])
  let modelLoadError = $state(null)

  /**
   * Handles saving the ChatGPT API key.
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ chatgptApiKey: key })
  }

  onMount(async () => {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.chatgptApiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const body = await response.json()

      if (body.data) {
        chatgptModels = body.data.map((model) => model.id)
      } else {
        modelLoadError = new Error("Invalid API response: missing 'data' field")
        console.error("Invalid API response: missing 'data' field", body)
      }
    } catch (error) {
      console.error('Could not load ChatGPT models:', error)
      modelLoadError = error
    }
  })

  $effect(() => {
    if (selectedChatgptModel) {
      updateSettings({ selectedChatgptModel })
    }
  })

  let saveStatus = $state('')
  let chatgptModelDebounceTimer = null

  function scheduleChatgptModelSave(value) {
    clearTimeout(chatgptModelDebounceTimer)
    chatgptModelDebounceTimer = setTimeout(() => {
      updateSettings({
        selectedChatgptModel: value.trim(),
      })
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }
</script>

<ApiKeyInput
  label={$t('settings.chatgpt_config.api_key_label')}
  id="chatgptApiKey"
  apiKey={settings.chatgptApiKey}
  onSave={handleApiKeySave}
  placeholder={$t('settings.chatgpt_config.api_key_placeholder')}
  linkHref="https://platform.openai.com/api-keys"
  linkText={$t('settings.groq_config.get_a_key')}
/>
<div class="flex flex-col gap-2">
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-1 justify-between">
      <label for="chatgpt-model-input" class="block"
        >{$t('settings.chatgpt_config.model_name_label')}</label
      >
      {#if saveStatus}
        <p id="save-status" transition:fade class="text-success flex mr-auto">
          {$t('settings.chatgpt_config.saved_status')}
        </p>
      {/if}
      <a
        href="https://platform.openai.com/docs/pricing"
        target="_blank"
        class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
      >
        {$t('settings.chatgpt_config.view_models')}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </a>
    </div>

    <input
      type="text"
      id="chatgpt-model-input"
      list="chatgpt-model-list"
      bind:value={selectedChatgptModel}
      class="select-none font-mono w-full relative text-xs overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-2 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150 chatgpt-model-input"
      placeholder={$t('settings.chatgpt_config.model_placeholder')}
      oninput={(e) => scheduleChatgptModelSave(e.target.value)}
    />

    <datalist id="chatgpt-model-list">
      {#each chatgptModels as model}
        <option value={model}>
          {model}
        </option>
      {/each}
    </datalist>
  </div>
</div>

<style>
  .chatgpt-model-input::picker-input {
    appearance: none;
    -moz-appearance: none; /* Firefox */
    -webkit-appearance: none; /* Safari and Chrome */
  }

  input::-webkit-calendar-picker-indicator {
    display: none !important;
  }
</style>
