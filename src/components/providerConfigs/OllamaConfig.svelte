<script>
  // @ts-nocheck
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  // @ts-nocheck
</script>

<TextInput
  label={$t('settings.ollama_config.endpoint_label')}
  id="Endpoint"
  placeholder="http://127.0.0.1:11434"
  bind:value={settings.ollamaEndpoint}
  onSave={(value) => {
    updateSettings({ ollamaEndpoint: value })
    browser.runtime.sendMessage({
      type: 'UPDATE_OLLAMA_ENDPOINT',
      endpoint: value,
    })
  }}
/>
<TextInput
  label={$t('settings.ollama_config.model_label')}
  placeholder={$t('settings.ollama_config.model_placeholder')}
  id="model"
  bind:value={settings.selectedOllamaModel}
  onSave={(value) => {
    updateSettings({ selectedOllamaModel: value })
  }}
/>
