<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'

  const { targetDivId } = $props()

  let headings = $state([])
  let observer
  let activeHeadingId = $state(null)
  let isPinned = $state(true)
  let windowWidth = $state(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  )

  let shouldShow = $derived(windowWidth >= 768)

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

  const throttledHighlight = throttle(highlight, 80)

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
        observer = new MutationObserver(updateTOC)
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

{#if shouldShow}
  <!-- Pin/Unpin Button (always visible on desktop) -->
  <!-- <button
    onclick={togglePin}
    class="fixed z-30 top-3 right-2 sm:right-5 md:right-8 p-2 rounded-lg hover:bg-blackwhite/5 transition-colors
    {!isPinned
      ? 'bg-surface-1/80 backdrop-blur-sm border border-border/50'
      : ''}"
    title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
  >
    <Icon
      icon={isPinned ? 'lucide:panel-right-close' : 'lucide:panel-right-open'}
      width="20"
      height="20"
      class="text-text-secondary hover:text-text-primary transition-colors"
    />
  </button> -->

  <!-- Sidebar TOC -->
  {#if isPinned}
    <aside
      id="toc-sidebar"
      class="sticky z-20 top-0 right-2 sm:right-5 md:right-8 h-screen flex flex-col pt-14 pb-8 w-56 xl:w-64"
    >
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="px-3 pb-3 border-b border-border/50">
          <h3
            class="text-xs font-semibold text-text-muted uppercase tracking-wider"
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
                class="px-3 py-1.5 text-sm/5 no-underline transition-colors border-l-2
                {heading.id === activeHeadingId
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-text-secondary hover:text-text-primary border-transparent hover:border-border'}
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
        <div class="px-3 pt-2 border-t border-border/50 flex gap-2">
          <a
            href="#top"
            class="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors rounded hover:bg-blackwhite/5"
          >
            <Icon width="14" icon="carbon:up-to-top" />
            Top
          </a>
          <a
            href="#footer"
            class="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors rounded hover:bg-blackwhite/5"
          >
            <Icon width="14" icon="carbon:up-to-top" class="rotate-180" />
            Bottom
          </a>
        </div>
      </div>
    </aside>
  {/if}
{/if}

<style>
  .lv3 {
    padding-left: 0.75em;
  }
  .lv4 {
    padding-left: 1.5em;
  }
</style>
