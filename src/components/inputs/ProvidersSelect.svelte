<script>
  import ReusableSelect from '../inputs/ReusableSelect.svelte'
  import { providersConfig } from '../../lib/api/providersConfig.js'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js' // Import updateSettings

  const providers = Object.keys(providersConfig).map((key) => ({
    value: key,
    label: providersConfig[key].name,
  }))

  let { value = $bindable() } = $props()

  function handleChange(newValue) {
    value = newValue
    settings.selectedProvider = newValue
    updateSettings({ selectedProvider: newValue }) // Lưu cài đặt vào storage

    // Cập nhật selectedModel dựa trên provider mới
    switch (newValue) {
      case 'gemini':
        settings.selectedModel = settings.isAdvancedMode
          ? settings.selectedGeminiAdvancedModel
          : settings.selectedGeminiModel
        break
      case 'openrouter':
        settings.selectedModel = settings.selectedOpenrouterModel
        break
      case 'ollama':
        settings.selectedModel = settings.selectedOllamaModel
        break
      case 'openaiCompatible':
        settings.selectedModel = settings.selectedOpenAICompatibleModel
        break
      case 'chatgpt':
        settings.selectedModel = settings.selectedChatgptModel
        break
      case 'deepseek':
        settings.selectedModel = settings.selectedDeepseekModel
        break
      default:
        // Fallback or error handling
        console.warn(`No default model found for provider: ${newValue}`)
        break
    }
    updateSettings({ selectedModel: settings.selectedModel }) // Lưu selectedModel vào storage

    const event = new CustomEvent('change', { detail: newValue })
    dispatchEvent(event)
  }
</script>

<ReusableSelect
  items={providers}
  bindValue={settings.selectedProvider}
  defaultLabel="Google Gemini"
  ariaLabel="Select a provider"
  className="provider"
  onValueChangeCallback={handleChange}
/>
