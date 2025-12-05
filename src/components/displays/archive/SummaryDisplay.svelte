<script>
  // @ts-nocheck
  import { tick } from 'svelte'
  import Icon from '@iconify/svelte'
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import svelte from 'highlightjs-svelte'
  svelte(hljs)
  import { processThinkTags } from '@/lib/utils/thinkTagProcessor.js'
  import { processTimestamps } from '@/lib/utils/timestampProcessor.js'
  import TOC from '@/components/navigation/TOCArchive.svelte'
  import TabNavigation from '@/components/navigation/TabNavigation.svelte'
  import FoooterDisplay from '@/components/displays/ui/FoooterDisplay.svelte'
  import SaveToArchiveFromHistoryButton from '@/components/buttons/SaveToArchiveFromHistoryButton.svelte'
  import CopyButton from '@/components/buttons/CopyButton.svelte'
  import DownloadButton from '@/components/buttons/DownloadButton.svelte'
  import DisplaySettingsControls from '@/components/displays/ui/DisplaySettingsControls.svelte'
  import DeepDiveQuestionsArchive from '@/components/tools/deepdive/DeepDiveQuestionsArchive.svelte'
  import {
    settings, // Giữ lại vì vẫn dùng để tính toán class cho prose
  } from '@/stores/settingsStore.svelte.js'

  const { selectedSummary, formatDate, activeTab } = $props()

  let activeTabId = $state(null)
  let tabs = $state([])
  let parsedContent = $state('')
  let markdownContainer = $state()

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
        (_, index) => `summary-tab-${index}` === activeTabId,
      )

      if (currentSummary && typeof currentSummary.content === 'string') {
        try {
          const renderer = new marked.Renderer()
          const originalLink = renderer.link.bind(renderer)

          renderer.link = ({ href, title, text }) => {
            if (href && href.startsWith('timestamp:')) {
              const seconds = href.split(':')[1]
              let targetUrl = '#'

              if (selectedSummary.url) {
                try {
                  const url = new URL(selectedSummary.url)
                  // Handle YouTube URLs
                  if (
                    url.hostname.includes('youtube.com') ||
                    url.hostname.includes('youtu.be')
                  ) {
                    if (url.searchParams.has('v')) {
                      url.searchParams.set('t', seconds)
                      targetUrl = url.toString()
                    } else if (url.hostname === 'youtu.be') {
                      url.searchParams.set('t', seconds)
                      targetUrl = url.toString()
                    }
                  } else {
                    // Default: append #t=seconds
                    targetUrl = `${selectedSummary.url}#t=${seconds}`
                  }
                } catch (e) {
                  console.error('Invalid URL:', selectedSummary.url)
                }
              }

              // Match the UI of TimestampLink.svelte but with target="_blank"
              return `
                <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" title="Open at ${text}" class="timestamp-link flex w-fit group items-center bg-surface-2 font-medium rounded-md overflow-hidden text-text-primary mb-2 font-mono transition-colors cursor-pointer no-underline border border-border">
                  <span class="border-r w-full py-1 px-3 text-sm border-border">${text}</span>
                  <span class="flex relative justify-center shrink-0 items-center w-8 h-7">
                    <span class="absolute top-0 left-0 w-0 h-full bg-blackwhite/5 group-hover:w-full transition-all duration-300 ease-in-out"></span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide text-primary lucide-play">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </span>
                </a>
              `
            }
            return originalLink.call(renderer, { href, title, text })
          }

          marked.use({ renderer })
          marked.setOptions({
            highlight: function (code, lang) {
              const language = hljs.getLanguage(lang) ? lang : 'plaintext'
              return hljs.highlight(code, { language }).value
            },
          })

          let processedContent = processThinkTags(currentSummary.content)
          // Also process timestamps
          processedContent = processTimestamps(processedContent)
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
    if (selectedSummary && activeTabId && parsedContent) {
      // Sử dụng tick() để chờ DOM được cập nhật hoàn toàn
      tick().then(() => {
        // Query trực tiếp trên document sau khi DOM đã update
        const container = document.getElementById('copy-cat')
        if (container) {
          container
            .querySelectorAll('pre code, .think-section pre code')
            .forEach((block) => {
              // Kiểm tra xem block đã được highlight chưa
              if (!block.dataset.highlighted) {
                hljs.highlightElement(block)
                block.dataset.highlighted = 'true'
              }
            })
        }

        // Cuộn lên đầu trang khi tab thay đổi
        window.scrollTo({ top: 0, behavior: 'instant' })
      })
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
          (_, index) => `summary-tab-${index}` === activeTabId,
        )}
        {#if currentSummary}
          <div
            bind:this={markdownContainer}
            class="markdown-container-v2"
            id="copy-cat"
          >
            {@html parsedContent}
          </div>
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

      <!-- Deep Dive Questions Section -->
      {#if activeTabId}
        {@const currentSummaryForDeepDive = selectedSummary.summaries.find(
          (_, index) => `summary-tab-${index}` === activeTabId,
        )}
        {#if currentSummaryForDeepDive && settings.tools?.deepDive?.enabled}
          <DeepDiveQuestionsArchive
            summaryContent={currentSummaryForDeepDive.content}
            pageTitle={selectedSummary.title}
            pageUrl={selectedSummary.url}
            summaryLang={settings.summaryLang || 'English'}
          />
        {/if}
      {/if}
    </div>
  </div>

  <TOC targetDivId="summary-content" />

  {@const currentSummary = selectedSummary.summaries.find(
    (_, index) => `summary-tab-${index}` === activeTabId,
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

  /* === Table Styling - Horizontal Scroll === */
  .markdown-container-v2 :global(table) {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; /* Smooth scroll trên iOS */
    border: 1px solid var(--color-border);
    border-radius: 0.5em;
    padding: 0.5em 0;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  .markdown-container-v2 :global(table thead),
  .markdown-container-v2 :global(table tbody),
  .markdown-container-v2 :global(table tr) {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .markdown-container-v2 :global(table:hover) {
    scrollbar-color: var(--color-border) transparent;
  }

  /* Webkit scrollbar - ẩn background */
  .markdown-container-v2 :global(table::-webkit-scrollbar) {
    height: 6px;
    background: transparent;
  }

  .markdown-container-v2 :global(table::-webkit-scrollbar-track) {
    background: transparent;
  }

  .markdown-container-v2 :global(table::-webkit-scrollbar-thumb) {
    background: transparent;
    border-radius: 3px;
  }

  .markdown-container-v2 :global(table:hover::-webkit-scrollbar-thumb) {
    background: var(--color-border);
  }

  .markdown-container-v2 :global(th) {
    min-width: 100px;
    white-space: nowrap;
  }

  .markdown-container-v2 :global(td) {
    min-width: 80px;
  }

  /* Padding cho cell đầu và cuối của mỗi row */
  .markdown-container-v2 :global(th:first-child),
  .markdown-container-v2 :global(td:first-child) {
    padding-left: 0.5em;
  }

  .markdown-container-v2 :global(th:last-child),
  .markdown-container-v2 :global(td:last-child) {
    padding-right: 0.5em;
  }
</style>
