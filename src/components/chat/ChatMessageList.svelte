<script>
  // @ts-nocheck
  import { tick } from 'svelte'
  import ChatMessage from '@/components/chat/ChatMessage.svelte'
  import Icon from '@iconify/svelte'
  import { loadEarlierMessages, chatState } from '@/stores/chatStore.svelte.js'

  let { messages = [], streamingMessage = null, onRetry = null, conversation = null, onFollowUp = null, proseClass = undefined } = $props()

  let isLoadingEarlier = $state(false)

  // Chat never auto-scrolls; the only scroll we perform is holding the
  // viewport still when earlier messages are prepended. Scroll is owned by the
  // document/body (there is no local overflow container).
  function getScroller() {
    if (typeof document === 'undefined') return null
    return document.scrollingElement || document.documentElement
  }

  function retryTargetFor(index) {
    const message = allMessages[index]
    if (message.retryOfMessageId) return message.retryOfMessageId
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (allMessages[cursor].role === 'user') return allMessages[cursor].id
    }
    return null
  }

  // The streaming bubble is keyed by the id of the row it will become, so when
  // the stream ends and the persisted message replaces it the each block
  // patches that node instead of remounting it. A remount rendered one frame of
  // empty markdown (svelte-markdown fills its streaming tokens from an effect),
  // which collapsed the document height and made the browser clamp the scroll
  // to the top the moment a reply finished.
  // `continueResponse` streams into a message that is already persisted, so its
  // transient overlays that row (live combined content, no second copy below
  // it) rather than being appended. An id-less transient falls back to the
  // sentinel key.
  const allMessages = $derived.by(() => {
    if (!streamingMessage) return messages
    const transient = { ...streamingMessage, isTransient: true }
    if (!transient.id) return [...messages, { ...transient, id: '__streaming__' }]
    const index = messages.findIndex((message) => message.id === transient.id)
    if (index === -1) return [...messages, transient]
    const merged = [...messages]
    merged[index] = { ...messages[index], ...transient }
    return merged
  })

  async function handleLoadEarlier() {
    if (isLoadingEarlier) return
    isLoadingEarlier = true
    const el = getScroller()
    const prevHeight = el ? el.scrollHeight : 0
    const prevTop = el ? el.scrollTop : 0
    try {
      await loadEarlierMessages()
      await tick()
      // Preserve viewport position after prepending earlier messages.
      // `behavior: 'instant'` is required: a plain `scrollTop =` would animate
      // against `html { scroll-behavior: smooth }` and drift.
      if (el)
        el.scrollTo({
          top: prevTop + (el.scrollHeight - prevHeight),
          behavior: 'instant',
        })
    } finally {
      isLoadingEarlier = false
    }
  }
</script>

<div
  class="flex w-full flex-col gap-5 px-6 pt-8 pb-24 max-w-[52rem] mx-auto"
>
  {#if chatState.hasEarlierMessages}
    <div class="flex justify-center py-2">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-blackwhite-5 hover:text-text-primary"
        onclick={handleLoadEarlier}
        disabled={isLoadingEarlier}
      >
        <Icon icon="heroicons:arrow-up" width="14" height="14" />
        {isLoadingEarlier ? 'Loading…' : 'Load earlier messages'}
      </button>
    </div>
  {/if}
  {#each allMessages as message, index (message.id)}
    <ChatMessage
      {message}
      isStreaming={message.isTransient === true}
      retryTargetId={message.role === 'assistant' ? retryTargetFor(index) : null}
      {onRetry}
      {conversation}
      {onFollowUp}
      readOnly={chatState.readOnly}
      {proseClass}
    />
  {/each}
</div>

