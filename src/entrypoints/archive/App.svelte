<script>
  // @ts-nocheck
  import { onMount } from 'svelte'
  import { t, locale } from 'svelte-i18n'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { appStateStorage } from '@/services/wxtStorageService.js'
  import SidePanel from './SidePanel.svelte'
  import SidebarLayout from '@/components/ui/SidebarLayout.svelte'
  import {
    settings,
    loadSettings,
    subscribeToSettingsChanges,
  } from '@/stores/settingsStore.svelte.js'
  import {
    initializeTheme,
    subscribeToSystemThemeChanges,
    themeSettings,
    applyThemeToDocument,
  } from '@/stores/themeStore.svelte.js'
  import SummaryDisplay from '@/entrypoints/archive/components/displays/SummaryDisplay.svelte'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  import '@fontsource/mali'
  import { formatDate } from '@/lib/utils/utils.js'
  import { archiveStore } from '@/stores/archiveStore.svelte.js'
  import { kindFilterStore } from '@/stores/kindFilterStore.svelte.js'
  import { archiveFilterStore } from '@/stores/archiveFilterStore.svelte.js'
  import { visibleArchiveList } from '@/lib/utils/archiveListFilter.js'
  import { conversationArchiveStore } from '@/stores/conversationArchiveStore.svelte.js'
  import ConversationTranscript from '@/entrypoints/archive/components/displays/ConversationTranscript.svelte'

  // State management
  // Owned by the shell (SidebarLayout) but read here, so it is bindable.
  let sidebarOpen = $state(window.innerWidth >= 768) // Initialize based on current window size
  let activeTab = $state('history') // Local state for active tab
  // Lives here, not in SidePanel: the panel unmounts when hidden on mobile,
  // and the arrow keys must keep following the search either way.
  let searchQuery = $state('')
  let visibleList = $derived(
    visibleArchiveList(archiveStore.unifiedListFor(activeTab), {
      activeTab,
      selectedKind: kindFilterStore.selectedKind,
      selectedTagIds: archiveFilterStore.selectedTagIds,
      searchQuery,
    }),
  )

  // Overlay scrollbars configuration
  const scrollOptions = {
    scrollbars: {
      visibility: 'auto',
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initializeScrollbars] = useOverlayScrollbars({
    options: scrollOptions,
    defer: true,
  })

  // Event handlers
  async function refreshArchiveData() {
    // loadData refreshes summaries, history and conversations together
    await archiveStore.loadData()
  }

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  // Scroll to heading matching URL hash
  function scrollToHashHeading(retryCount = 0) {
    const hash = window.location.hash
    if (!hash || hash.length <= 1) return

    const targetId = hash.substring(1) // Remove the # character
    // Extract base ID from hash (remove random suffix like "-604d")
    const targetBaseId = targetId.replace(/-[a-z0-9]{4}$/, '')

    // First try exact match
    let element = document.getElementById(targetId)

    // If not found, try to find heading with matching base ID
    // (TOCArchive generates new random suffix each time)
    if (!element) {
      const headings = document.querySelectorAll('h2[id], h3[id], h4[id]')
      for (const heading of headings) {
        // Extract base ID from heading (remove random suffix)
        const headingBaseId = heading.id.replace(/-[a-z0-9]{4}$/, '')
        // Match base IDs
        if (headingBaseId === targetBaseId) {
          element = heading
          break
        }
      }
    }

    if (element) {
      element.scrollIntoView({ behavior: 'auto', block: 'start' })
      // Add highlight effect
      element.classList.add('animate-pulse')
      setTimeout(() => {
        element.classList.remove('animate-pulse')
      }, 4000)
    } else if (retryCount < 5) {
      // Retry after delay if heading not found yet (TOC may not have generated IDs)
      setTimeout(() => scrollToHashHeading(retryCount + 1), 300)
    }
  }

  // Effects
  $effect(() => {
    // Initialize OverlayScrollbars only on non-touch devices
    if (!isTouchDevice()) {
      initializeScrollbars(document.body)
    }
    archiveStore.loadData().then((result) => {
      if (result && result.activeTab) {
        activeTab = result.activeTab // Set initial activeTab from URL
      }
      // Scroll to hash after data is loaded
      setTimeout(scrollToHashHeading, 100)
    })

    // Listen for archive updates
    const unsubscribe = appStateStorage.watch((newValue, oldValue) => {
      if (newValue && newValue.data_updated_at !== oldValue?.data_updated_at) {
        archiveStore.loadData()
      }
    })

    // Keyboard navigation for arrow keys
    async function handleKeydown(e) {
      // Don't navigate if user is typing in an input/textarea
      const activeElement = document.activeElement
      const isTyping =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable

      if (isTyping) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (await archiveStore.navigatePrevious(activeTab, visibleList)) {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (await archiveStore.navigateNext(activeTab, visibleList)) {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    }
    window.addEventListener('keydown', handleKeydown)

    // Return cleanup function
    return () => {
      unsubscribe()
      window.removeEventListener('keydown', handleKeydown)
    }
  })

  // Sync i18n locale with settings store (moved from the old TabArchive)
  $effect(() => {
    const newLocale = settings.uiLang
    if (newLocale && newLocale !== $locale) {
      locale.set(newLocale)
    }
  })

  $effect(() => {
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    return unsubscribeTheme
  })

  // Apply reduce motion setting to DOM
  $effect(() => {
    // Track the setting value to make this effect reactive
    const _reduceMotion = settings.reduceMotion
    import('@/services/animationService.js').then(
      ({ applyReduceMotionToDOM }) => {
        applyReduceMotionToDOM()
      },
    )
  })

  $effect(() => {
    archiveStore.validateSelectedItem(activeTab)
  })

  loadSettings().then(() => {
    subscribeToSettingsChanges()
  })
</script>

<!--
<Logdev /> -->

<main class="flex text-sm relative min-h-vh bg-background text-text-primary">
  <SidebarLayout bind:open={sidebarOpen}>
    {#snippet sidebar({ closeOnMobile })}
      <SidePanel
        list={archiveStore.unifiedListFor(activeTab)}
        selectedKey={archiveStore.selectedKey}
        selectItem={(item) => {
          archiveStore.selectItem(item, activeTab)
          // Auto-close sidepanel on mobile when selecting an item
          closeOnMobile()
        }}
        {activeTab}
        selectTab={(tabName) => {
          activeTab = tabName
          archiveStore.selectTab(tabName) // Select first item of new tab
        }}
        onRefresh={refreshArchiveData}
        bind:searchQuery
      />
    {/snippet}

    <!-- The detail pane follows the selected row's kind, not the tab -->
    {#if archiveStore.selectedKind === 'chat'}
      <ConversationTranscript
        conversation={conversationArchiveStore.selectedConversation}
        messages={conversationArchiveStore.selectedMessages}
        sources={conversationArchiveStore.selectedSources}
        onRefresh={refreshArchiveData}
        isSidePanelVisible={sidebarOpen}
        {activeTab}
      />
    {:else}
      <SummaryDisplay
        selectedSummary={archiveStore.selectedSummary}
        {formatDate}
        {activeTab}
        archiveList={archiveStore.archiveList}
        isSidePanelVisible={sidebarOpen}
      />
    {/if}
    <div
      class="sticky bg-linear-to-t from-surface-1 to-surface-1/40 bottom-8 md:bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-10 pointer-events-none"
    ></div>
  </SidebarLayout>
</main>
