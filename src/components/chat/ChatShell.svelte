<script>
  // @ts-nocheck
  import { tick } from 'svelte'
  import ChatMessageList from '@/components/chat/ChatMessageList.svelte'
  import ChatEmptyState from '@/components/chat/ChatEmptyState.svelte'
  import ChatComposer from '@/components/chat/ChatComposer.svelte'
  import ChatContextWarning from '@/components/chat/ChatContextWarning.svelte'
  import ErrorDisplay from '@/components/ui/ErrorDisplay.svelte'
  import {
    chatState,
    retryChatMessage,
    sendChatFollowUp,
  } from '@/stores/chatStore.svelte.js'

  // Horizontal placement of the fixed composer. The side panel spans the full
  // width; `alignComposerToShell` (Archive) instead pins it to the shell's own
  // measured column, since the page around it has breakpoint-dependent
  // sidebars and gutters that fixed insets can't track. `mentionsOnly` hides
  // the page/committed context rows so only fresh @tab chips show (Archive).
  // `proseClass` overrides the assistant markdown typography (Archive).
  // `showEmptyState` gates the pinned-skills empty state; Archive turns it off
  // while a conversation is still loading so the skills don't flash.
  let {
    composerClass = 'left-0 right-0',
    alignComposerToShell = false,
    mentionsOnly = false,
    proseClass = undefined,
    showEmptyState = true,
  } = $props()

  // Gap left between the sticky header and a message parked at the top.
  const PARK_GAP = 8

  let shellEl = $state()
  let shellBox = $state(null)
  let composerRef = $state()
  let composerBlockHeight = $state(0)
  let listEl = $state()
  let tailSpacerHeight = $state(0)

  $effect(() => {
    if (!alignComposerToShell || !shellEl) return
    const update = () => {
      const rect = shellEl.getBoundingClientRect()
      shellBox = { left: rect.left, width: rect.width }
    }
    update()
    // Width changes cover sidebar/TOC toggles; resize covers left-only shifts.
    const observer = new ResizeObserver(update)
    observer.observe(shellEl)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  })

  // Publish the composer's height so page chrome pinned to the same bottom
  // edge (the Archive's TOC) can sit above it instead of underneath.
  $effect(() => {
    if (!alignComposerToShell) return
    const root = document.documentElement
    root.style.setProperty('--chat-composer-h', `${composerBlockHeight}px`)
    return () => root.style.removeProperty('--chat-composer-h')
  })

  // No auto-scroll: the scroll position is the user's to control. Chat is read
  // top-down, so streaming content grows below the fold without moving them.
  // The one exception is below — a single scroll when the user submits.

  $effect(() => {
    const targetId = chatState.scrollTargetMessageId
    if (!targetId) return
    // Clear first: this is a one-shot request, and the message list re-renders
    // constantly during the stream that follows.
    chatState.scrollTargetMessageId = null
    scrollMessageToTop(targetId)
  })

  // Switching browser tabs swaps the whole message list under a shared document
  // scroller, so the offset has to be put back by hand. The store hands us the
  // outgoing tab's offset; the summary surface does the same thing with its own
  // per-tab `scrollY` (see `services/tabCacheService.js`).
  $effect(() => {
    const target = chatState.pendingScrollRestore
    if (target == null) return
    // Clear first — one-shot, and the list re-renders plenty after this.
    chatState.pendingScrollRestore = null
    restoreScroll(target)
  })

  async function restoreScroll(top) {
    await tick()
    // The tail spacer is what gives the document its height; scrolling past the
    // end gets clamped, exactly as in `scrollMessageToTop` below.
    measureTail()
    await tick()
    const scroller = document.scrollingElement || document.documentElement
    if (!scroller) return
    // One frame later: the composer remounts on a tab switch (it is keyed by
    // the session tab id) and its height feeds the padding and the spacer.
    requestAnimationFrame(() =>
      scroller.scrollTo({ top, behavior: 'instant' }),
    )
  }

  async function scrollMessageToTop(messageId) {
    await tick()
    // At submit time the answer is still empty (just a thinking indicator), so
    // the page is too short to park the message at the top and the browser
    // would clamp the scroll. Size the tail spacer first, then scroll.
    measureTail()
    await tick()
    const scroller = document.scrollingElement || document.documentElement
    const el = document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`)
    if (!scroller || !el) return
    // The header is sticky, so it would cover a message parked at scrollTop.
    const headerHeight =
      document.querySelector('[data-sticky-header]')?.offsetHeight ?? 0
    const top =
      scroller.scrollTop + el.getBoundingClientRect().top - headerHeight - PARK_GAP
    // `behavior: 'instant'` overrides `html { scroll-behavior: smooth }`; a plain
    // `scrollTop =` would animate, and the page is growing underneath us.
    scroller.scrollTo({ top, behavior: 'instant' })
  }

  // Empty space below the last turn, just large enough that the turn's user
  // message can reach the top of the viewport. It shrinks 1:1 as the answer
  // grows — so the document height stays constant while streaming (no jump)
  // and there is no leftover gap once the answer is taller than a screen.
  function measureTail() {
    if (!listEl) return
    const nodes = Array.from(listEl.querySelectorAll('[data-message-id]'))
    if (nodes.length === 0) {
      tailSpacerHeight = 0
      return
    }
    // The turn starts at the last user message (fallback: the last message, for
    // a conversation that somehow ends on an assistant-only tail).
    let anchor = nodes[nodes.length - 1]
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      if (nodes[i].dataset.messageRole === 'user') {
        anchor = nodes[i]
        break
      }
    }
    const scroller = document.scrollingElement || document.documentElement
    const headerHeight =
      document.querySelector('[data-sticky-header]')?.offsetHeight ?? 0
    // Everything below the anchor's top, excluding the spacer itself (it is a
    // sibling of `listEl`, so measuring `listEl` can't feed back into itself).
    const tail =
      listEl.getBoundingClientRect().bottom -
      anchor.getBoundingClientRect().top +
      composerBlockHeight
    tailSpacerHeight = Math.max(
      0,
      scroller.clientHeight - headerHeight - PARK_GAP - tail,
    )
  }

  $effect(() => {
    if (!listEl) return
    // Fires on observe, so this covers the initial measurement too. Needed on
    // top of the explicit deps below because content also grows out of band
    // (markdown/code rendering, images, drawers opening).
    const observer = new ResizeObserver(() => measureTail())
    observer.observe(listEl)
    const onResize = () => measureTail()
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  })

  $effect(() => {
    // The anchor moves when a message is added, and the tail budget changes
    // when the composer block grows (context warning, taller input).
    chatState.messages.length
    chatState.streamingMessage?.content
    composerBlockHeight
    measureTail()
  })

  const hasMatchingInlineError = $derived.by(() => {
    const errorMessage = chatState.error?.message
    if (!errorMessage) return false

    const latestMessage =
      chatState.streamingMessage || chatState.messages.at(-1)

    return Boolean(
      latestMessage?.role === 'assistant' &&
        latestMessage.status === 'error' &&
      latestMessage.error?.message === errorMessage,
    )
  })
</script>

<div
  bind:this={shellEl}
  class="flex w-full flex-1 flex-col"
  data-testid="chat-shell"
>
  <div
    class="flex w-full flex-1 flex-col"
    style="padding-bottom: {composerBlockHeight}px"
  >
    {#if chatState.messages.length > 0 || chatState.streamingMessage}
      <div class="w-full" bind:this={listEl}>
        <ChatMessageList
          messages={chatState.messages}
          streamingMessage={chatState.streamingMessage}
          onRetry={retryChatMessage}
          conversation={chatState.conversation}
          onFollowUp={sendChatFollowUp}
          {proseClass}
        />
      </div>
      <div
        class="shrink-0"
        style="height: {tailSpacerHeight}px"
        aria-hidden="true"
        data-testid="chat-tail-spacer"
      ></div>
    {:else if showEmptyState}
      <ChatEmptyState
        onSelectSkill={(skill) => composerRef?.selectSkillAndSend(skill)}
      />
    {/if}
  </div>

  <div
    bind:clientHeight={composerBlockHeight}
    class="fixed bottom-0 z-[41] {alignComposerToShell ? '' : composerClass}"
    style={alignComposerToShell && shellBox
      ? `left: ${shellBox.left}px; width: ${shellBox.width}px`
      : undefined}
  >
    <div class="flex flex-col gap-2 px-4 max-w-[52rem] mx-auto">
      <ChatContextWarning warnings={chatState.contextWarnings} />
      {#if chatState.error && !hasMatchingInlineError}
        <ErrorDisplay error={chatState.error} />
      {/if}
    </div>

    <ChatComposer
      bind:this={composerRef}
      {mentionsOnly}
      shortFade={alignComposerToShell}
    />
  </div>
</div>
