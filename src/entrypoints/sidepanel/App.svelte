<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import SettingButton from '../../components/SettingButton.svelte'
  import SummarizeButton from '../../components/SummarizeButton.svelte'
  import TabNavigation from '../../components/TabNavigation.svelte'
  import SummaryDisplay from '../../components/SummaryDisplay.svelte'
  import 'webextension-polyfill'

  // Import trực tiếp các biến và hàm từ các store đã refactor
  import {
    summaryState, // Import the summaryState object
    summarizeSelectedText,
    resetDisplayState,
    updateIsYouTubeVideoActive,
    fetchAndSummarize,
  } from '../../stores/summaryStore.svelte.js'
  import {
    getTheme,
    initializeTheme,
    setTheme,
    subscribeToSystemThemeChanges,
  } from '../../stores/themeStore.svelte.js'
  import {
    tabTitle, // Import the writable store
    setTabTitle,
  } from '../../stores/tabTitleStore.svelte.js'
  import {
    loadSettings,
    subscribeToSettingsChanges,
  } from '../../stores/settingsStore.svelte.js' // Import loadSettings và subscribeToSettingsChanges

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

  // Logic xử lý message từ background script (sử dụng cổng kết nối)
  $effect(() => {
    const port = browser.runtime.connect({ name: 'side-panel' })
    console.log('[App.svelte] Connected to background script.')

    const handleMessage = (request) => {
      if (request.action === 'tabUpdated') {
        console.log('[App.svelte] Received tabUpdated message:', request)
        setTabTitle(request.tabTitle)
      } else if (request.action === 'currentTabInfo') {
        console.log('[App.svelte] Received currentTabInfo response:', request)
        setTabTitle(request.tabTitle)
      } else if (request.action === 'displaySummary') {
        console.log(
          '[App.svelte] Received displaySummary message:',
          $state.snapshot(request)
        )
        summaryState.summary = request.summary
        summaryState.error = request.error ? request.summary : null
      } else if (request.action === 'summarizeSelectedText') {
        console.log(
          '[App.svelte] Received summarizeSelectedText message:',
          $state.snapshot(request)
        )
        resetDisplayState()
        summaryState.lastSummaryTypeDisplayed = 'selectedText'
        summarizeSelectedText(request.selectedText)
      }
    }

    port.onMessage.addListener(handleMessage)

    return () => {
      port.onMessage.removeListener(handleMessage)
      port.disconnect()
      console.log('[App.svelte] Disconnected from background script.')
    }
  })

  // Handle summarize button click
  // Đăng ký event listener toàn cục và đảm bảo nó được hủy khi component bị hủy
  $effect(() => {
    const handleSummarizeClick = () => {
      resetDisplayState() // Reset display state before new summarization
      fetchAndSummarize() // Gọi hàm từ summaryStore
    }

    document.addEventListener('summarizeClick', handleSummarizeClick)

    return () => {
      document.removeEventListener('summarizeClick', handleSummarizeClick)
    }
  })
</script>

<div class="flex min-w-[22.5rem] w-full flex-col">
  <div class="grid grid-rows-[32px_1px_8px_1px_160px_1px_8px_1px_1fr] h-screen">
    <div class=" flex justify-center items-center w-full h-full">
      <div class="text-text-secondary">
        <div class="line-clamp-1 text-[0.75rem] px-2 text-text-secondary">
          {$tabTitle}
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
      class="relative prose prose-h2:mt-4 p z-10 flex flex-col gap-8 px-6 pt-8 pb-[50vh] max-w-3xl w-screen mx-auto"
    >
      <SummaryDisplay />
    </div>
  </div>

  <div
    class="fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
