<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'

  import {
    settings,
    loadSettings,
    updateSettings,
    subscribeToSettingsChanges,
  } from '@/stores/settingsStore.svelte.js'
  import {
    themeSettings,
    loadThemeSettings,
    subscribeToShadowThemeChanges,
  } from '@/stores/themeStore.svelte.js'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade'
  import { summaryState } from '../../stores/summaryStore.svelte.js'
  import FloatingButton from './components/FloatingButton.svelte'
  import FloatingPanel from './components/FloatingPanel.svelte'
  import MobileSheet from './components/MobileSheet.svelte'
  import BlacklistConfirmModal from './components/BlacklistConfirmModal.svelte'
  import { useNavigationManager } from './composables/useNavigationManager.svelte.js'
  import { useOneClickSummarization } from './composables/useOneClickSummarization.svelte.js'
  import { shouldShowFab } from '@/services/fabPermissionService.js'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  import '@fontsource/mali'

  let isPanelVisible = $state(false) // Add $state
  let isMobile = $state(false) // Add $state
  let showBlacklistConfirm = $state(false)
  let shadowContainer = $state(null) // Shadow DOM container reference
  let navigationManager = useNavigationManager()
  let unsubscribeNavigation = null
  let currentUrlKey = $state(window.location.href)
  let themeUnsubscribe = null

  // One-click summarization
  let oneClickSummarization = useOneClickSummarization()

  // Quick Summary mode (triggered by qs=1 URL param from background tab)
  let isQuickSummaryMode = $state(false)

  // Quick Summary cleanup references (for memory leak prevention)
  let emojiInterval = null
  let titleObserver = null

  // Cleanup function for emoji tracking
  function cleanupEmojiTracking() {
    if (emojiInterval) {
      clearInterval(emojiInterval)
      emojiInterval = null
    }
    if (titleObserver) {
      titleObserver.disconnect()
      titleObserver = null
    }
  }

  /**
   * Wait for page to be ready for summarization
   * Handles SPA loading by waiting for:
   * 1. Document ready state
   * 2. Main content elements to appear
   * 3. Network idle (no pending requests)
   */
  async function waitForPageReady(maxWaitMs = 10000) {
    const startTime = Date.now()

    // Wait for document ready state
    if (document.readyState !== 'complete') {
      await new Promise((resolve) => {
        const handler = () => {
          if (document.readyState === 'complete') {
            window.removeEventListener('load', handler)
            resolve()
          }
        }
        window.addEventListener('load', handler)
        // Fallback timeout
        setTimeout(resolve, 3000)
      })
    }

    // Wait for main content indicators (common patterns)
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '#content',
      '.post',
      '.article',
      '.entry-content',
      '.post-content',
    ]

    const checkContent = () => {
      for (const selector of contentSelectors) {
        const el = document.querySelector(selector)
        if (el && el.textContent.trim().length > 100) {
          return true
        }
      }
      // Fallback: check if body has substantial text
      return document.body?.innerText?.length > 500
    }

    // Poll for content with timeout
    while (!checkContent() && Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 500))
    }

    // Additional short delay for any final rendering
    await new Promise((r) => setTimeout(r, 500))

    console.log(
      `[App] Page ready check completed in ${Date.now() - startTime}ms`,
    )
  }

  let isFabAllowedOnDomain = $derived.by(() => {
    // Use the same matching logic as main.js for consistency
    return shouldShowFab(window.location.href, settings.fabDomainControl)
  })

  // Initialize stores
  $effect(() => {
    loadSettings()
    subscribeToSettingsChanges()
  })

  // Initialize shadow theme when component mounts
  $effect(() => {
    if (shadowContainer) {
      // Just load the theme settings, direct application is handled by $effect below
      loadThemeSettings()
      // Subscribe to theme changes for real-time updates
      themeUnsubscribe = subscribeToShadowThemeChanges(shadowContainer)
    }
  })

  // Apply font family based on settings to shadow DOM
  $effect(() => {
    if (shadowContainer && settings.selectedFont !== undefined) {
      // Map selectedFont to corresponding CSS class
      const fontClassMap = {
        default: 'font-default',
        'noto-serif': 'font-noto-serif',
        opendyslexic: 'font-opendyslexic',
        mali: 'font-mali',
      }

      const fontClass = fontClassMap[settings.selectedFont] || 'font-default'

      // Remove existing font classes and add the new one
      shadowContainer.className = shadowContainer.className
        .split(' ')
        .filter((c) => !c.startsWith('font-'))
        .join(' ')
      shadowContainer.classList.add(fontClass)
    }
  })

  // Apply theme based on themeSettings to shadow DOM
  $effect(() => {
    if (shadowContainer && themeSettings.theme !== undefined) {
      const apply = (theme) => {
        if (theme === 'dark') {
          shadowContainer.classList.add('dark')
        } else {
          shadowContainer.classList.remove('dark')
        }
      }

      if (themeSettings.theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light'
        apply(systemTheme)
      } else {
        apply(themeSettings.theme)
      }
    }
  })

  // Apply reduce motion setting to shadow DOM
  $effect(() => {
    if (shadowContainer && settings.reduceMotion !== undefined) {
      shadowContainer.dataset.reduceMotion = settings.reduceMotion
        ? 'true'
        : 'false'
    }
  })

  onMount(() => {
    const checkMobile = () => {
      // Đặt threshold thấp hơn để ưu tiên sidepanel trên desktop/tablet
      isMobile = window.innerWidth < 480
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Bắt đầu monitoring navigation changes
    // (Đã sửa: không override History API để tránh scroll issue trên Reddit)
    navigationManager.startMonitoring()
    unsubscribeNavigation = navigationManager.subscribe(handleUrlChange)

    // Listen for system theme changes to update shadow DOM
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (shadowContainer && themeSettings.theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        if (systemTheme === 'dark') {
          shadowContainer.classList.add('dark')
        } else {
          shadowContainer.classList.remove('dark')
        }
      }
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TOGGLE_FLOATING_PANEL') {
        togglePanel()
      }

      // Quick Summary mode: triggered by background script after opening tab
      if (message.type === 'QUICK_SUMMARY_TRIGGER') {
        // Only trigger once - ignore retry messages
        if (isQuickSummaryMode) {
          console.log('[App] Quick Summary already triggered, ignoring')
          if (sendResponse)
            sendResponse({ success: true, alreadyTriggered: true })
          return
        }

        console.log('[App] Quick Summary trigger received:', message.videoId)

        // Set Quick Summary mode (prevents re-triggering)
        isQuickSummaryMode = true

        // ===== PAUSE YOUTUBE VIDEO (only if autoplayMode is 'pause') =====
        // Get autoplay mode from message (default to 'pause' for backward compatibility)
        const autoplayMode = message.autoplayMode || 'pause'
        console.log('[App] Quick Summary autoplay mode:', autoplayMode)

        if (autoplayMode === 'pause') {
          // Pause video immediately to prevent autoplay in background tab
          const pauseVideo = () => {
            const video = document.querySelector('video.html5-main-video')
            if (video && !video.paused) {
              video.pause()
              console.log('[App] Quick Summary: Video paused')
              return true
            }
            return false
          }

          // Try to pause immediately
          pauseVideo()

          // Watch for video element appearing (YouTube loads video async)
          const videoObserver = new MutationObserver(() => {
            if (pauseVideo()) {
              videoObserver.disconnect()
            }
          })

          videoObserver.observe(document.body, {
            childList: true,
            subtree: true,
          })

          // Also try pausing every 100ms for first 3 seconds (reliable fallback)
          let pauseAttempts = 0
          const pauseInterval = setInterval(() => {
            pauseAttempts++
            if (pauseVideo() || pauseAttempts >= 30) {
              clearInterval(pauseInterval)
              videoObserver.disconnect()
            }
          }, 100)

          // Cleanup observer after 5s max
          setTimeout(() => {
            videoObserver.disconnect()
            clearInterval(pauseInterval)
          }, 5000)
        } else {
          console.log('[App] Quick Summary: Video autoplay kept (auto mode)')
        }
        // ===== END PAUSE YOUTUBE VIDEO =====

        // Track current emoji state and base title (without emoji)
        let currentEmoji = '⏳'
        // Regex with alternation for multi-byte emoji characters
        const emojiPattern = /^(⏳|🎉|🤯)\s*/
        let baseTitle = document.title.replace(emojiPattern, '') // Remove any existing emoji

        // Function to ensure emoji is present in title
        const ensureEmojiInTitle = () => {
          const currentTitle = document.title
          // Check if title doesn't start with our emoji
          if (!currentTitle.startsWith(currentEmoji)) {
            // Get base title (remove any emoji prefix if exists)
            baseTitle = currentTitle.replace(emojiPattern, '')
            document.title = `${currentEmoji} ${baseTitle}`
          }
        }

        // Apply emoji immediately
        ensureEmojiInTitle()

        // Watch for title changes using MutationObserver
        const titleElement = document.querySelector('title')

        // Cleanup any existing observers/intervals before creating new ones
        cleanupEmojiTracking()

        if (titleElement) {
          titleObserver = new MutationObserver(() => {
            ensureEmojiInTitle()
          })

          titleObserver.observe(titleElement, {
            childList: true,
            characterData: true,
            subtree: true,
          })
        }

        // Also use interval as fallback (some SPAs don't trigger mutations)
        emojiInterval = setInterval(ensureEmojiInTitle, 1000)

        // Auto-trigger summarization
        isPanelVisible = true
        oneClickSummarization
          .summarizePageContent()
          .then(() => {
            // Update emoji to success when done
            const checkSummaryDone = setInterval(() => {
              const status = oneClickSummarization.statusToDisplay()
              if (!status.isLoading) {
                currentEmoji = '🎉'
                ensureEmojiInTitle()
                // Update internal state to prevent re-summary on FAB click
                oneClickSummarization.markSummaryAsGenerated()
                clearInterval(checkSummaryDone)
                // Cleanup emoji tracking after success
                cleanupEmojiTracking()
              }
            }, 500)

            // Cleanup after 60s max
            setTimeout(() => clearInterval(checkSummaryDone), 60000)
          })
          .catch((error) => {
            // Show error emoji on failure
            console.error('[App] Quick Summary failed:', error)
            currentEmoji = '🤯'
            ensureEmojiInTitle()
            // Cleanup emoji tracking after error
            cleanupEmojiTracking()
          })
        // Send response immediately to stop background retries
        if (sendResponse)
          sendResponse({ success: true, alreadyTriggered: false })
      }

      // Generic Quick Summary mode: triggered by context menu on non-YouTube links
      if (message.type === 'QUICK_SUMMARY_TRIGGER_GENERIC') {
        // Wrap in async IIFE since message listeners don't support async directly
        ;(async () => {
          // Prevent duplicate triggers
          if (isQuickSummaryMode) {
            console.log('[App] Quick Summary already triggered, ignoring')
            if (sendResponse)
              sendResponse({ success: true, alreadyTriggered: true })
            return
          }

          console.log('[App] Generic Quick Summary trigger received')
          isQuickSummaryMode = true
          if (sendResponse)
            sendResponse({ success: true, alreadyTriggered: false })

          // Track emoji state for title
          let currentEmoji = '⏳'
          const emojiPattern = /^(⏳|🎉|🤯)\s*/
          let baseTitle = document.title.replace(emojiPattern, '')

          const ensureEmojiInTitle = () => {
            const currentTitle = document.title
            if (!currentTitle.startsWith(currentEmoji)) {
              baseTitle = currentTitle.replace(emojiPattern, '')
              document.title = `${currentEmoji} ${baseTitle}`
            }
          }

          ensureEmojiInTitle()

          // Watch for title changes
          const titleElement = document.querySelector('title')
          cleanupEmojiTracking()

          if (titleElement) {
            titleObserver = new MutationObserver(() => {
              ensureEmojiInTitle()
            })
            titleObserver.observe(titleElement, {
              childList: true,
              characterData: true,
              subtree: true,
            })
          }

          emojiInterval = setInterval(ensureEmojiInTitle, 1000)

          // Wait for page content to be ready (handles SPA loading)
          await waitForPageReady()

          // Auto-trigger summarization
          isPanelVisible = true
          oneClickSummarization
            .summarizePageContent()
            .then(() => {
              const checkSummaryDone = setInterval(() => {
                const status = oneClickSummarization.statusToDisplay()
                if (!status.isLoading) {
                  currentEmoji = '🎉'
                  ensureEmojiInTitle()
                  // Update internal state to prevent re-summary on FAB click
                  oneClickSummarization.markSummaryAsGenerated()
                  clearInterval(checkSummaryDone)
                  cleanupEmojiTracking()
                }
              }, 500)
              setTimeout(() => clearInterval(checkSummaryDone), 60000)
            })
            .catch((error) => {
              console.error('[App] Generic Quick Summary failed:', error)
              currentEmoji = '🤯'
              ensureEmojiInTitle()
              cleanupEmojiTracking()
            })
        })()
      }
    })

    return () => {
      window.removeEventListener('resize', checkMobile)
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
      // Cleanup navigation monitoring
      if (unsubscribeNavigation) {
        unsubscribeNavigation()
      }
      navigationManager.stopMonitoring()
    }
  })

  // Lazy URL check - reset content nếu URL đã thay đổi
  function checkAndResetForCurrentUrl() {
    const currentUrl = window.location.href
    if (currentUrl !== currentUrlKey) {
      console.log('[App] URL changed (lazy check):', currentUrl)
      currentUrlKey = currentUrl
      oneClickSummarization.resetDisplayStateOnly()
      oneClickSummarization.initializeForUrl(currentUrl, () => {
        isPanelVisible = true
      })
      return true // URL changed
    }
    return false // URL same
  }

  function togglePanel() {
    // LUÔN check URL và reset nếu cần trước khi toggle
    // Quan trọng cho SPA navigation (YouTube) khi periodic check không notify
    const urlChanged = checkAndResetForCurrentUrl()

    // Nếu URL thay đổi và đang mở panel, giữ panel mở với nội dung mới
    if (urlChanged && isPanelVisible) {
      // Panel đã mở, chỉ cần refresh content (đã làm trong checkAndResetForCurrentUrl)
      return
    }

    isPanelVisible = !isPanelVisible
  }

  // Handle one-click summarization
  async function handleOneClickSummarization() {
    // Check URL trước khi summarize
    checkAndResetForCurrentUrl()
    return await oneClickSummarization.handleFloatingButtonClick()
  }

  function handleBlacklistRequest() {
    showBlacklistConfirm = true
  }

  // Initialize one-click when component mounts
  $effect(() => {
    if (settings && shadowContainer) {
      oneClickSummarization.initializeForUrl(window.location.href, () => {
        isPanelVisible = true
      })
    }
  })

  function handleUrlChange(newUrl) {
    console.log('[App] URL changed to:', newUrl)

    // Đóng panel để tránh hiển thị nội dung cũ
    isPanelVisible = false

    // Reset display state (clear panel) nhưng GIỮ cache
    oneClickSummarization.resetDisplayStateOnly()

    // Update URL key để force re-render components
    currentUrlKey = newUrl

    // Initialize one-click cho URL mới (không auto-restore)
    oneClickSummarization.initializeForUrl(newUrl, () => {
      isPanelVisible = true
    })
  }

  onDestroy(() => {
    // Cleanup navigation monitoring
    if (unsubscribeNavigation) {
      unsubscribeNavigation()
    }
    navigationManager.stopMonitoring()

    // Cleanup theme subscription
    if (themeUnsubscribe) {
      themeUnsubscribe()
    }

    // Cleanup Quick Summary emoji tracking
    cleanupEmojiTracking()
  })
</script>

<div bind:this={shadowContainer} class="floating-ui-root absolute top-0 left-0">
  <!-- rerender when settings.floatButton changes -->
  {#if settings.showFloatingButton && !showBlacklistConfirm && isFabAllowedOnDomain}
    {#key settings.floatButton}
      <FloatingButton
        topButton={settings.floatButton}
        toggle={togglePanel}
        oneClickHandler={handleOneClickSummarization}
        buttonState={oneClickSummarization.oneClickState().buttonState}
        onBlacklistRequest={handleBlacklistRequest}
        isOpen={isPanelVisible}
      />
    {/key}
  {/if}

  {#if showBlacklistConfirm}
    <BlacklistConfirmModal onclose={() => (showBlacklistConfirm = false)} />
  {/if}
  {#if isMobile}
    {#key currentUrlKey}
      <MobileSheet
        visible={isPanelVisible}
        onclose={() => (isPanelVisible = false)}
        summarization={oneClickSummarization}
      />
    {/key}
  {:else}
    <!-- Sidepanel for desktop/tablet -->
    {#key currentUrlKey}
      <FloatingPanel
        visible={isPanelVisible}
        onclose={() => (isPanelVisible = false)}
        summary={oneClickSummarization.summaryToDisplay()}
        status={oneClickSummarization.statusToDisplay()}
        summarization={oneClickSummarization}
      >
        {#snippet settingsMini()}
          <!-- <SettingsMini /> -->
          <div>Settings Mini (placeholder)</div>
        {/snippet}
      </FloatingPanel>
    {/key}
  {/if}
</div>
