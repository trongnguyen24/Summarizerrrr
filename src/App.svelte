<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte' // Import onMount and onDestroy
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css' // Import CSS overlayscrollbars
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte' // Import primitive
  import SettingButton from './components/SettingButton.svelte'
  import SummarizeButton from './components/SummarizeButton.svelte' // Import new component
  import TabNavigation from './components/TabNavigation.svelte' // Import new component
  import SummaryDisplay from './components/SummaryDisplay.svelte' // Import new component
  import ChapterDisplay from './components/ChapterDisplay.svelte' // Import new component
  import { summaryStore } from './stores/summaryStore.svelte.js' // Import the summaryStore object
  import { theme, setTheme } from './stores/themeStore.svelte' // Import theme store and setTheme function
  import { tabTitleStore } from './stores/tabTitleStore.svelte.js' // Import the tabTitleStore
  import '@fontsource-variable/geist-mono' // Import variable font for Geist Mono

  // State for UI tabs
  let activeTab = $state('summary')
  let showTabNavigation = $state(false) // New state variable
  let reactTabNavigation = $state(false) // New state for checking if TabNavigation is shown

  const options = {
    scrollbars: {
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Handle tab change event from TabNavigation
  document.addEventListener('summarizeClick', () => {
    summaryStore.fetchAndSummarize()
    showTabNavigation = reactTabNavigation
    activeTab = 'summary' // Set active tab to summary when clicking the button
  }) // Listen for click event from SummarizeButton
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
        console.log(
          '------[App.svelte] Updated tabTitleStore with new title:',
          request.isYouTube
        )
        reactTabNavigation = request.isYouTube // <-- Thêm dòng này
      } else if (request.action === 'currentTabInfo') {
        // Handle response for initial tab info request
        console.log('[App.svelte] Received currentTabInfo response:', request)
        tabTitleStore.set(request.tabTitle)
        summaryStore.updateIsYouTubeVideoActive(request.isYouTube)
        console.log(
          '------[App.svelte] Updated tabTitleStore with new title:',
          request.isYouTube
        )
      }
      // Trả về true để giữ kênh message mở nếu cần phản hồi bất đồng bộ
      // return true; // Không cần thiết nếu không gửi phản hồi
    }
    chrome.runtime.onMessage.addListener(handleMessage)
    chrome.runtime.sendMessage(
      { action: 'requestCurrentTabInfo' },
      (response) => {
        tabTitleStore.set(response.tabTitle) // Update the tabTitleStore
        reactTabNavigation = response.isYouTube
      }
    )

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
  <div class="grid grid-rows-[32px_1px_8px_1px_180px_1px_8px_1px_1fr] h-screen">
    <div class=" flex justify-center items-center w-full h-full">
      <div class="text-text-secondary">
        <div class="line-clamp-1 text-[0.65rem] px-2 text-text-secondary">
          {$tabTitleStore}
          <!-- {$reactTabNavigation ? ' - YouTube Video' : 'Web Page'} -->
        </div>
      </div>
    </div>

    <div class="bg-border"></div>
    <div
      class="top-stripes flex justify-center items-center w-full h-full"
    ></div>
    <div class="bg-border"></div>

    <div class="flex font-mono flex-col gap-1 justify-center items-center">
      <div class="size-6 absolute top-12 right-4 text-text-secondary">
        <SettingButton />
      </div>
      <div class="flex flex-col gap-6 items-center justify-center">
        <SummarizeButton
          isLoading={summaryStore.isLoading}
          isChapterLoading={summaryStore.isChapterLoading}
        />
      </div>
    </div>

    <div class="bg-border"></div>

    <div
      class="top-stripes flex justify-center items-center w-full h-full"
    ></div>

    <div class="bg-border"></div>

    <div
      class="relative prose prose-h2:mt-4 p z-10 flex flex-col gap-6 p-6 pt-10 pb-[50vh] max-w-3xl w-full mx-auto"
    >
      <TabNavigation
        {activeTab}
        {showTabNavigation}
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

  <div
    class="fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
