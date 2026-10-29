<script>
  // @ts-nocheck
  import ChatSkillChip from '@/components/chat/ChatSkillChip.svelte'
  import ChatUserMarkdown from '@/components/chat/ChatUserMarkdown.svelte'

  import Icon from '@iconify/svelte'

  let { message } = $props()

  // Long messages start clamped, like ChatGPT/Claude: a faded preview the user
  // clicks to open. Only clamp when it hides a real chunk — a message one line
  // over the limit isn't worth a "Show more".
  const COLLAPSED_HEIGHT = 168 // ~7 lines of prose-sm
  const MIN_HIDDEN = 48

  let contentEl = $state(null)
  let contentHeight = $state(0)
  let expanded = $state(false)

  const collapsible = $derived(contentHeight > COLLAPSED_HEIGHT + MIN_HIDDEN)
  const collapsed = $derived(collapsible && !expanded)

  $effect(() => {
    if (!contentEl) return
    contentHeight = contentEl.offsetHeight
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      contentHeight = contentEl.offsetHeight
    })
    ro.observe(contentEl)
    return () => ro.disconnect()
  })

  // A click anywhere on the clamped preview opens it — except on a link, or
  // when the user was just selecting text.
  function expandFromClick(event) {
    if (!collapsed) return
    if (event.target.closest?.('a')) return
    if (window.getSelection()?.toString()) return
    expanded = true
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions
     (the "Show more" button below is the keyboard path) -->
<div
  onclick={expandFromClick}
  class:cursor-pointer={collapsed}
  class="user-bubble relative flex max-w-[85%] flex-col items-start gap-1.5 overflow-hidden border bg-muted/5 px-3.5 py-2 text-sm wrap-anywhere text-text-primary"
  data-testid="chat-user-bubble"
>
  {#if message.skillInvocation}
    <ChatSkillChip skill={message.skillInvocation} />
  {/if}
  {#if message.content?.trim()}
    <div
      class="user-bubble-clip w-full overflow-hidden"
      class:is-collapsed={collapsed}
      style:max-height={collapsed ? `${COLLAPSED_HEIGHT}px` : null}
    >
      <div bind:this={contentEl}>
        <ChatUserMarkdown source={message.content} />
      </div>
    </div>
    {#if collapsible}
      <button
        type="button"
        class="flex items-center gap-0.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
        aria-expanded={expanded}
        onclick={(e) => {
          e.stopPropagation()
          expanded = !expanded
        }}
      >
        {expanded ? 'Show less' : 'Show more'}
        <Icon
          icon={expanded ? 'heroicons:chevron-up' : 'heroicons:chevron-down'}
          width="12"
          height="12"
        />
      </button>
    {/if}
  {/if}
</div>

<style>
  /* Fade the clamped preview out with a mask rather than a gradient overlay:
     the bubble's background is translucent, so an overlay colour would never
     match what's behind it. */
  .user-bubble-clip.is-collapsed {
    mask-image: linear-gradient(to bottom, #000 55%, transparent);
  }

  /* Bottom-left corner cut, built the same way as ButtonSet: `clip-path`
     trims the corner, and a 45°-rotated square centred on that corner peeks
     out past the clip as a thin band — that band is the diagonal border.
     Sized so the band is exactly 1px: half the square's side minus the clip
     line's distance from the corner (cut/√2). The border colour is the opaque
     `--color-border`, so where the square overlaps the left/bottom borders
     it paints the same colour and leaves no brighter pixel at the joins. */
  .user-bubble {
    --cut: 8px;
    border-color: var(--color-border);
    clip-path: polygon(
      0 0,
      100% 0,
      100% 100%,
      var(--cut) 100%,
      0 calc(100% - var(--cut))
    );
  }

  .user-bubble::before {
    content: '';
    position: absolute;
    /* -1px: absolute offsets start inside the 1px border; the square must be
       centred on the outer corner, where the clip line is measured from. */
    left: -1px;
    bottom: -1px;
    width: calc(var(--cut) * 1.4142 + 2px);
    height: calc(var(--cut) * 1.4142 + 2px);
    background-color: var(--color-border);
    transform: translate(-50%, 50%) rotate(45deg);
    pointer-events: none;
  }

  /* Same corner notch as the settings inputs (ReusableSelect's `.lang::after`):
     a rotated square clipped by `overflow-hidden` into a triangle. */
  .user-bubble::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 8px;
    background-color: var(--color-text-primary);
    transform: rotate(45deg) translate(50%, -50%);
    transform-origin: top right;
    pointer-events: none;
  }
</style>
