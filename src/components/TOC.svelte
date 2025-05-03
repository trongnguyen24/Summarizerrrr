<script>
  import { onMount, onDestroy } from 'svelte'
  import 'overlayscrollbars/overlayscrollbars.css' // Import CSS overlayscrollbars
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte' // Import primitive

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
    if (newHash !== window.location.hash) {
      window.history.replaceState(null, null, newHash)
    }
  }

  function generateId(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  function updateTOC() {
    const targetDiv = document.getElementById(targetDivId)
    if (!targetDiv) {
      console.warn(`Target div with ID "${targetDivId}" not found.`)
      headings = []
      return
    }

    const foundHeadings = targetDiv.querySelectorAll('h2,h3')
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
  const throttledHighlight = throttle(highlight, 40)

  onMount(async () => {
    // Thêm delay để đảm bảo DOM đã render
    await delay(500) // Có thể điều chỉnh thời gian delay nếu cần

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
  })

  const options = {
    scrollbars: {
      autoHide: 'never',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  onMount(async () => {
    // Thêm delay để đảm bảo DOM đã render
    await delay(500) // Có thể điều chỉnh thời gian delay nếu cần

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
  })

  onDestroy(() => {
    // Gỡ bỏ sự kiện khi component bị hủy
    window.removeEventListener('scroll', throttledHighlight)
    window.removeEventListener('resize', throttledHighlight)
    if (observer) {
      observer.disconnect()
    }
    // Destroy OverlayScrollbars instance on component destroy
    if (instance()) {
      instance().destroy()
    }
  })
</script>

<div class="fixed toc-animation z-20 right-0 bottom-18 group p-2 pr-3 pl-3">
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
  </div>
  <nav
    class="fixed -bottom-4 p-4 pr-3 right-0 xs:pr-6 hidden group-hover:block opacity-0 group-hover:opacity-100"
  >
    <div
      id="toc-scroll"
      class="w-64 xs:w-80 overflow-auto max-h-[calc(100vh-100px)] shadow-2xl border border-border bg-surface-2 backdrop-blur-2xl rounded-xl"
    >
      <div
        class="flex flex-col divide-y divide-stone-100 dark:divide-stone-700"
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
  </nav>
</div>

<style>
  .lv2 {
  }
  .lv3 {
    padding-left: 1.5rem;
  }
  .lv4 {
    padding-left: 2.5rem;
  }
  .lvs2 {
    width: 0.25rem;
  }
  .lvs3 {
    width: 0.125rem;
  }
</style>
