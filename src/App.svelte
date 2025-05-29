<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import SettingButton from './components/SettingButton.svelte'
  import SummarizeButton from './components/SummarizeButton.svelte'
  import TabNavigation from './components/TabNavigation.svelte'
  import SummaryDisplay from './components/SummaryDisplay.svelte'

  // Import trực tiếp các biến và hàm từ các store đã refactor
  import {
    summaryState, // Import the summaryState object
    summarizeSelectedText,
    resetDisplayState,
    updateIsYouTubeVideoActive,
    fetchAndSummarize,
  } from './stores/summaryStore.svelte.js'
  import {
    getTheme,
    initializeTheme,
    setTheme,
    subscribeToSystemThemeChanges,
  } from './stores/themeStore.svelte'
  import { getTabTitle, setTabTitle } from './stores/tabTitleStore.svelte.js'
  import {
    loadSettings,
    subscribeToSettingsChanges,
  } from './stores/settingsStore.svelte.js' // Import loadSettings và subscribeToSettingsChanges

  import '@fontsource-variable/geist-mono'

  const options = {
    scrollbars: {
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Sử dụng $effect để khởi tạo OverlayScrollbars và các listeners
  $effect(() => {
    initialize(document.body)

    // Gọi các hàm khởi tạo và đăng ký lắng nghe
    loadSettings()
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges() // Đăng ký lắng nghe theme hệ thống
    subscribeToSettingsChanges() // Đăng ký lắng nghe thay đổi settings

    // Hàm cleanup cho $effect
    return () => {
      unsubscribeTheme() // Hủy đăng ký lắng nghe theme hệ thống
      // Không cần hủy đăng ký settings vì onStorageChange không trả về hàm hủy
    }
  })

  // LOẠI BỎ $effect cũ lắng nghe sự thay đổi theme của hệ thống
  // Logic này đã được chuyển vào subscribeToSystemThemeChanges và được gọi trong $effect trên

  // Logic xử lý message từ background script
  $effect(() => {
    const handleMessage = (request, sender, sendResponse) => {
      if (request.action === 'tabUpdated') {
        console.log('[App.svelte] Received tabUpdated message:', request)
        updateIsYouTubeVideoActive(request.isYouTube) // Hàm này vẫn được export riêng
        setTabTitle(request.tabTitle) // Cập nhật trực tiếp tabTitle
      } else if (request.action === 'currentTabInfo') {
        console.log('[App.svelte] Received currentTabInfo response:', request)
        setTabTitle(request.tabTitle) // Cập nhật trực tiếp tabTitle
        updateIsYouTubeVideoActive(request.isYouTube) // Hàm này vẫn được export riêng
      } else if (request.action === 'displaySummary') {
        console.log('[App.svelte] Received displaySummary message:', request)
        summaryState.summary = request.summary // Cập nhật trực tiếp thuộc tính
        summaryState.error = request.error ? request.summary : null // Cập nhật trực tiếp thuộc tính
      } else if (request.action === 'summarizeSelectedText') {
        console.log(
          '[App.svelte] Received summarizeSelectedText message:',
          request
        )
        summarizeSelectedText(request.selectedText)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    // Request current tab info from background script on mount
    chrome.runtime
      .sendMessage({ action: 'requestCurrentTabInfo' })
      .catch((error) => {
        console.warn(
          '[App.svelte] Could not send requestCurrentTabInfo message:',
          error
        )
      })

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  })

  // Handle summarize button click
  // Đây là một event listener toàn cục, có thể giữ nguyên hoặc xem xét lại cách truyền event
  document.addEventListener('summarizeClick', () => {
    resetDisplayState() // Reset display state before new summarization
    fetchAndSummarize() // Gọi hàm từ summaryStore
  })
</script>

<div class="flex flex-col">
  <div class="grid grid-rows-[32px_1px_8px_1px_180px_1px_8px_1px_1fr] h-screen">
    <div class=" flex justify-center items-center w-full h-full">
      <div class="text-text-secondary">
        <div class="line-clamp-1 text-[0.75rem] px-2 text-text-secondary">
          {getTabTitle()}
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
          isLoading={summaryState.isLoading}
          isChapterLoading={summaryState.isChapterLoading}
        />
      </div>
    </div>

    <div class="bg-border"></div>

    <div
      class="top-stripes flex justify-center items-center w-full h-full"
    ></div>

    <div class="bg-border"></div>

    <div
      class="relative prose prose-h2:mt-4 p z-10 flex flex-col gap-6 p-6 pt-10 pb-[50vh] max-w-3xl w-screen mx-auto"
    >
      <SummaryDisplay />
    </div>
  </div>

  <div
    class="fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
