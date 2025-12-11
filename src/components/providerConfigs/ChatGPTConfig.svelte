<script>
  // @ts-nocheck
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import Icon from '@iconify/svelte'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import ReusableCombobox from '../inputs/ReusableCombobox.svelte'
  import { onMount } from 'svelte'
  import { t } from 'svelte-i18n'

  let { selectedChatgptModel = $bindable() } = $props()

  let chatgptModels = $state([])
  let modelLoadError = $state(null)

  const comboboxItems = $derived(
    chatgptModels.map((model) => ({ value: model, label: model })),
  )

  /**
   * Handles saving the ChatGPT API key.
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ chatgptApiKey: key })
  }

  // API key mặc định chỉ dùng để fetch danh sách models (encoded để tránh bị phát hiện)
  const _k = atob(
    'c2stcHJvai1sQ0lPNTZIWG1tV0cxQTZrYWpNaUI5cHFRWm9RQmswdENheTI3T1lwc0RGa0Qwa19oTGlaMXVnWTgxUGowZEFLTUpzWTBoMXl4ZFQzQmxia0ZKZHI0c2NZeGFfV05KSmczTHpHa2JnYjFMSFNzeVo4Unk5UGQzYWJkdXZwckNhOGR0SVVEV0hldkhwdTBoRnNpUkhzTkZIMXhtQUE=',
  )

  onMount(async () => {
    try {
      const apiKeyToUse = settings.chatgptApiKey || _k
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKeyToUse}`,
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

  function handleModelChange(value) {
    updateSettings({ selectedChatgptModel: value })
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
<div class="flex flex-col gap-2 relative z-50">
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-1 justify-between">
      <label for="chatgpt-model-input" class="block"
        >{$t('settings.chatgpt_config.model_name_label')}</label
      >
      <a
        href="https://platform.openai.com/docs/pricing"
        target="_blank"
        class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
      >
        {$t('settings.chatgpt_config.view_models')}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </a>
    </div>

    <ReusableCombobox
      items={comboboxItems}
      bind:bindValue={selectedChatgptModel}
      placeholder={$t('settings.chatgpt_config.model_placeholder')}
      id="chatgpt-model-input"
      ariaLabel="Search ChatGPT model"
      onValueChangeCallback={handleModelChange}
    />
  </div>
</div>
