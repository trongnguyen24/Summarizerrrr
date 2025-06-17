<script>
  // @ts-nocheck
  import TextInput from '../TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'

  /**
   * Handles saving the Ollama endpoint, cleaning it if necessary.
   * @param {string} value The endpoint value from the input.
   */
  function handleOllamaEndpointSave(value) {
    let cleanedEndpoint = value || ''
    if (cleanedEndpoint.endsWith('/api/generate')) {
      cleanedEndpoint = cleanedEndpoint.substring(
        0,
        cleanedEndpoint.length - '/api/generate'.length
      )
    }
    console.log('OllamaConfig: Saving ollamaEndpoint', cleanedEndpoint)
    updateSettings({ ollamaEndpoint: cleanedEndpoint })
  }

  /**
   * Handles saving the selected Ollama model.
   * @param {string} value The model value from the input.
   */
  function handleSelectedOllamaModelSave(value) {
    console.log('OllamaConfig: Saving selectedOllamaModel', value)
    updateSettings({ selectedOllamaModel: value })
  }
</script>

<div class="flex flex-col gap-2">
  <TextInput
    label="Ollama Endpoint"
    id="Endpoint"
    placeholder="http://localhost:11434"
    apiKey={settings.ollamaEndpoint}
    onSave={handleOllamaEndpointSave}
  />
  <TextInput
    label="Ollama Model"
    placeholder="llama2"
    id="model"
    apiKey={settings.selectedOllamaModel}
    onSave={handleSelectedOllamaModelSave}
  />
</div>
