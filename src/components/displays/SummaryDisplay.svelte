<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import TOC from '@/components/TOCArchive.svelte'
  import TabNavigation from '@/components/TabNavigation.svelte'
  import {
    fontSizeIndex,
    widthIndex,
  } from '@/stores/displaySettingsStore.svelte'

  const { selectedSummary, formatDate } = $props()

  let activeTabId = $state(null)
  let tabs = $state([])

  // @ts-nocheck
  const fontSizeClasses = [
    'prose-base prose-h1:text-3xl',
    'prose-lg prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl',
    'prose-xl prose-h1:text-4xl prose-h2:text-3xl  prose-h3:text-2xl',
    'prose-2xl prose-h1:text-5xl prose-h2:text-4xl',
  ]

  const widthClasses = ['max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl']
  const widthButtonTexts = ['.', '..', '...', '....']

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
    class="prose w-full {widthClasses[$widthIndex]} mx-auto {fontSizeClasses[
      $fontSizeIndex
    ]} py-12 summary-content"
  >
    <div class="absolute text-base flex gap-2 top-2 right-2">
      <button
        class=" size-8 flex justify-center items-center hover:bg-blackwhite/5 rounded-md"
        onclick={decreaseFontSize}
        disabled={$fontSizeIndex === fontSizeClasses.length + 1}
        title="Decrease font size"
      >
        A-
      </button>
      <button
        class=" size-8 flex justify-center items-center hover:bg-blackwhite/5 rounded-md"
        onclick={increaseFontSize}
        disabled={$fontSizeIndex === fontSizeClasses.length - 1}
        title="Increase font size"
      >
        A+
      </button>
      <button
        class=" size-8 pt-1.5 relative flex text-xl justify-center items-center hover:bg-blackwhite/5 rounded-md"
        onclick={toggleWidth}
        title="Toggle width"
      >
        <span class=" absolute text-sm -translate-y-3"
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
          {@html marked.parse(currentSummary.content)}
        {/if}
      {/if}
    </div>
  </div>
  <TOC targetDivId="summary-content" />
{:else}
  <p class="text-center text-text-secondary">No summary selected.</p>
{/if}
