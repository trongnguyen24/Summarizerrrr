<script>
  // @ts-nocheck
  import ApiKeyInput from '../ApiKeyInput.svelte'
  import TextInput from '../TextInput.svelte'
  import { updateSettings } from '../../stores/settingsStore.svelte'

  let { ollamaEndpoint = $bindable(), selectedOllamaModel = $bindable() } =
    $props()

  $effect(() => {
    let cleanedEndpoint = ollamaEndpoint
    if (cleanedEndpoint.endsWith('/api/generate')) {
      cleanedEndpoint = cleanedEndpoint.substring(
        0,
        cleanedEndpoint.length - '/api/generate'.length
      )
    }
    updateSettings({
      ollamaEndpoint: cleanedEndpoint,
      selectedOllamaModel: selectedOllamaModel,
    })
  })
</script>

<div class="flex flex-col gap-2">
  <TextInput
    label="Ollama Endpoint"
    placeholder="http://localhost:11434"
    bind:value={ollamaEndpoint}
  />
  <TextInput
    label="Ollama Model"
    placeholder="llama2"
    bind:value={selectedOllamaModel}
  />
</div>
