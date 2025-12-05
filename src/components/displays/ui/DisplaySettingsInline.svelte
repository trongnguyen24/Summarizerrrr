<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'

  // Font size levels in em units for shadow DOM
  const fontSizeLevels = [0.875, 1, 1.25, 1.5] // 14px, 16px, 18px, 20px at base 16px

  function increaseFontSize() {
    if (settings.fontSizeIndex < fontSizeLevels.length - 1) {
      updateSettings({ fontSizeIndex: settings.fontSizeIndex + 1 })
    }
  }

  function decreaseFontSize() {
    if (settings.fontSizeIndex > 0) {
      updateSettings({ fontSizeIndex: settings.fontSizeIndex - 1 })
    }
  }
</script>

<div class="flex justify-center items-center py-2">
  <div class="flex gap-1">
    <button
      class="flex justify-center items-center size-8 rounded-full font-mono font-medium text-text-secondary bg-transparent border-none cursor-pointer transition-all duration-150 hover:bg-blackwhite/10 hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
      onclick={decreaseFontSize}
      disabled={settings.fontSizeIndex === 0}
      title={$t('archive.font_dec')}
    >
      <span class="leading-none text-[0.75em]">A-</span>
    </button>
    <button
      class="flex justify-center items-center size-8 rounded-full font-mono font-medium text-text-secondary bg-transparent border-none cursor-pointer transition-all duration-150 hover:bg-blackwhite/10 hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
      onclick={increaseFontSize}
      disabled={settings.fontSizeIndex === fontSizeLevels.length - 1}
      title={$t('archive.font_inc')}
    >
      <span class="leading-none text-[0.75em]">A+</span>
    </button>
  </div>
</div>
