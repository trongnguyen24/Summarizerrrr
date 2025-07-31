<script>
  // @ts-nocheck
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  // @ts-nocheck
</script>

<div class="flex flex-col gap-2">
  <TextInput
    label={$t('settings.ollama_config.endpoint_label')}
    id="Endpoint"
    placeholder={$t('settings.ollama_config.endpoint_placeholder')}
    bind:value={settings.ollamaEndpoint}
    onSave={(value) => {
      let cleanedEndpoint = value || ''
      if (cleanedEndpoint.endsWith('/api/generate')) {
        cleanedEndpoint = cleanedEndpoint.substring(
          0,
          cleanedEndpoint.length - '/api/generate'.length
        )
      }
      console.log('OllamaConfig: Saving ollamaEndpoint', cleanedEndpoint)
      updateSettings({ ollamaEndpoint: cleanedEndpoint })
    }}
  />
  <TextInput
    label={$t('settings.ollama_config.model_label')}
    placeholder={$t('settings.ollama_config.model_placeholder')}
    id="model"
    bind:value={settings.selectedOllamaModel}
    onSave={(value) => {
      console.log('OllamaConfig: Saving selectedOllamaModel', value)
      updateSettings({ selectedOllamaModel: value })
    }}
  />
</div>
