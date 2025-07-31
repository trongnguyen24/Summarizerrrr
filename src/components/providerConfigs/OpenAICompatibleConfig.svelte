<script>
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  // @ts-nocheck
  /**
   * Handles saving the OpenAI-compatible API key.
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ openaiCompatibleApiKey: key })
  }
</script>

<div class="space-y-4">
  <ApiKeyInput
    label={$t('settings.openai_compatible_config.api_key_label')}
    id="openaiCompatibleApiKey"
    apiKey={settings.openaiCompatibleApiKey}
    onSave={handleApiKeySave}
    placeholder={$t('settings.openai_compatible_config.api_key_placeholder')}
  />
  <TextInput
    label={$t('settings.openai_compatible_config.base_url_label')}
    id="openaiCompatibleBaseUrl"
    bind:value={settings.openaiCompatibleBaseUrl}
    onSave={(value) => updateSettings({ openaiCompatibleBaseUrl: value })}
    placeholder={$t('settings.openai_compatible_config.base_url_placeholder')}
  />
  <TextInput
    label={$t('settings.openai_compatible_config.model_name_label')}
    id="openaiCompatibleModel"
    bind:value={settings.selectedOpenAICompatibleModel}
    onSave={(value) => updateSettings({ selectedOpenAICompatibleModel: value })}
    placeholder={$t('settings.openai_compatible_config.model_placeholder')}
  />
</div>
