<script>
  // @ts-nocheck
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  // @ts-nocheck
</script>

<TextInput
  label={$t('settings.lmstudio_config.endpoint_label')}
  id="Endpoint"
  placeholder={$t('settings.lmstudio_config.endpoint_placeholder')}
  bind:value={settings.lmStudioEndpoint}
  onSave={(value) => {
    console.log('LMStudioConfig: Saving lmStudioEndpoint', value)
    updateSettings({ lmStudioEndpoint: value })
  }}
/>

<TextInput
  label={$t('settings.lmstudio_config.model_label')}
  placeholder={$t('settings.lmstudio_config.model_placeholder')}
  id="model"
  bind:value={settings.selectedLmStudioModel}
  onSave={(value) => {
    console.log('LMStudioConfig: Saving selectedLmStudioModel', value)
    updateSettings({ selectedLmStudioModel: value })
  }}
/>
