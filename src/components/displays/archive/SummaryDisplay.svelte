<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import svelte from 'highlightjs-svelte'
  svelte(hljs)
  import { processThinkTags } from '@/lib/utils/thinkTagProcessor.js'
  import TOC from '@/components/navigation/TOCArchive.svelte'
  import TabNavigation from '@/components/navigation/TabNavigation.svelte'
  import FoooterDisplay from '@/components/displays/ui/FoooterDisplay.svelte'
  import SaveToArchiveFromHistoryButton from '@/components/buttons/SaveToArchiveFromHistoryButton.svelte'
  import CopyButton from '@/components/buttons/CopyButton.svelte'
  import DownloadButton from '@/components/buttons/DownloadButton.svelte'
  import DisplaySettingsControls from '@/components/displays/ui/DisplaySettingsControls.svelte'
  import {
    settings, // Giữ lại vì vẫn dùng để tính toán class cho prose
  } from '@/stores/settingsStore.svelte.js'

  const { selectedSummary, formatDate, activeTab } = $props()

  let activeTabId = $state(null)
  let tabs = $state([])
  let parsedContent = $state('')

  // @ts-nocheck
  const fontSizeClasses = [
    'prose-base prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
    'prose-lg prose-h1:text-[1.675rem] prose-h2:text-2xl prose-h3:text-xl',
    'prose-xl prose-h1:text-3xl prose-h2:text-[1.675rem]  prose-h3:[1.425rem]',
    'prose-2xl prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl',
  ]

  const widthClasses = ['max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl']
  const fontMap = {
    default: 'font-default',
    'noto-serif': 'font-noto-serif',
    opendyslexic: 'font-opendyslexic',
    mali: 'font-mali',
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

  // Effect để parse markdown với think tags khi selectedSummary hoặc activeTabId thay đổi
  $effect(() => {
    if (selectedSummary && activeTabId) {
      const currentSummary = selectedSummary.summaries.find(
        (_, index) => `summary-tab-${index}` === activeTabId
      )

      if (currentSummary && typeof currentSummary.content === 'string') {
        try {
          marked.setOptions({
            highlight: function (code, lang) {
              const language = hljs.getLanguage(lang) ? lang : 'plaintext'
              return hljs.highlight(code, { language }).value
            },
          })

          const processedContent = processThinkTags(currentSummary.content)
          parsedContent = marked.parse(processedContent)
        } catch (error) {
          console.warn('SummaryDisplay: Think tag processing error:', error)
          // Fallback to original content
          parsedContent = marked.parse(currentSummary.content)
        }
      } else {
        parsedContent = ''
      }
    } else {
      parsedContent = ''
    }
  })

  // Effect để highlight code và cuộn trang khi selectedSummary hoặc activeTabId thay đổi
  $effect(() => {
    if (selectedSummary && activeTabId) {
      // Svelte 5 $effect chạy sau khi DOM đã được cập nhật,
      // vì vậy các phần tử sẽ có sẵn để tô sáng.
      document
        .querySelectorAll(
          '.summary-content pre code, .summary-content .think-section pre code'
        )
        .forEach((block) => {
          hljs.highlightElement(block)
        })

      // Cuộn lên đầu trang khi tab thay đổi
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  })

  function onSelectTab(tabId) {
    activeTabId = tabId
  }
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }
</script>

{#if selectedSummary}
  <div
    class="prose px-8 md:px-16 xl:px-24 w-full {widthClasses[
      settings.widthIndex
    ]} mx-auto {fontSizeClasses[settings.fontSizeIndex]} {fontMap[
      settings.selectedFont
    ]} pt-12 pb-[35vh] summary-content"
  >
    <DisplaySettingsControls />
    <div class="flex flex-col gap-2">
      <div
        class="font-mono text-text-muted text-xs flex md:flex-row flex-col gap-2 py-8 md:gap-8 justify-center items-center"
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
          <div id="copy-cat">{@html parsedContent}</div>
        {/if}
      {/if}

      <div
        id="footer"
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
        <span class="h-px w-8 md:w-20 bg-border/70"></span>

        {#if currentSummary && activeTab !== 'archive'}
          <SaveToArchiveFromHistoryButton {selectedSummary} />
        {/if}

        {#if currentSummary}
          <CopyButton />
          <DownloadButton
            content={currentSummary.content}
            title={selectedSummary.title}
            sourceUrl={selectedSummary.url}
            sourceTitle={selectedSummary.title}
          />
        {/if}

        <span class="h-px w-8 md:w-20 bg-border/70"></span>
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
  <p
    class="text-center flex flex-col gap-4 items-center justify-center text-text-secondary py-8 h-svh"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
    >
      <g
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1"
      >
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path
          d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2m-7-7h.01M14 14h.01"
        />
        <path d="M10 18a3.5 3.5 0 0 1 4 0" />
      </g>
    </svg>
    No summary selected.
  </p>
{/if}

<style>
  .think-section {
    opacity: 0.75;
    overflow: hidden;
    margin-bottom: 1rem;
  }
</style>
