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
  <a
    {href}
    onclick={handleTimestampClick}
    class="timestamp-link flex w-fit items-center font-medium rounded-md bg-blackwhite/5 text-text-primary mb-2 font-mono hover:bg-blackwhite/10 transition-colors cursor-pointer no-underline border border-border"
    title="Jump to {text}"
  >
    <span class=" border-r w-full py-1 px-2 text-base border-border">
      {@render children?.()}
    </span>
    <span class="flex justify-center shrink-0 items-center w-10">
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
        class="lucide text-primary lucide-play"
        ><polygon points="6 3 20 12 6 21 6 3" /></svg
      >
    </span>
  </a>
{:else}
  <a {href} {title} target="_blank" rel="noopener noreferrer">
    {@render children?.()}
  </a>
{/if}
