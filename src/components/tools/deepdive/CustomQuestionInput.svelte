<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let {
    value = '',
    onchange,
    onSubmit, // NEW: Submit handler for Enter key
    placeholder = 'Your question...',
  } = $props()

  let inputValue = $state(value)
  let isFocused = $state(false)
  let showClearButton = $state(false)
  let textareaElement = $state(null)

  // Sync with external value changes
  $effect(() => {
    inputValue = value
  })

  // Show clear button when there's content and focused
  $effect(() => {
    showClearButton = isFocused && inputValue.trim() !== ''
  })

  // Auto-resize function
  function autoResize() {
    if (!textareaElement) return

    // Reset height to auto to measure scrollHeight
    textareaElement.style.height = 'auto'

    // Calculate new height based on content
    const scrollHeight = textareaElement.scrollHeight
    const newHeight = Math.min(Math.max(scrollHeight, 40), 80) // 88px ≈ 3 lines + padding

    // Apply new height
    textareaElement.style.height = newHeight + 2 + 'px'
  }

  function handleInput(event) {
    inputValue = event.target.value
    onchange(inputValue)

    // Auto-resize on input
    autoResize()
  }

  function handleKeyDown(event) {
    // Handle Enter key to submit
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (inputValue.trim()) {
        onSubmit?.(inputValue.trim())
      }
    }
    // Allow Shift+Enter for new line
  }

  function handleFocus() {
    isFocused = true
  }

  function handleBlur() {
    // Small delay to allow click events on clear button to fire
    setTimeout(() => {
      isFocused = false
    }, 150)
  }

  function handleClear() {
    inputValue = ''
    onchange('')

    // Reset textarea height to minimum after clearing
    if (textareaElement) {
      // Force height to min-height immediately
      textareaElement.style.height = '40px'
      textareaElement.focus()
      // Then run autoResize to ensure proper calculation
      setTimeout(() => autoResize(), 0)
    }
  }

  // Initialize textarea element and auto-resize
  $effect(() => {
    textareaElement = document.getElementById('custom-question')
    if (textareaElement) {
      // Add input listener for auto-resize
      textareaElement.addEventListener('input', autoResize)
      // Initial resize
      autoResize()
    }

    return () => {
      if (textareaElement) {
        textareaElement.removeEventListener('input', autoResize)
      }
    }
  })
</script>

<div class="custom-question-input">
  <!-- Clear button (shows when focused with content) -->
  {#if showClearButton}
    <button
      onmousedown={(e) => e.preventDefault()}
      onclick={handleClear}
      class="clear-btn absolute top-2 right-2 p-1 hover:bg-surface-3 rounded-md transition-colors"
      aria-label="Clear input"
    >
      <Icon icon="heroicons:x-mark" width="14" height="14" />
    </button>
  {/if}

  <!-- svelte-ignore element_invalid_self_closing_tag -->
  <textarea
    id="custom-question"
    bind:value={inputValue}
    oninput={handleInput}
    onkeydown={handleKeyDown}
    onfocus={handleFocus}
    onblur={handleBlur}
    {placeholder}
    rows="1"
    class="w-full py-4 rounded-[27px] pl-6 pr-10 bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors duration-200 resize-none overflow-y-auto"
  />
</div>

<style>
  .custom-question-input {
    position: relative;
  }

  .custom-question-input textarea {
    /* Fixed height setup - CSS handles max-height */
    min-height: 40px; /* Minimum height (1 line + padding) */
    max-height: 5.5rem; /* Maximum height (3 lines + padding) */
    field-sizing: content-box; /* Ensure padding is included in height */
    overflow-y: auto; /* Show scrollbar when content exceeds max-height */
    transition: all 0.2s ease-in-out; /* Smooth transitions */
  }

  .custom-question-input textarea:focus {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); /* Primary color shadow */
  }

  .clear-btn {
    color: var(--text-secondary);
    background: var(--surface-2);
    border: 1px solid var(--border);
    z-index: 10;
  }

  .clear-btn:hover {
    color: var(--text-primary);
    background: var(--surface-3);
  }

  /* Custom scrollbar styling */
  .custom-question-input textarea::-webkit-scrollbar {
    width: 4px;
  }

  .custom-question-input textarea::-webkit-scrollbar-thumb {
    background-color: oklch(0.77 0.003 106.6 / 40%);
    border-radius: 2px;
  }

  .custom-question-input textarea::-webkit-scrollbar-thumb:hover {
    background-color: oklch(0.77 0.003 106.6 / 60%);
  }
</style>
