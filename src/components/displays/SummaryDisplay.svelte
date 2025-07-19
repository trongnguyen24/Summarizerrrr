<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import TOC from '@/components/TOCArchive.svelte'
  import TabNavigation from '@/components/TabNavigation.svelte'
  import FoooterDisplay from '@/components/displays/FoooterDisplay.svelte'
  import SaveToArchiveFromHistoryButton from '@/components/buttons/SaveToArchiveFromHistoryButton.svelte'
  import CopyButton from '@/components/buttons/CopyButton.svelte'
  import DownloadButton from '@/components/buttons/DownloadButton.svelte'
  import {
    fontSizeIndex,
    widthIndex,
  } from '@/stores/displaySettingsStore.svelte'
  import { themeSettings, setTheme } from '../../stores/themeStore.svelte.js'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'

  const { selectedSummary, formatDate, activeTab } = $props()

  let activeTabId = $state(null)
  let tabs = $state([])

  // @ts-nocheck
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

  // Effect để cập nhật tabs khi selectedSummary thay đổi
  $effect(() => {
    if (selectedSummary) {
      const newTabs = selectedSummary.summaries.map((subSummary, index) => ({
        id: `summary-tab-${index}`,
        label: subSummary.title,
      }))

      // Cập nhật tabs chỉ khi có sự thay đổi thực sự về nội dung
      if (JSON.stringify(tabs) !== JSON.stringify(newTabs)) {
        tabs = newTabs
      }
    } else {
      tabs = []
    }
  })

  // Effect để quản lý activeTabId khi tabs hoặc selectedSummary thay đổi
  $effect(() => {
    if (selectedSummary && tabs.length > 0) {
      // Chỉ cập nhật activeTabId nếu nó chưa được đặt hoặc nếu tab hiện tại không còn tồn tại trong danh sách mới
      if (!activeTabId || !tabs.some((tab) => tab.id === activeTabId)) {
        activeTabId = tabs[0].id
      }
    } else {
      activeTabId = null
    }
  })

  // Effect để highlight code và cuộn trang khi selectedSummary thay đổi
  $effect(() => {
    if (selectedSummary) {
      document
        .querySelectorAll('.summary-content pre code')
        .forEach((block) => {
          hljs.highlightElement(block)
        })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  })

  function onSelectTab(tabId) {
    activeTabId = tabId
  }
</script>

{#if selectedSummary}
  <div
    class="prose px-8 md:px-12 xl:px-20 w-full {widthClasses[
      $widthIndex
    ]} mx-auto {fontSizeClasses[$fontSizeIndex]} {fontMap[
      settings.selectedFont
    ]} py-12 summary-content"
  >
    <div class="absolute text-base flex gap-2 top-2 right-2">
      <button
        class="size-8 flex justify-center items-center hover:bg-blackwhite/5 rounded-md"
        onclick={toggleTheme}
        title="Change theme"
      >
        {#if themeSettings.theme === 'light'}
          <Icon icon="heroicons:sun-16-solid" width="20" height="20" />
        {:else if themeSettings.theme === 'dark'}
          <Icon icon="heroicons:moon-20-solid" width="20" height="20" />
        {:else}
          <Icon
            icon="heroicons:computer-desktop-20-solid"
            width="20"
            height="20"
          />
        {/if}
      </button>

      <button
        class=" size-8 font-mono flex justify-center items-center hover:bg-blackwhite/5 rounded-md"
        onclick={decreaseFontSize}
        disabled={$fontSizeIndex === fontSizeClasses.length + 1}
        title="Decrease font size"
      >
        A-
      </button>
      <button
        class=" size-8 flex font-mono justify-center items-center hover:bg-blackwhite/5 rounded-md"
        onclick={increaseFontSize}
        disabled={$fontSizeIndex === fontSizeClasses.length - 1}
        title="Increase font size"
      >
        A+
      </button>
      <button
        class=" size-8 flex justify-center items-center hover:bg-blackwhite/5 rounded-md"
        onclick={toggleFontFamily}
        title="Change font"
      >
        aA
      </button>
      <button
        class=" size-8 pt-1.5 relative flex text-xl justify-center items-center hover:bg-blackwhite/5 rounded-md"
        onclick={toggleWidth}
        title="Toggle width"
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
    <div class="flex flex-col gap-2">
      <div
        class="font-mono text-text-muted text-xs flex gap-8 justify-center items-center"
      >
        <div class="flex justify-center items-center gap-1">
          <Icon height="16" width="16" icon="lucide:clock" class="" />
          {formatDate(selectedSummary.date)}
        </div>
        <div class="flex justify-center items-center gap-1">
          <Icon height="16" width="16" icon="lucide:link" class="" />
          <a
            href={selectedSummary.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {selectedSummary.url
              ? selectedSummary.url.replace(/(^\w+:|^)\/\//, '').split('/')[0]
              : 'Unknown URL'}
          </a>
        </div>
      </div>
      <h1
        class="mx-auto font-noto-serif my-0 p-0 text-blackwhite text-balance text-center font-serif leading-[1.2]"
      >
        {selectedSummary.title}
      </h1>
    </div>
    <div class="flex justify-center">
      {#if tabs.length > 1}
        <TabNavigation {tabs} activeTab={activeTabId} {onSelectTab} />
      {/if}
    </div>
    <div id="summary-content" class=" text-text-secondary">
      {#if activeTabId}
        {@const currentSummary = selectedSummary.summaries.find(
          (_, index) => `summary-tab-${index}` === activeTabId
        )}
        {#if currentSummary}
          <div id="copy-cat">{@html marked.parse(currentSummary.content)}</div>
        {/if}
      {/if}

      <div
        class="w-fit mx-auto relative mt-12 flex justify-center items-center gap-2"
      >
        <div class="absolute left-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="9"
            height="9"
            fill="none"
          >
            <path d="M4 0h1v9H4z" fill="currentColor" />
            <path d="M9 4v1H0V4z" fill="currentColor" />
          </svg>
        </div>
        <span class="h-px w-20 bg-border/70"></span>

        {#if currentSummary && activeTab !== 'archive'}
          <SaveToArchiveFromHistoryButton {selectedSummary} />
        {/if}

        {#if currentSummary}
          <CopyButton />
          <DownloadButton
            content={currentSummary.content}
            title={selectedSummary.title}
          />
        {/if}

        <span class="h-px w-20 bg-border/70"></span>
        <div class="absolute right-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="9"
            height="9"
            fill="none"
          >
            <path d="M4 0h1v9H4z" fill="currentColor" />
            <path d="M9 4v1H0V4z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  </div>
  <TOC targetDivId="summary-content" />
  {@const currentSummary = selectedSummary.summaries.find(
    (_, index) => `summary-tab-${index}` === activeTabId
  )}
{:else}
  <p class="text-center text-text-secondary">No summary selected.</p>
{/if}
