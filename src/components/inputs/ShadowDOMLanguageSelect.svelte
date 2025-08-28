<!-- @ts-nocheck -->
<script>
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'

  const languages = [
    { value: 'Arabic', label: 'Arabic' },
    { value: 'Bengali', label: 'Bengali' },
    { value: 'Bulgarian', label: 'Bulgarian' },
    { value: 'Chinese Simplified', label: 'Chinese Simplified' },
    { value: 'Chinese Traditional', label: 'Chinese Traditional' },
    { value: 'Croatian', label: 'Croatian' },
    { value: 'Czech', label: 'Czech' },
    { value: 'Danish', label: 'Danish' },
    { value: 'Dutch', label: 'Dutch' },
    { value: 'English', label: 'English' },
    { value: 'Estonian', label: 'Estonian' },
    { value: 'Finnish', label: 'Finnish' },
    { value: 'French', label: 'French' },
    { value: 'German', label: 'German' },
    { value: 'Greek', label: 'Greek' },
    { value: 'Hebrew', label: 'Hebrew' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Hungarian', label: 'Hungarian' },
    { value: 'Indonesian', label: 'Indonesian' },
    { value: 'Italian', label: 'Italian' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Korean', label: 'Korean' },
    { value: 'Latvian', label: 'Latvian' },
    { value: 'Lithuanian', label: 'Lithuanian' },
    { value: 'Norwegian', label: 'Norwegian' },
    { value: 'Polish', label: 'Polish' },
    { value: 'Portuguese', label: 'Portuguese' },
    { value: 'Romanian', label: 'Romanian' },
    { value: 'Russian', label: 'Russian' },
    { value: 'Serbian', label: 'Serbian' },
    { value: 'Slovak', label: 'Slovak' },
    { value: 'Slovenian', label: 'Slovenian' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'Swahili', label: 'Swahili' },
    { value: 'Swedish', label: 'Swedish' },
    { value: 'Thai', label: 'Thai' },
    { value: 'Turkish', label: 'Turkish' },
    { value: 'Ukrainian', label: 'Ukrainian' },
    { value: 'Vietnamese', label: 'Vietnamese' },
    { value: 'Kí tự cổ ngữ Rune', label: 'ᛊᚢᛗᛗᛖᚱᛁᛟᚠ' },
  ]

  let { value = $bindable() } = $props()

  function handleChange(event) {
    const newValue = event.currentTarget.value
    value = newValue
    settings.summaryLang = newValue
    updateSettings({ summaryLang: newValue })
    const customEvent = new CustomEvent('change', { detail: newValue })
    dispatchEvent(customEvent)
  }
</script>

<div class="relative w-full">
  <select
    bind:value
    onchange={handleChange}
    aria-label="Select a language"
    class="font-mono w-full relative overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-2 bg-muted/5 dark:bg-muted/5 border text-xs border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150 appearance-none"
  >
    {#each languages as lang}
      <option value={lang.value}>{lang.label}</option>
    {/each}
  </select>
  <div
    class="absolute text-text-secondary right-2 top-1/2 -translate-y-1/2 pointer-events-none"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
    >
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06m5.56-4.44a.75.75 0 0 1-1.06 0L8 4.06L6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06"
        clip-rule="evenodd"
      />
    </svg>
  </div>
</div>
