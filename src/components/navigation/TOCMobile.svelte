<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  import { animate, stagger, onScroll } from 'animejs'

  const { targetDivId } = $props()

  let idScroll = 'shadow-scroll'

  let headings = $state([])
  let isNavOpen = $state(false)
  let activeHeadingId = $state(null)
  function generateRandomString(length = 4) {
    const characters = 'abcdefghijklmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  function generateId(text) {
    return generateRandomString()
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
    const host = document.querySelector('wxt-svelte-integrated-ui')
    if (!host?.shadowRoot) return

    const scrollContainer = host.shadowRoot.getElementById('shadow-scroll')
    const iddElement = host.shadowRoot.getElementById(targetDivId)
    if (!iddElement || !scrollContainer) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const rootNode = iddElement.shadowRoot || iddElement
    const headingElements = rootNode.querySelectorAll('h2, h3, h4')
    let currentActiveHeadingId = null

    for (let i = headingElements.length - 1; i >= 0; i--) {
      const heading = headingElements[i]
      const headingRect = heading.getBoundingClientRect()

      // Check if the heading is at or above the 10% mark of the scroll container
      if (headingRect.top <= containerRect.top + containerRect.height * 0.1) {
        // Highlight when 10% from the container's top
        currentActiveHeadingId = heading.id
        break
      }
    }
    activeHeadingId = currentActiveHeadingId
  }

  function scrollToHeading(id) {
    activeHeadingId = id // Update active heading when clicking
    const host = document.querySelector('wxt-svelte-integrated-ui')
    if (!host?.shadowRoot) return

    const iddElement = host.shadowRoot.getElementById(targetDivId)
    if (!iddElement) return

    const rootNode = iddElement.shadowRoot || iddElement
    const element = rootNode.querySelector(`#${id}`)

    if (element) {
      // Find the shadow-scroll container
      const scrollContainer = host.shadowRoot.getElementById('shadow-scroll')
      if (scrollContainer) {
        // Calculate the position of the element relative to the scroll container
        const elementRect = element.getBoundingClientRect()
        const containerRect = scrollContainer.getBoundingClientRect()
        const scrollTop =
          scrollContainer.scrollTop + elementRect.top - containerRect.top - 20 // 20px offset

        // Smooth scroll to the element
        scrollContainer.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        })
      } else {
        // Fallback to regular scrollIntoView if shadow-scroll container not found
        element.scrollIntoView({ behavior: 'smooth' })
      }

      // Add animate-pulse class and remove after 4 seconds
      element.classList.add('animate-pulse')
      setTimeout(() => {
        element.classList.remove('animate-pulse')
      }, 4000)
    }
  }

  function scrollToTop() {
    const host = document.querySelector('wxt-svelte-integrated-ui')
    if (!host?.shadowRoot) return

    const scrollContainer = host.shadowRoot.getElementById('shadow-scroll')
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }
  }

  function scrollToBottom() {
    const host = document.querySelector('wxt-svelte-integrated-ui')
    if (!host?.shadowRoot) return

    const scrollContainer = host.shadowRoot.getElementById('shadow-scroll')
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  // Bọc hàm highlight bằng throttle với giới hạn 80ms
  const throttledHighlight = throttle(highlight, 80)

  $effect(() => {
    const timeoutId = setTimeout(() => {
      const host = document.querySelector('wxt-svelte-integrated-ui')
      if (!host?.shadowRoot) return

      const iddElement = host.shadowRoot.getElementById(targetDivId)
      if (!iddElement) return

      const rootNode = iddElement.shadowRoot || iddElement
      const foundHeadings = rootNode.querySelectorAll('h2, h3, h4')

      headings = Array.from(foundHeadings).map((heading) => {
        let text = heading.innerText
        if (text.endsWith(':')) {
          text = text.slice(0, -1)
        }
        const id = generateId(text)
        heading.id = id // Ensure heading has an ID for scrolling
        return { text, id, level: parseInt(heading.tagName.substring(1)) }
      })

      highlight() // Highlight after updating headings

      // Set up scroll listener for highlight detection
      const scrollContainer = host.shadowRoot.getElementById('shadow-scroll')
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', throttledHighlight)
      }
      window.addEventListener('resize', throttledHighlight)
    }, 500)

    return () => {
      clearTimeout(timeoutId)
      // Cleanup scroll listeners
      const host = document.querySelector('wxt-svelte-integrated-ui')
      if (host?.shadowRoot) {
        const scrollContainer = host.shadowRoot.getElementById('shadow-scroll')
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', throttledHighlight)
        }
      }
      window.removeEventListener('resize', throttledHighlight)
    }
  })
</script>

<div
  class="toc fixed z-20 right-0 bottom-2 group origin-bottom-right {!isTouchDevice()
    ? '!right-3'
    : ''}"
>
  <button
    class="flex items-end py-4 pl-6 pr-2 transition-all flex-col gap-1.5"
    onclick={() => (isNavOpen = !isNavOpen)}
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
  </button>

  <nav
    class="fixed left-0 xs:left-auto xs:absolute xs:top-auto xs:w-80 bottom-0 max-w-[32em] right-0 p-0 top-8 z-20"
    class:active={isNavOpen}
  >
    <div class="relative flex flex-col justify-end inset-0 h-full">
      <div
        id="toc-scroll"
        class="w-full hide-scrollbar overflow-auto h-[calc(100%-4em)] xs:h-full xs:max-h-[calc(100vh-8em)] border rounded-t-3xl border-border bg-surface-1"
      >
        <div
          class="flex flex-col divide-y divide-border/50 dark:divide-border/70"
        >
          {#each headings as heading}
            <button
              class="p-4 font-mono text-sm/4 no-underline transition-colors text-left {heading.id ===
              activeHeadingId
                ? 'text-text-primary bg-black/5 dark:bg-white/5'
                : 'text-text-secondary hover:text-text-primary'}"
              onclick={() => {
                scrollToHeading(heading.id)
                isNavOpen = false
              }}
            >
              <span class="line-clamp-1">{heading.text}</span>
            </button>
          {/each}
        </div>
      </div>
      <div
        class="bg-surface-1 flex justify-between items-center border border-border overflow-hidden xs:rounded-b-3xl border-t-0"
      >
        <button
          onclick={() => {
            scrollToBottom()
            isNavOpen = false
          }}
          class="px-4 border-border border-r flex-1/3 flex justify-center items-center gap-1 py-6 font-mono text-sm/4 no-underline transition-colors"
          ><Icon
            class=" rotate-180"
            width="20"
            icon="carbon:up-to-top"
          /></button
        >

        <button
          onclick={() => {
            scrollToTop()
            isNavOpen = false
          }}
          class="px-4 flex justify-center flex-1/3 items-center gap-1 py-6 font-mono text-sm/4 no-underline transition-colors"
          ><Icon width="20" icon="carbon:up-to-top" /></button
        >
        <button
          onclick={() => (isNavOpen = false)}
          class="px-4 flex-1/3 border-border border-l flex justify-center items-center gap-1 py-6 font-mono text-sm/4 no-underline transition-colors"
        >
          <Icon width="20" icon="carbon:close" />
        </button>
      </div>
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

  nav {
    transform: translatey(100%);
    transition: transform 0.3s ease-out;
    display: none;
  }

  nav.active {
    transform: translateY(0);
    display: block;
  }
</style>
