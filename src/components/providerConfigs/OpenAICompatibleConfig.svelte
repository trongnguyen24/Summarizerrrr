<script>
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'

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
    label="API Key"
    id="openaiCompatibleApiKey"
    apiKey={settings.openaiCompatibleApiKey}
    onSave={handleApiKeySave}
    placeholder="API Key"
  />
  <TextInput
    label="Base URL"
    id="openaiCompatibleBaseUrl"
    bind:value={settings.openaiCompatibleBaseUrl}
    onSave={(value) => updateSettings({ openaiCompatibleBaseUrl: value })}
    placeholder="http://127.0.0.1:1234/v1/chat/completions"
  />
  <TextInput
    label="Model Name"
    id="openaiCompatibleModel"
    bind:value={settings.selectedOpenAICompatibleModel}
    onSave={(value) => updateSettings({ selectedOpenAICompatibleModel: value })}
    placeholder="qwen/qwen2.5-vl-7b"
  />
</div>
