<script>
  import ReusableSelect from './ReusableSelect.svelte'
  import { providersConfig } from '../lib/providersConfig.js'
  import { settings } from '../stores/settingsStore.svelte.js'

  const providers = Object.keys(providersConfig).map((key) => ({
    value: key,
    label: providersConfig[key].name,
  }))

  let { value = $bindable() } = $props()

  function handleChange(newValue) {
    value = newValue
    settings.selectedProvider = newValue
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
