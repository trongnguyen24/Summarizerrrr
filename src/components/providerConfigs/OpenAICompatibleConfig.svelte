<script>
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'

  /**
   * Handles saving the OpenAI-compatible API key.
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ openaiCompatibleApiKey: key })
  }

  /**
   * Handles saving the OpenAI-compatible Base URL.
   * @param {string} value The Base URL value from the input.
   */
  function handleBaseUrlSave(value) {
    updateSettings({ openaiCompatibleBaseUrl: value })
  }

  /**
   * Handles saving the selected OpenAI-compatible Model Name.
   * @param {string} value The Model Name value from the input.
   */
  function handleModelNameSave(value) {
    updateSettings({ selectedOpenAICompatibleModel: value })
  }
</script>

<div class="space-y-4">
  <ApiKeyInput
    label="API Key"
    id="openaiCompatibleApiKey"
    apiKey={settings.openaiCompatibleApiKey}
    onSave={handleApiKeySave}
    placeholder="Enter your OpenAI-compatible API key"
  />
  <TextInput
    label="Base URL"
    id="openaiCompatibleBaseUrl"
    apiKey={settings.openaiCompatibleBaseUrl}
    onSave={handleBaseUrlSave}
    placeholder="https://api.example.com/v1"
  />
  <TextInput
    label="Model Name"
    id="openaiCompatibleModel"
    apiKey={settings.selectedOpenAICompatibleModel}
    onSave={handleModelNameSave}
    placeholder="gpt-3.5-turbo"
  />
</div>
