<script>
  // @ts-nocheck
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import ReusableSelect from './ReusableSelect.svelte'

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'vi', label: 'Vietnamese' },
    { value: 'es', label: 'Spanish' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
    { value: 'de', label: 'German' },
    { value: 'fr', label: 'French' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
  ]

  function handleChange(newValue) {
    if (newValue) {
      updateSettings({ uiLang: newValue })
    }
  }
</script>

<ReusableSelect
  items={languages}
  bindValue={settings.uiLang}
  defaultLabel="English"
  ariaLabel="Select a language for the user interface"
  className="lang"
  onValueChangeCallback={handleChange}
/>
