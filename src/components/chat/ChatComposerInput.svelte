<script>
  // @ts-nocheck
  let {
    value = '',
    oninput,
    onkeydown,
    placeholder = 'Ask about this page...',
    disabled = false,
    autofocus = false,
    'aria-label': ariaLabel = 'Chat message',
  } = $props()

  let textareaEl = $state(null)

  export function focus() {
    textareaEl?.focus()
  }

  // Auto-resize: clamp height to content between 24px and 220px.
  function autoResize() {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    const scrollHeight = textareaEl.scrollHeight
    const newHeight = Math.min(Math.max(scrollHeight, 24), 220)
    textareaEl.style.height = newHeight + 2 + 'px'
  }

  function handleInput(event) {
    oninput?.(event)
    autoResize()
  }

  // Re-measure when the value changes from outside.
  $effect(() => {
    value
    autoResize()
  })

  $effect(() => {
    if (autofocus) textareaEl?.focus()
  })
</script>

<div
  class="chat-composer-input flex w-full items-center overflow-y-auto"
>
  <!-- svelte-ignore element_invalid_self_closing_tag -->
  <textarea
    bind:this={textareaEl}
    {value}
    oninput={handleInput}
    {onkeydown}
    {disabled}
    {placeholder}
    aria-label={ariaLabel}
    rows="1"
    class="w-full text-sm text-text-primary placeholder:text-muted pl-1 py-2 focus:outline-0 focus-visible:outline-0 focus:ring-0 transition-colors shadow-none duration-200 resize-none overflow-y-auto disabled:opacity-60"
  ></textarea>
</div>

<style>
  .chat-composer-input {
    position: relative;
  }

  .chat-composer-input textarea {
    min-height: 24px;
    max-height: 15rem;
    field-sizing: content-box;
    overflow-y: auto;
    transition: all 0.2s ease-in-out;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .chat-composer-input textarea::-webkit-scrollbar {
    width: 4px;
    background: transparent;
  }

  .chat-composer-input textarea::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-composer-input textarea::-webkit-scrollbar-thumb {
    background-color: oklch(0.77 0.003 106.6 / 40%);
    border-radius: 2px;
  }

  .chat-composer-input textarea::-webkit-scrollbar-thumb:hover {
    background-color: oklch(0.77 0.003 106.6 / 60%);
  }
</style>
