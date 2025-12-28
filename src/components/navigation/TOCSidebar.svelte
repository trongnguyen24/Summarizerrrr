<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { getTocMode, toggleTocMode } from '@/stores/tocModeStore.svelte.js'

  const { targetDivId } = $props()

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
  let sidebarMarginTop = $state(208) // default mt-52 = 13rem = 208px

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  function updateSidebarPosition() {
    const markdownContainer = document.querySelector('.markdown-container-v2')
    if (markdownContainer) {
      const rect = markdownContainer.getBoundingClientRect()
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      // Tính vị trí top của markdown container so với document
      sidebarMarginTop = rect.top + scrollTop
    }
  }

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

    for (let i = headingElements.length - 1; i >= 0; i--) {
      const heading = headingElements[i]
      const rect = heading.getBoundingClientRect()

      if (rect.top <= window.innerHeight * 0.1) {
        currentActiveHeadingId = heading.id
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
      const id = heading.id || generateId(text)
      heading.id = id
      return { text, id, level: parseInt(heading.tagName.substring(1)) }
    })
    highlight()
  }

  function scrollToHeading(id) {
    const element = document.getElementById(id)
    activeHeadingId = id
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

  const throttledHighlight = throttle(highlight, 40)

  $effect(() => {
    const init = async () => {
      await delay(100)
      updateTOC()
      updateSidebarPosition()

      window.addEventListener('scroll', throttledHighlight)
      window.addEventListener('resize', () => {
        throttledHighlight()
        handleResize()
      })

      const targetDiv = document.getElementById(targetDivId)
      if (targetDiv) {
        observer = new MutationObserver(async () => {
          updateTOC()
          // Delay để DOM render xong trước khi tính toán vị trí
          await delay(50)
          updateSidebarPosition()
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
      autoHide: 'never',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

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
      class="sticky z-20 font-mono right-2 sm:right-5 md:right-8 top-8 h-lvh flex transform-gpu pt-2 duration-150 ease-in-out transition-all flex-col items-end"
      style="margin-top: {sidebarMarginTop}px;"
    >
      <div class="fle flex-col px-2 h-full">
        <!-- Header -->
        <div>
          <h3
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
          >
            On this page
          </h3>
        </div>

        <!-- TOC List -->
        <div id="toc-sidebar-scroll" class="flex-1 overflow-y-auto py-2">
          <div class="flex flex-col">
            {#each headings as heading}
              <a
                href="#{heading.id}"
                onclick={() => scrollToHeading(heading.id)}
                class="px-6 py-1.5 text-xs/4 no-underline transition-colors
                {heading.id === activeHeadingId
                  ? 'text-text-primary font-bold '
                  : 'text-text-secondary hover:text-text-primary '}
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
        <div class="pt-2 border-t border-border/50 flex gap-1">
          <a
            href="#top"
            class="flex-1 flex items-center justify-center py-2 text-text-secondary hover:text-text-primary transition-colors rounded hover:bg-blackwhite/5"
            title="Go to top"
          >
            <Icon width="16" icon="carbon:up-to-top" />
          </a>
          <a
            href="#footer"
            class="flex-1 flex items-center justify-center py-2 text-text-secondary hover:text-text-primary transition-colors rounded hover:bg-blackwhite/5"
            title="Go to bottom"
          >
            <Icon width="16" icon="carbon:up-to-top" class="rotate-180" />
          </a>
          <button
            onclick={toggleTocMode}
            class="flex-1 flex items-center justify-center py-2 text-text-secondary hover:text-text-primary transition-colors rounded hover:bg-blackwhite/5"
            title="Switch to floating TOC"
          >
            <Icon width="16" icon="lucide:panel-right-close" />
          </button>
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
