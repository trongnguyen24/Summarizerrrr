<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { animate, stagger, onScroll } from 'animejs'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'

  const { targetDivId } = $props()

  let headings = $state([])
  let observer
  let activeHeadingId = $state(null)

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
      const id = heading.id || generateId(text)
      heading.id = id // Ensure heading has an ID
      return { text, id, level: parseInt(heading.tagName.substring(1)) }
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

  // Bọc hàm highlight bằng throttle với giới hạn 40ms
  const throttledHighlight = throttle(highlight, 80)

  // Sử dụng $effect để thay thế onMount và onDestroy
  $effect(() => {
    animate('.toc', {
      opacity: [0, 0, 1],
      translateX: ['2rem', '2rem', '2rem', '2rem', 0],
      scale: [0, 1, 1, 1, 1, 1],
      ease: 'inOutQuad',
      autoplay: onScroll({
        container: 'body',
        enter: 'bottom-=290px',
        leave: 'bottom-=300px',
        sync: 0.5,
      }),
    })

    const init = async () => {
      await delay(100) // Thêm delay để đảm bảo DOM đã render

      updateTOC()

      // Gắn sự kiện cuộn và thay đổi kích thước với hàm đã được throttle
      window.addEventListener('scroll', throttledHighlight)
      window.addEventListener('resize', throttledHighlight)

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

      // Initialize OverlayScrollbars on the element with id "toc-scroll"
      const tocElement = document.getElementById('toc-scroll')
      if (tocElement) {
        initialize(tocElement)
      }
    }

    init()

    // Cleanup function for $effect
    return () => {
      window.removeEventListener('scroll', throttledHighlight)
      window.removeEventListener('resize', throttledHighlight)
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
</script>

<div
  class="toc fixed z-20 right-0 bottom-18 group p-2 pr-3 origin-bottom-right"
>
  <div
    class="flex items-end group-hover:opacity-0 transition-all flex-col gap-1.5"
  >
    {#each headings as heading}
      <span
        class="w-1 flex h-px dark:bg-white {heading.id === activeHeadingId
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
      class="w-1 text-[0.5rem] mt-0.5 select-none flex justify-center items-center h-px text-primary dark:text-white"
    >
      ^
    </span>
  </div>
  <nav
    class="fixed bottom-0 pt-4 px-3 right-0 hidden group-hover:block opacity-0 group-hover:opacity-100"
  >
    <div class="relative">
      <div
        id="toc-scroll"
        class="w-64 xs:w-80 overflow-auto max-h-[calc(100vh-150px)] border rounded-t-lg border-border bg-surface-1"
      >
        <div
          class="flex flex-col divide-y divide-border/50 dark:divide-border/70"
        >
          {#each headings as heading}
            <a
              href="#{heading.id}"
              onclick={() => scrollToHeading(heading.id)}
              class="px-3 py-2 font-mono text-xs/4 no-underline transition-colors
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
      <a
        href="#top"
        class="px-3 bg-surface-1 border border-border border-t-0 flex justify-end rounded-b-lg items-center gap-1 py-3 font-mono text-xs/4 no-underline transition-colors"
        ><Icon width="16" icon="carbon:up-to-top" />Go to top</a
      >
    </div>
  </nav>
</div>

<style>
  .lv4 {
    padding-left: 2rem;
  }
  .lvs2,
  .lvs3 {
    width: 0.25rem;
  }
  .lvs4 {
    width: 0.125rem;
  }
</style>
