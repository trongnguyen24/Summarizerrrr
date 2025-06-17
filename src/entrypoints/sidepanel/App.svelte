<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import SettingButton from '../../components/SettingButton.svelte'
  import SummarizeButton from '../../components/SummarizeButton.svelte'
  import TabNavigation from '../../components/TabNavigation.svelte' // Vẫn cần cho các component wrapper
  import SummaryDisplay from '../../components/SummaryDisplay.svelte' // Component hiển thị chung
  import UdemyConceptsDisplay from '../../components/displays/UdemyConceptsDisplay.svelte' // Component nội dung Udemy Concepts // Component nội dung Udemy Summary (đã đổi tên)
  import UdemyVideoSummary from '../../components/displays/UdemyVideoSummary.svelte' // Component nội dung Udemy Video Summary (mới tạo)
  import YouTubeChapterSummary from '../../components/displays/YouTubeChapterSummary.svelte' // Component nội dung YouTube Chapter
  import YouTubeVideoSummary from '../../components/displays/YouTubeVideoSummary.svelte' // Component nội dung YouTube Video
  import WebSummaryDisplay from '../../components/displays/WebSummaryDisplay.svelte' // Component nội dung Web Summary
  import SelectedTextSummaryDisplay from '../../components/displays/SelectedTextSummaryDisplay.svelte' // Component nội dung Selected Text Summary
  import YouTubeSummaryDisplay from '../../components/displays/YouTubeSummaryDisplay.svelte' // Component wrapper YouTube
  import UdemySummaryDisplay from '../../components/displays/UdemySummaryDisplay.svelte' // Component wrapper Udemy (mới tạo)
  import 'webextension-polyfill'

  // Import trực tiếp các biến và hàm từ các store đã refactor
  import {
    summaryState, // Import the summaryState object
    summarizeSelectedText,
    resetDisplayState,
    updateVideoActiveStates, // Updated import
    fetchAndSummarize,
    updateActiveUdemyTab, // New import
    updateActiveYouTubeTab, // Import updateActiveYouTubeTab
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
    settings, // Import settings
    loadSettings,
    subscribeToSettingsChanges,
  } from '../../stores/settingsStore.svelte.js' // Import loadSettings và subscribeToSettingsChanges

  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'

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

  // Sử dụng $effect để cập nhật lớp font trên body khi settings.selectedFont thay đổi
  $effect(() => {
    if (document.body && settings.selectedFont) {
      // Xóa tất cả các lớp font cũ
      document.body.classList.remove(
        'font-default',
        'font-noto-serif',
        'font-opendyslexic',
        'font-noto-mix'
      )
      // Thêm lớp font mới
      document.body.classList.add(`font-${settings.selectedFont}`)
    }
  })

  // Logic xử lý message từ background script (sử dụng cổng kết nối)
  $effect(() => {
    const port = browser.runtime.connect({ name: 'side-panel' })
    console.log('[App.svelte] Connected to background script.')

    const handleMessage = (request) => {
      if (request.action === 'tabUpdated') {
        console.log('[App.svelte] Received tabUpdated message:', request)
        setTabTitle(request.tabTitle)
        updateVideoActiveStates(request.isYouTube, request.isUdemy) // Update video active states
      } else if (request.action === 'currentTabInfo') {
        console.log('[App.svelte] Received currentTabInfo response:', request)
        setTabTitle(request.tabTitle)
        updateVideoActiveStates(request.isYouTube, request.isUdemy) // Update video active states
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
      } else if (request.action === 'udemyTranscriptAvailable') {
        console.log(
          '[App.svelte] Received udemyTranscriptAvailable message:',
          $state.snapshot(request)
        )
        // Khi transcript Udemy có sẵn, kích hoạt tóm tắt và giải thích khái niệm
        // Chỉ kích hoạt nếu chưa có tóm tắt Udemy hoặc đang không loading
        if (!summaryState.udemySummary && !summaryState.isUdemyLoading) {
          resetDisplayState()
          summaryState.lastSummaryTypeDisplayed = 'udemy' // Đặt loại hiển thị là Udemy
          updateActiveUdemyTab('udemySummary') // Mặc định hiển thị tab tóm tắt
          fetchAndSummarize() // Kích hoạt quá trình tóm tắt và giải thích
        } else {
          console.log(
            '[App.svelte] Udemy summary already exists or is loading, skipping fetchAndSummarize.'
          )
        }
      }
    }

    port.onMessage.addListener(handleMessage)

    return () => {
      port.onMessage.removeListener(handleMessage)
      port.disconnect()
      console.log('[App.svelte] Disconnected from background script.')
    }
  })

  // Tạo biến derived để kiểm tra xem có bất kỳ phần tóm tắt Udemy nào đang tải không
  const isAnyUdemyLoading = $derived(
    summaryState.isUdemySummaryLoading || summaryState.isUdemyConceptsLoading
  )

  // Handle summarize button click
  // Đăng ký event listener toàn cục và đảm bảo nó được hủy khi component bị hủy
  $effect(() => {
    const handleSummarizeClick = () => {
      resetDisplayState() // Reset display state before new summarization
      fetchAndSummarize() // Gọi hàm từ summaryStore
    }

    document.addEventListener('summarizeClick', handleSummarizeClick)

    return () => {
      document.removeListener('summarizeClick', handleSummarizeClick)
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
          isLoading={summaryState.isLoading || isAnyUdemyLoading}
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
      {#if summaryState.lastSummaryTypeDisplayed === 'youtube'}
        <YouTubeSummaryDisplay
          activeYouTubeTab={summaryState.activeYouTubeTab}
        />
      {:else if summaryState.lastSummaryTypeDisplayed === 'udemy'}
        <UdemySummaryDisplay activeUdemyTab={summaryState.activeUdemyTab} />
      {:else if summaryState.lastSummaryTypeDisplayed === 'selectedText'}
        <SelectedTextSummaryDisplay
          selectedTextSummary={summaryState.selectedTextSummary}
          isSelectedTextLoading={summaryState.isSelectedTextLoading}
          selectedTextError={summaryState.selectedTextError}
        />
      {:else if summaryState.lastSummaryTypeDisplayed === 'web'}
        <WebSummaryDisplay
          summary={summaryState.summary}
          isLoading={summaryState.isLoading}
          error={summaryState.error}
        />
      {/if}
    </div>
  </div>

  <div
    class="fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
