<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { animate, stagger, onScroll } from 'animejs'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { getTocMode, toggleTocMode } from '@/stores/tocModeStore.svelte.js'

  const { targetDivId } = $props()

  // Reactive check for toc mode and window width
  let tocMode = $derived(getTocMode())
  let windowWidth = $state(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  )
  let isDesktop = $derived(windowWidth >= 1280)

  let headings = $state([])
  let observer
  let activeHeadingId = $state(null)
  let isNavOpen = $state(false)

  const delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Simple throttle function
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

      // Check if the heading is in or just above the viewport
      if (rect.top <= window.innerHeight * 0.1) {
        // Highlight when 20% from top
        currentActiveHeadingId = heading.id
        break
      }
    }
    activeHeadingId = currentActiveHeadingId
    const newHash = activeHeadingId
      ? `#${activeHeadingId}`
      : window.location.pathname
    // if (newHash !== window.location.hash) {
    //   window.history.replaceState(null, null, newHash)
    // }
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
      console.warn(`Target div with ID "${targetDivId}" not found.`)
      headings = []
      return
    }

    const foundHeadings = targetDiv.querySelectorAll('h2,h3,h4')
    headings = Array.from(foundHeadings).map((heading) => {
      let text = heading.innerText
      // Remove trailing colon if present
      if (text.endsWith(':')) {
        text = text.slice(0, -1)
      }

      // Strip emojis and icons for cleaner TOC
      const cleanText = text
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/\s+/g, ' ')
        .trim()

      const id = heading.id || generateId(cleanText || text)
      heading.id = id // Ensure heading has an ID
      return {
        text: cleanText || text,
        id,
        level: parseInt(heading.tagName.substring(1)),
      }
    })
    highlight() // Highlight after updating TOC
  }

  function scrollToHeading(id) {
    const element = document.getElementById(id)
    activeHeadingId = id // Update active heading when clicking
    if (element) {
      // element.scrollIntoView({ behavior: 'smooth' })
      // Add animate-pulse class and remove after 3 seconds
      element.classList.add('animate-pulse')
      setTimeout(() => {
        element.classList.remove('animate-pulse')
      }, 4000)
    }
  }

  function toggleNav() {
    isNavOpen = !isNavOpen
  }

  // Bọc hàm highlight bằng throttle với giới hạn 40ms
  const throttledHighlight = throttle(highlight, 80)

  // Sử dụng $effect để thay thế onMount và onDestroy
  function handleResize() {
    windowWidth = window.innerWidth
  }

  $effect(() => {
    const init = async () => {
      await delay(100) // Thêm delay để đảm bảo DOM đã render

      updateTOC()

      // Gắn sự kiện cuộn và thay đổi kích thước với hàm đã được throttle
      window.addEventListener('scroll', throttledHighlight)
      window.addEventListener('resize', () => {
        throttledHighlight()
        handleResize()
      })

      // Optional: Observe changes in the target div to update TOC dynamically
      const targetDiv = document.getElementById(targetDivId)
      if (targetDiv) {
        observer = new MutationObserver(updateTOC)
        observer.observe(targetDiv, {
          childList: true,
          subtree: true,
          characterData: true,
        })
      }

      // Initialize OverlayScrollbars on the element with id "toc-scroll" (only on non-touch devices)
      const tocElement = document.getElementById('toc-scroll')
      if (tocElement && !isTouchDevice()) {
        initialize(tocElement)
      }
    }

    init()

    // Cleanup function for $effect
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

  // Effect để reinitialize OverlayScrollbars khi tocMode thay đổi
  $effect(() => {
    // Theo dõi tocMode và isDesktop để trigger effect khi thay đổi
    const currentMode = tocMode
    const desktop = isDesktop

    // Hiển thị TOCArchive: trên mobile luôn, trên desktop chỉ khi archive mode
    const shouldShowArchive = !desktop || currentMode === 'archive'

    if (shouldShowArchive && !isTouchDevice()) {
      // Delay để đợi DOM render xong
      const timer = setTimeout(() => {
        const tocElement = document.getElementById('toc-scroll')
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

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }
</script>

<!-- Show TOCArchive: on mobile always, on desktop only in archive mode -->
{#if !isDesktop || tocMode === 'archive'}
  <div
    id="toc"
    class="fixed z-20 right-0 sm:right-4 md:right-8 bottom-16 md:bottom-8 group origin-bottom-right"
  >
    <button
      class="flex items-end transition-all py-2 px-4 flex-col gap-2 {isTouchDevice()
        ? ''
        : 'group-hover:opacity-0'}"
      onclick={() => {
        if (isTouchDevice()) {
          toggleNav()
        }
      }}
    >
      {#each headings as heading}
        <span
          class="w-2 flex h-px dark:bg-white {heading.id === activeHeadingId
            ? 'opacity-100 bg-primary'
            : 'opacity-50 bg-text-secondary'} lvs{heading.level}"
        >
          <span
            class="block blur-[1px] h-px rounded-full bg-text-secondary dark:bg-white"
          >
          </span>
        </span>
      {/each}
      <span
        class=" w-1.25 sm:w-1.5 text-[0.65rem] mt-0.5 select-none flex justify-center items-center h-px text-primary dark:text-white"
      >
        ^
      </span>
    </button>
    <nav
      class="fixed bottom-14 md:bottom-8 z-20 pt-4 px-3 left-0 sm:left-auto right-0 sm:right-6 md:right-8 {isTouchDevice()
        ? isNavOpen
          ? 'block opacity-100'
          : 'hidden opacity-0'
        : 'hidden group-hover:block opacity-0 group-hover:opacity-100'}"
    >
      <div class="relative">
        <div
          id="toc-scroll"
          class="w-full xs:w-108 overflow-auto max-h-[calc(100vh-200px)] border rounded-t-lg border-border bg-background"
        >
          <div
            class="flex flex-col divide-y divide-border/50 dark:divide-border/70"
          >
            {#each headings as heading}
              <a
                href="#{heading.id}"
                onclick={() => {
                  scrollToHeading(heading.id)
                  if (isTouchDevice()) {
                    isNavOpen = false
                  }
                }}
                class="px-3 py-2 font-mono text-sm/5 no-underline transition-colors
          {heading.id === activeHeadingId
                  ? 'text-text-primary bg-black/5 dark:bg-white/5'
                  : 'text-text-secondary hover:text-text-primary'}
          lv{heading.level}"
              >
                <span class="line-clamp-2">
                  {heading.text}
                </span>
              </a>
            {/each}
          </div>
        </div>
        <div
          class="bg-background flex border border-border overflow-hidden border-t-0 rounded-b-lg"
        >
          {#if isDesktop}
            <button
              class="px-3 flex-1 border-border border-r flex justify-center items-center py-3 font-mono text-xs/4 transition-colors"
              title="Switch to sidebar TOC"
              onclick={toggleTocMode}
            >
              <Icon
                icon="heroicons:arrow-up-left-16-solid"
                width="16"
                height="16"
              />
            </button>
          {/if}
          <a
            href="#footer"
            class="px-3 flex-1 border-border border-r flex justify-center items-center py-3 font-mono text-xs/4 no-underline transition-colors"
            title="Go to bottom"
            onclick={() => {
              if (isTouchDevice()) {
                isNavOpen = false
              }
            }}><Icon class="rotate-180" width="16" icon="carbon:up-to-top" /></a
          >
          <a
            href="#top"
            class="px-3 flex-1 flex justify-center items-center py-3 font-mono text-xs/4 no-underline transition-colors"
            title="Go to top"
            onclick={() => {
              if (isTouchDevice()) {
                isNavOpen = false
              }
            }}><Icon width="16" icon="carbon:up-to-top" /></a
          >

          {#if isTouchDevice()}
            <button
              class="p-3 flex-1 border-border border-l flex justify-center items-center font-mono text-xs/4 no-underline transition-colors"
              onclick={() => (isNavOpen = false)}
            >
              <Icon width="16" icon="carbon:close" />
            </button>
          {/if}
        </div>
      </div>
    </nav>
    {#if isTouchDevice() && isNavOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="fixed inset-0 z-10" onclick={() => (isNavOpen = false)}></div>
    {/if}
  </div>
{/if}

<style>
  .lv4 {
    padding-left: 2em;
  }

  .lvs2,
  .lvs3 {
    width: 0.35em;
  }
  .lvs4 {
    width: 0.25em;
  }
  @media (width <= 40rem /* 640px */) {
    .lvs2,
    .lvs3 {
      width: 0.25em;
    }
    .lvs4 {
      width: 0.125em;
    }
  }
</style>
