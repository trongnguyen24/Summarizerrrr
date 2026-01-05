<script>
  // @ts-nocheck
  import { onMount } from 'svelte'

  let { href, title, text, children } = $props()

  // Check if this is a timestamp link
  const isTimestamp = href && href.startsWith('timestamp:')
  const seconds = isTimestamp ? parseInt(href.split(':')[1], 10) : 0

  async function handleTimestampClick(e) {
    e.preventDefault()

    try {
      // Send message to active tab to seek video
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (tab?.id) {
        const response = await browser.tabs.sendMessage(tab.id, {
          action: 'seekToTimestamp',
          seconds: seconds,
        })
      } else {
        console.warn('[TimestampLink] No active tab found')
      }
    } catch (error) {
      console.error('[TimestampLink] Error seeking video:', error)
    }
  }
</script>

{#if isTimestamp}
  &nbsp; <a
    {href}
    onclick={handleTimestampClick}
    class="timestamp-link inline-flex w-fit group items-center font-normal rounded-md text-muted hover:text-primary font-mono transition-colors cursor-pointer no-underline"
    title="Jump to {text}"
  >
    <span
      class="flex relative rounded-full overflow-hidden justify-center shrink-0 items-center w-6 h-6"
    >
      <span
        class="absolute top-0 left-0 rounded-none h-full bg-blackwhite/5 w-full group-hover:translate-x-0 -translate-x-full group-hover:bg-primary/10 group-hover:rounded-full transition-all duration-300 ease-in-out"
      ></span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3" /></svg
      >
    </span>
    <span class="w-full px-1">
      {@render children?.()}
    </span>
  </a>
{:else}
  <a {href} {title} target="_blank" rel="noopener noreferrer">
    {@render children?.()}
  </a>
{/if}
