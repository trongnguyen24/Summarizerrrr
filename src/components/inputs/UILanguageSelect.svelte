<script>
  // @ts-nocheck
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import ReusableSelect from './ReusableSelect.svelte'

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'es', label: 'Español' },
    { value: 'zh-CN', label: '简体中文' },
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' },
    { value: 'ja', label: '日本語' },
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
