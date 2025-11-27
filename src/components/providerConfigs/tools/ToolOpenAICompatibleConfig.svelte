<script>
  // @ts-nocheck
  import ApiKeyInput from '../../inputs/ApiKeyInput.svelte'
  import TextInput from '../../inputs/TextInput.svelte'
  import { updateSettings } from '../../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  let {
    apiKey = $bindable(),
    selectedModel = $bindable(),
    onModelChange = () => {},
  } = $props()

  /**
   * Handles saving the OpenAI-compatible API key to GLOBAL settings
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ openaiCompatibleApiKey: key })
  }

  /**
   * Handles base URL change - updates GLOBAL settings
   * @param {string} value The base URL value from the input.
   */
  function handleBaseUrlSave(value) {
    updateSettings({ openaiCompatibleBaseUrl: value })
  }

  /**
   * Handles model change - calls tool-specific callback and saves to global settings
   * @param {string} value The model value from the input.
   */
  function handleModelChange(value) {
    // Call callback to notify parent component
    onModelChange(value)
    // Also save to global settings
    updateSettings({ selectedOpenAICompatibleModel: value })
  }
</script>

<ApiKeyInput
  bind:apiKey
  label={$t('settings.openai_compatible_config.api_key_label')}
  onSave={handleApiKeySave}
></ApiKeyInput>

<TextInput
  label={$t('settings.openai_compatible_config.base_url_label')}
  placeholder={$t('settings.openai_compatible_config.base_url_placeholder')}
  onSave={handleBaseUrlSave}
/>

<TextInput
  label={$t('settings.openai_compatible_config.model_name_label')}
  placeholder={$t('settings.openai_compatible_config.model_placeholder')}
  bind:value={selectedModel}
  onSave={handleModelChange}
/>
