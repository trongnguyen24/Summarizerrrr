<script>
  // @ts-nocheck
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'

  // @ts-nocheck
</script>

<div class="flex flex-col gap-2">
  <TextInput
    label="Ollama Endpoint"
    id="Endpoint"
    placeholder="http://localhost:11434"
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
    label="Ollama Model"
    placeholder="llama2"
    id="model"
    bind:value={settings.selectedOllamaModel}
    onSave={(value) => {
      console.log('OllamaConfig: Saving selectedOllamaModel', value)
      updateSettings({ selectedOllamaModel: value })
    }}
  />
</div>
