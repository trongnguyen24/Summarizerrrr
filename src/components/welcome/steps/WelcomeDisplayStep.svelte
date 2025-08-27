<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import { themeSettings, setTheme } from '@/stores/themeStore.svelte.js'
  import ButtonFont from '@/components/buttons/ButtonFont.svelte'
  import ButtonIcon from '@/components/buttons/ButtonIcon.svelte'
  import Icon from '@iconify/svelte'

  // Local state for both theme and font
  let selectedTheme = $state(themeSettings.theme)
  let selectedFont = $state(settings.selectedFont)

  function handleThemeChange(theme) {
    selectedTheme = theme
    setTheme(theme) // Apply theme immediately
  }

  function handleFontChange(font) {
    selectedFont = font
    // We also need to update the setting in the main store so it persists if the user goes back and forth
    updateSettings({ selectedFont: font })
  }

  export function saveSettings() {
    setTheme(selectedTheme)
    updateSettings({ selectedFont: selectedFont })
  }

  const themeOptions = [
    {
      id: 'light',
      labelKey: 'settings.general.theme_mode.light',
      icon: 'heroicons:sun-16-solid',
    },
    {
      id: 'dark',
      labelKey: 'settings.general.theme_mode.dark',
      icon: 'heroicons:moon-20-solid',
    },
    {
      id: 'system',
      labelKey: 'settings.general.theme_mode.system',
      icon: 'heroicons:computer-desktop-20-solid',
    },
  ]

  const fontOptions = [
    { id: 'default', labelKey: 'settings.general.font.sans', font: 'sans' },
    {
      id: 'noto-serif',
      labelKey: 'settings.general.font.serif',
      font: 'serif',
    },
    {
      id: 'opendyslexic',
      labelKey: 'settings.general.font.dyslexic',
      font: 'dyslexic',
    },
    { id: 'mali', labelKey: 'settings.general.font.mali', font: 'mali' },
  ]
</script>

<div
  class="welcome-display-step w-full flex flex-col justify-center items-center"
>
  <h2 class="text-lg font-bold text-center mb-2">
    {$t('welcome.setup_display_title')}
  </h2>
  <p class="text-center text-xs text-text-secondary mb-6">
    {$t('welcome.setup_display_desc')}
  </p>

  <div class="w-full font-mono text-xs max-w-sm space-y-6">
    <!-- Theme Selection -->
    <div>
      <h3 class=" font-medium text-text-secondary mb-2">
        {$t('welcome.theme_selection')}
      </h3>
      <div class="flex justify-between gap-2">
        {#each themeOptions as theme}
          <ButtonIcon
            title={$t(theme.labelKey)}
            class={selectedTheme === theme.id ? 'active' : ''}
            onclick={() => handleThemeChange(theme.id)}
          >
            <Icon icon={theme.icon} width="20" height="20" />
          </ButtonIcon>
        {/each}
      </div>
    </div>

    <!-- Font Selection -->
    <div>
      <h3 class=" font-medium text-text-secondary mb-2">
        {$t('welcome.font_selection')}
      </h3>
      <div class="grid grid-cols-1 gap-2">
        {#each fontOptions as font}
          <ButtonFont
            title={$t(font.labelKey)}
            font={font.font}
            class={selectedFont === font.id ? 'active' : ''}
            onclick={() => handleFontChange(font.id)}
          />
        {/each}
      </div>
    </div>
  </div>
</div>
