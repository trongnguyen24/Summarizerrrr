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
  const fontSizeClasses = ['prose-sm', 'prose-base', 'prose-lg', 'prose-xl']

  const widthClasses = ['max-w-2xl', 'max-w-3xl', 'max-w-4xl']
  const widthButtonTexts = ['w', 'W', '-W-']

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
  <div class="mx-auto w-full relative flex flex-col px-8 py-16 gap-8">
    <div class="absolute flex gap-2 top-0 right-0">
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
        class=" size-8 flex justify-center items-center hover:bg-blackwhite/5 rounded-md"
        onclick={toggleWidth}
        title="Toggle width"
      >
        {widthButtonTexts[$widthIndex]}
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
        class="mx-auto my-0 p-0 text-blackwhite max-w-3xl text-balance text-center text-3xl font-serif leading-[1.35]"
      >
        {selectedSummary.title}
      </h1>
    </div>
    <div class="flex justify-center mt-6">
      {#if tabs.length > 1}
        <TabNavigation {tabs} activeTab={activeTabId} {onSelectTab} />
      {/if}
    </div>
    <div
      id="summary-content"
      class="prose w-full {widthClasses[$widthIndex]} mx-auto {fontSizeClasses[
        $fontSizeIndex
      ]} pb-10 summary-content"
    >
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
