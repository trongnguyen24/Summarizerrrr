<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte' // Import onMount and onDestroy
  import 'overlayscrollbars/overlayscrollbars.css' // Import CSS overlayscrollbars
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte' // Import primitive
  import Settingbar from './components/Settingbar.svelte'
  import SummarizeButton from './components/SummarizeButton.svelte' // Import new component
  import TabNavigation from './components/TabNavigation.svelte' // Import new component
  import SummaryDisplay from './components/SummaryDisplay.svelte' // Import new component
  import ChapterDisplay from './components/ChapterDisplay.svelte' // Import new component
  import { summaryStore } from './stores/summaryStore.svelte.js' // Import the summaryStore object
  import { theme, setTheme } from './stores/themeStore.svelte' // Import theme store and setTheme function
  import { tabTitleStore } from './stores/tabTitleStore.svelte.js' // Import the tabTitleStore
  import '@fontsource-variable/geist-mono' // Import variable font for Geist Mono
  import Icon from '@iconify/svelte'

  // State for UI tabs
  let activeTab = $state('summary')

  // Tự động chuyển về tab summary khi không phải là video YouTube
  $effect(() => {
    if (!summaryStore.isYouTubeVideoActive) {
      activeTab = 'summary'
    }
  })

  const options = {
    scrollbars: {
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Handle tab change event from TabNavigation
  document.addEventListener('summarizeClick', summaryStore.fetchAndSummarize) // Listen for click event from SummarizeButton
  document.addEventListener('tabChange', (event) => {
    activeTab = event.detail
  })

  // Lắng nghe sự thay đổi theme của hệ thống
  let mediaQuery
  let mediaQueryListener

  onMount(() => {
    if (typeof window !== 'undefined') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQueryListener = (e) => {
        // Chỉ cập nhật nếu theme hiện tại là 'system'
        if ($theme === 'system') {
          // Cập nhật store. applyTheme sẽ được gọi qua subscribe trong store.
          setTheme('system') // Đặt lại là 'system' để kích hoạt subscribe và áp dụng theme hệ thống mới
        }
      }
      mediaQuery.addEventListener('change', mediaQueryListener)
    }

    // Initialize OverlayScrollbars on the body element
    initialize(document.body)

    // Lắng nghe message từ background script để cập nhật trạng thái loại tab
    const handleMessage = (request, sender, sendResponse) => {
      if (request.action === 'tabUpdated') {
        console.log('[App.svelte] Received tabUpdated message:', request)
        summaryStore.updateIsYouTubeVideoActive(request.isYouTube)
        tabTitleStore.set(request.tabTitle) // Update the tabTitleStore
      } else if (request.action === 'currentTabInfo') {
        // Handle response for initial tab info request
        console.log('[App.svelte] Received currentTabInfo response:', request)
        tabTitleStore.set(request.tabTitle)
        summaryStore.updateIsYouTubeVideoActive(request.isYouTube)
      }
      // Trả về true để giữ kênh message mở nếu cần phản hồi bất đồng bộ
      // return true; // Không cần thiết nếu không gửi phản hồi
    }
    chrome.runtime.onMessage.addListener(handleMessage)

    // Request current tab info from background script on mount
    chrome.runtime
      .sendMessage({ action: 'requestCurrentTabInfo' })
      .catch((error) => {
        // Catch error if background script is not ready or listener not added yet
        console.warn(
          '[App.svelte] Could not send requestCurrentTabInfo message:',
          error
        )
      })

    // Cleanup listener on destroy
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  })

  onDestroy(() => {
    if (mediaQuery && mediaQueryListener) {
      mediaQuery.removeEventListener('change', mediaQueryListener)
    }
  })

  // Removed: textToSummarize, local summary/loading/error states, theme logic,
  // ensureContentScriptInjected, handleSummarizeText, OverlayScrollbars, onMount/onDestroy related to them.

  // Removed: textToSummarize, local summary/loading/error states, theme logic,
  // ensureContentScriptInjected, handleSummarizeText, OverlayScrollbars, onMount/onDestroy related to them.
</script>

<div class="flex flex-col">
  <div
    class="grid grid-rows-[32px_1px_12px_1px_160px_1px_12px_1px_1fr] h-screen"
  >
    <div class=" flex justify-center items-center w-full h-full">
      <div class="text-text-secondary">
        <div class="line-clamp-1 text-[0.65rem] px-2 text-text-secondary">
          {$tabTitleStore}
        </div>
      </div>
    </div>

    <div class="bg-border"></div>
    <div
      class="top-stripes flex justify-center items-center w-full h-full"
    ></div>
    <div class="bg-border"></div>

    <div class="flex font-mono flex-col justify-center items-center">
      <div class="flex flex-col gap-6 items-center justify-center">
        <SummarizeButton
          isLoading={summaryStore.isLoading}
          isChapterLoading={summaryStore.isChapterLoading}
        />
      </div>
      <div class="flex flex-col gap-1 text-xs items-center justify-center mt-2">
        <div>Summary size</div>
        <div class="flex gap-2">
          <button class="px-2 py-1">short</button>
          <button class="px-2 py-1">medium</button>
          <button class="px-2 py-1">long</button>
        </div>
      </div>
    </div>

    <div class="bg-border"></div>

    <div class="flex justify-center items-center w-full h-full"></div>

    <div class="bg-border"></div>

    <div
      class="relative z-10 flex flex-col gap-6 p-6 py-10 xs:px-6 max-w-prose w-full mx-auto"
      class:mt-[-4rem]={!summaryStore.summary &&
        !summaryStore.error &&
        !summaryStore.chapterSummary &&
        !summaryStore.chapterError &&
        !summaryStore.isLoading &&
        !summaryStore.isChapterLoading}
    >
      <TabNavigation
        {activeTab}
        isYouTubeVideoActive={summaryStore.isYouTubeVideoActive}
        chapterSummary={summaryStore.chapterSummary}
        isChapterLoading={summaryStore.isChapterLoading}
        chapterError={summaryStore.chapterError}
      />
      {#if activeTab === 'summary'}
        <!-- Use SummaryDisplay component -->
        <SummaryDisplay
          summary={summaryStore.summary}
          isLoading={summaryStore.isLoading}
          error={summaryStore.error}
        />
      {:else if activeTab === 'chapters'}
        <!-- Use ChapterDisplay component -->
        <ChapterDisplay
          chapterSummary={summaryStore.chapterSummary}
          isChapterLoading={summaryStore.isChapterLoading}
          chapterError={summaryStore.chapterError}
        />
      {/if}
    </div>
  </div>

  <!-- Main Content -->
  <div class="hidden max-w-2xl mx-auto flex-col">
    <div
      class="px-5 py-3 fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-10 xs:px-8 flex items-center justify-between header-animation"
    >
      {$tabTitleStore}
    </div>
    <div
      class="px-5 py-16 fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-10 xs:px-8 flex items-center justify-between header-animation"
    >
      <!-- Use SummarizeButton component -->
      <SummarizeButton
        isLoading={summaryStore.isLoading}
        isChapterLoading={summaryStore.isChapterLoading}
      />
      <div class="flex"><Settingbar /></div>
    </div>

    <div
      class="relative z-10 flex flex-col gap-6 pt-4"
      class:mt-[-4rem]={!summaryStore.summary &&
        !summaryStore.error &&
        !summaryStore.chapterSummary &&
        !summaryStore.chapterError &&
        !summaryStore.isLoading &&
        !summaryStore.isChapterLoading}
    >
      {#if (activeTab === 'summary' && (summaryStore.isLoading || summaryStore.summary || summaryStore.error)) || (activeTab === 'chapters' && (summaryStore.isChapterLoading || summaryStore.chapterSummary || summaryStore.chapterError))}
        <div
          class="px-4 xs:px-0 flex justify-center mb-[-1.5rem] relative z-10"
        >
          <!-- Use TabNavigation component -->
          <TabNavigation
            {activeTab}
            isYouTubeVideoActive={summaryStore.isYouTubeVideoActive}
            chapterSummary={summaryStore.chapterSummary}
            isChapterLoading={summaryStore.isChapterLoading}
            chapterError={summaryStore.chapterError}
          />
        </div>

        <div
          class="p-5 xs:p-8 pb-[50vh] prose w-full max-w-2xl bg-surface-1 border border-border/25 border-t-white dark:border-t-neutral-600 xs:shadow-lg xs:rounded-xl min-h-[10rem]"
        >
          {#if activeTab === 'summary'}
            <!-- Use SummaryDisplay component -->
            <SummaryDisplay
              summary={summaryStore.summary}
              isLoading={summaryStore.isLoading}
              error={summaryStore.error}
            />
          {:else if activeTab === 'chapters'}
            <!-- Use ChapterDisplay component -->
            <ChapterDisplay
              chapterSummary={summaryStore.chapterSummary}
              isChapterLoading={summaryStore.isChapterLoading}
              chapterError={summaryStore.chapterError}
            />
          {/if}
        </div>
      {/if}
    </div>
  </div>
  <div
    class="fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
