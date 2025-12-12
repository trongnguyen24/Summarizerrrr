<script>
  // @ts-nocheck
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  /**
   * Handles saving the Chutes API key.
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ chutesApiKey: key })
  }
</script>

<ApiKeyInput
  label={$t('settings.chutes_config.api_key_label')}
  id="chutesApiKey"
  apiKey={settings.chutesApiKey}
  onSave={handleApiKeySave}
  placeholder={$t('settings.chutes_config.api_key_placeholder')}
  linkHref="https://chutes.ai"
  linkText={$t('settings.groq_config.get_a_key')}
/>
<TextInput
  label={$t('settings.chutes_config.model_name_label')}
  id="chutesModel"
  bind:value={settings.selectedChutesModel}
  onSave={(value) => updateSettings({ selectedChutesModel: value })}
  placeholder={$t('settings.chutes_config.model_placeholder')}
/>
