<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import {
    fontSizeIndex,
    widthIndex,
  } from '@/stores/displaySettingsStore.svelte'
  import { themeSettings, setTheme } from '@/stores/themeStore.svelte.js'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import { archiveStore } from '@/stores/archiveStore.svelte.js'

  const fontSizeClasses = [
    'prose-base prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
    'prose-lg prose-h1:text-[1.675rem] prose-h2:text-2xl prose-h3:text-xl',
    'prose-xl prose-h1:text-3xl prose-h2:text-[1.675rem]  prose-h3:[1.425rem]',
    'prose-2xl prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl',
  ]

  const widthClasses = ['max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl']
  const widthButtonTexts = ['.', '..', '...', '....']
  const fontMap = {
    default: 'font-default',
    'noto-serif': 'font-noto-serif',
    opendyslexic: 'font-opendyslexic',
    mali: 'font-mali',
  }
  const fontKeys = Object.keys(fontMap)

  function increaseFontSize() {
    if ($fontSizeIndex < fontSizeClasses.length - 1) {
      $fontSizeIndex++
    }
  }

  function decreaseFontSize() {
    if ($fontSizeIndex > 0) {
      $fontSizeIndex--
    }
  }

  function toggleWidth() {
    $widthIndex = ($widthIndex + 1) % widthClasses.length
  }

  function toggleFontFamily() {
    const currentIndex = fontKeys.indexOf(settings.selectedFont)
    const nextIndex = (currentIndex + 1) % fontKeys.length
    updateSettings({ selectedFont: fontKeys[nextIndex] })
  }

  function toggleTheme() {
    const themes = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(themeSettings.theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }
</script>

<div class="absolute text-base flex gap-2 top-2 right-2">
  <button
    class="size-8 flex justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
    onclick={toggleTheme}
    title={$t('archive.change_theme')}
  >
    {#if themeSettings.theme === 'light'}
      <Icon icon="heroicons:sun-16-solid" width="20" height="20" />
    {:else if themeSettings.theme === 'dark'}
      <Icon icon="heroicons:moon-20-solid" width="20" height="20" />
    {:else}
      <Icon icon="heroicons:computer-desktop-20-solid" width="20" height="20" />
    {/if}
  </button>

  <button
    class=" size-8 font-mono flex justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
    onclick={decreaseFontSize}
    disabled={$fontSizeIndex === fontSizeClasses.length + 1}
    title={$t('archive.font_dec')}
  >
    A-
  </button>
  <button
    class=" size-8 flex font-mono justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
    onclick={increaseFontSize}
    disabled={$fontSizeIndex === fontSizeClasses.length - 1}
    title={$t('archive.font_inc')}
  >
    A+
  </button>
  <button
    class=" size-8 flex justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
    onclick={toggleFontFamily}
    title={$t('archive.change_font')}
  >
    aA
  </button>
  <button
    class=" size-8 pt-1.5 relative flex text-xl justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
    onclick={toggleWidth}
    title={$t('archive.toggle_width')}
  >
    <span class="font-default absolute text-sm -translate-y-3"
      >{widthButtonTexts[$widthIndex]}</span
    >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M5.825 13L7.7 14.875q.275.3.288.713T7.7 16.3t-.7.3t-.7-.3l-3.6-3.6q-.15-.15-.213-.325T2.426 12t.063-.375t.212-.325l3.6-3.6q.3-.3.7-.3t.7.3t.3.713t-.3.712L5.825 11h12.35L16.3 9.125q-.275-.3-.287-.712T16.3 7.7t.7-.3t.7.3l3.6 3.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-3.6 3.6q-.3.3-.7.3t-.7-.3t-.3-.712t.3-.713L18.175 13z"
      />
    </svg>
  </button>
</div>
