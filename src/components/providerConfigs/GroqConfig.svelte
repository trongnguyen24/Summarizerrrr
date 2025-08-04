<script>
  // @ts-nocheck
  import TextInput from '../inputs/TextInput.svelte'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  function saveGroqApiKey(key) {
    console.log('GroqConfig: Saving groqApiKey', key)
    updateSettings({ groqApiKey: key })
  }
</script>

<ApiKeyInput
  apiKey={settings.groqApiKey}
  label={$t('settings.groq_config.api_key_label')}
  linkHref="https://console.groq.com/keys"
  linkText={$t('settings.groq_config.get_a_key')}
  onSave={saveGroqApiKey}
/>
<TextInput
  label={$t('settings.groq_config.model_label')}
  placeholder={$t('settings.groq_config.model_placeholder')}
  bind:value={settings.selectedGroqModel}
  onSave={(value) => {
    console.log('GroqConfig: Saving selectedGroqModel', value)
    updateSettings({ selectedGroqModel: value })
  }}
/>
