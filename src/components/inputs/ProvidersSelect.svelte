<script>
  import ReusableSelect from '../inputs/ReusableSelect.svelte'
  import { providersConfig } from '../../lib/providersConfig.js'
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
