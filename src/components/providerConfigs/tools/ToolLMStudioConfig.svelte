<script>
  // @ts-nocheck
  import TextInput from '../../inputs/TextInput.svelte'
  import {
    settings,
    updateSettings,
  } from '../../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  let { selectedModel = $bindable(), onModelChange = () => {} } = $props()

  /**
   * Handles endpoint change - updates GLOBAL settings
   * @param {string} value The endpoint value from the input.
   */
  function handleEndpointChange(value) {
    console.log('ToolLMStudioConfig: Saving lmStudioEndpoint', value)
    updateSettings({ lmStudioEndpoint: value })
  }

  /**
   * Handles model change - calls tool-specific callback and saves to global settings
   * @param {string} value The model value from the input.
   */
  function handleModelChange(value) {
    console.log('ToolLMStudioConfig: Model changed to', value)
    // Call callback to notify parent component
    onModelChange(value)
    // Also save to global settings
    updateSettings({ selectedLmStudioModel: value })
  }
</script>

<TextInput
  label={$t('settings.lmstudio_config.endpoint_label')}
  id="Endpoint"
  placeholder={$t('settings.lmstudio_config.endpoint_placeholder')}
  bind:value={settings.lmStudioEndpoint}
  onSave={handleEndpointChange}
/>

<TextInput
  label={$t('settings.lmstudio_config.model_label')}
  placeholder={$t('settings.lmstudio_config.model_placeholder')}
  id="model"
  bind:value={selectedModel}
  onSave={handleModelChange}
/>
