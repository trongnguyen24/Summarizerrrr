<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { getTocMode, toggleTocMode } from '@/stores/tocModeStore.svelte.js'
  import { archiveStore } from '@/stores/archiveStore.svelte.js'

  const { targetDivId, activeTab = 'history' } = $props()

  // Navigation state
  let canGoPrev = $derived(archiveStore.canNavigatePrevious(activeTab))
  let canGoNext = $derived(archiveStore.canNavigateNext(activeTab))

  function handleNavigatePrev() {
    if (archiveStore.navigatePrevious(activeTab)) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleNavigateNext() {
    if (archiveStore.navigateNext(activeTab)) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Reactive check for toc mode
  let tocMode = $derived(getTocMode())

  let headings = $state([])
  let observer
  let activeHeadingId = $state(null)
  let isPinned = $state(true)
  let windowWidth = $state(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  )

  let shouldShow = $derived(windowWidth >= 1280)

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  function throttle(func, limit) {
    let inThrottle
    return function () {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  function highlight() {
    const targetDiv = document.getElementById(targetDivId)
    if (!targetDiv) return

    const headingElements = targetDiv.querySelectorAll('h2,h3,h4')
    let currentActiveHeadingId = null
    const threshold = 40 // pixels từ top của viewport

    // Tìm heading đầu tiên (từ trên xuống) đã đi qua threshold
    for (let i = 0; i < headingElements.length; i++) {
      const heading = headingElements[i]
      const rect = heading.getBoundingClientRect()

      if (rect.top <= threshold) {
        currentActiveHeadingId = heading.id
      } else {
        // Heading này chưa đi qua threshold, dừng lại
        break
      }
    }
    activeHeadingId = currentActiveHeadingId
  }

  function generateRandomString(length = 4) {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  function generateId(text) {
    const baseId = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
    return `${baseId}-${generateRandomString()}`
  }

  function updateTOC() {
    const targetDiv = document.getElementById(targetDivId)
    if (!targetDiv) {
      headings = []
      return
    }

    const foundHeadings = targetDiv.querySelectorAll('h2,h3,h4')
    headings = Array.from(foundHeadings).map((heading) => {
      let text = heading.innerText
      if (text.endsWith(':')) {
        text = text.slice(0, -1)
      }

      // Strip emojis and icons for cleaner TOC
      const cleanText = text
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/\s+/g, ' ')
        .trim()

      const id = heading.id || generateId(cleanText || text)
      heading.id = id
      return {
        text: cleanText || text,
        id,
        level: parseInt(heading.tagName.substring(1)),
      }
    })
    highlight()
  }

  function scrollToHeading(id) {
    const element = document.getElementById(id)
    // Không set activeHeadingId ở đây, để scroll handler tự highlight khi content cuộn đến
    if (element) {
      element.classList.add('animate-pulse')
      setTimeout(() => {
        element.classList.remove('animate-pulse')
      }, 4000)
    }
  }

  function togglePin() {
    isPinned = !isPinned
  }

  function handleResize() {
    windowWidth = window.innerWidth
  }

  const throttledHighlight = throttle(highlight, 100)

  $effect(() => {
    const init = async () => {
      await delay(100)
      updateTOC()

      window.addEventListener('scroll', throttledHighlight)
      window.addEventListener('resize', () => {
        throttledHighlight()
        handleResize()
      })

      const targetDiv = document.getElementById(targetDivId)
      if (targetDiv) {
        observer = new MutationObserver(() => {
          updateTOC()
        })
        observer.observe(targetDiv, {
          childList: true,
          subtree: true,
          characterData: true,
        })
      }

      const tocElement = document.getElementById('toc-sidebar-scroll')
      if (tocElement && !isTouchDevice()) {
        initialize(tocElement)
      }
    }

    init()

    return () => {
      window.removeEventListener('scroll', throttledHighlight)
      window.removeEventListener('resize', handleResize)
      if (observer) {
        observer.disconnect()
      }
      if (instance()) {
        instance().destroy()
      }
    }
  })

  const options = {
    scrollbars: {
      autoHide: 'true',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Effect để reinitialize OverlayScrollbars khi tocMode thay đổi
  $effect(() => {
    // Theo dõi tocMode để trigger effect khi thay đổi
    const currentMode = tocMode

    if (currentMode === 'sidebar' && shouldShow && !isTouchDevice()) {
      // Delay để đợi DOM render xong
      const timer = setTimeout(() => {
        const tocElement = document.getElementById('toc-sidebar-scroll')
        if (tocElement) {
          // Destroy instance cũ nếu có
          if (instance()) {
            instance().destroy()
          }
          // Initialize lại
          initialize(tocElement)
        }
      }, 150)

      return () => clearTimeout(timer)
    }
  })

  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }
</script>

{#if shouldShow && tocMode === 'sidebar'}
  <!-- Sidebar TOC -->
  {#if isPinned}
    <aside
      id="toc-sidebar"
      class="fixed w-80 z-20 font-mono right-2 bg-surface-1 border-l border-dashed border-border/70 sm:right-5 md:right-8 top-0 h-lvh flex transform-gpu duration-150 ease-in-out transition-all flex-col"
    >
      <!-- style="margin-top: {sidebarMarginTop}px;" -->
      <div class="flex flex-col h-full">
        <!-- TOC List -->
        <div
          id="toc-sidebar-scroll"
          class="flex-1 h-[calc(100vh-128px)] overflow-y-hidden py-6 px-4"
        >
          <div class="flex flex-col">
            <h3
              class="text-sm font-semibold text-text-secondary uppercase tracking-wider"
            >
              On this page
            </h3>
            {#each headings as heading}
              <a
                href="#{heading.id}"
                onclick={() => scrollToHeading(heading.id)}
                class="px-6 py-1.5 text-sm/4.5 no-underline transition-colors
                {heading.id === activeHeadingId
                  ? 'text-text-primary font-bold'
                  : 'text-text-secondary dark:text-muted hover:text-text-primary '}
                lv{heading.level}"
              >
                <span class="line-clamp-2">
                  {heading.text}
                </span>
              </a>
            {/each}
          </div>
        </div>
        <!-- Footer Actions -->
        <div
          class="py-2 sm:right-5 md:right-8 z-20 border-t border-dashed border-border flex gap-1"
        >
          <button
            onclick={toggleTocMode}
            class="flex-1 flex items-center justify-center py-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Switch to floating TOC"
          >
            <Icon icon="carbon:minimize" width="16" height="16" />
          </button>
          <button
            onclick={handleNavigatePrev}
            disabled={!canGoPrev}
            class="flex-1 flex items-center justify-center py-2 transition-colors
              {canGoPrev
              ? 'text-text-secondary hover:text-text-primary cursor-pointer'
              : 'text-text-tertiary/40 opacity-50 cursor-not-allowed'}"
            title="Previous item"
          >
            <Icon icon="carbon:chevron-left" width="16" height="16" />
          </button>
          <button
            onclick={handleNavigateNext}
            disabled={!canGoNext}
            class="flex-1 flex items-center justify-center py-2 transition-colors
              {canGoNext
              ? 'text-text-secondary hover:text-text-primary cursor-pointer'
              : 'text-text-tertiary/40 cursor-not-allowed'}"
            title="Next item"
          >
            <Icon icon="carbon:chevron-right" width="16" height="16" />
          </button>

          <a
            href="#footer"
            class="flex-1 flex items-center justify-center py-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Go to bottom"
          >
            <Icon width="16" icon="carbon:up-to-top" class="rotate-180" />
          </a>
          <a
            href="#top"
            class="flex-1 flex items-center justify-center py-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Go to top"
          >
            <Icon width="16" icon="carbon:up-to-top" />
          </a>
        </div>
      </div>
    </aside>
  {/if}
{/if}

<style>
  .lv2 {
    padding-left: 0em;
  }
  .lv3 {
    padding-left: 1em;
  }
  .lv4 {
    padding-left: 1.75em;
  }
</style>
