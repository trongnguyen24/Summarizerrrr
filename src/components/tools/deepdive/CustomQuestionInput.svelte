<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let { value = '', onchange } = $props()

  let inputValue = $state(value)
  let isFocused = $state(false)

  // Sync with external value changes
  $effect(() => {
    inputValue = value
  })

  function handleInput(event) {
    inputValue = event.target.value
    onchange(inputValue)
  }

  function handleFocus() {
    isFocused = true
  }

  function handleBlur() {
    isFocused = false
  }

  function handleClear() {
    inputValue = ''
    onchange('')
  }
</script>

<div class="custom-question-input">
  <label for="custom-question" class="block text-xs text-text-secondary mb-2">
    Or ask your own question
  </label>
  <!-- svelte-ignore element_invalid_self_closing_tag -->
  <textarea
    id="custom-question"
    bind:value={inputValue}
    oninput={handleInput}
    onfocus={handleFocus}
    onblur={handleBlur}
    placeholder="Type your question here..."
    rows="3"
    class="w-full py-2 pl-10 pr-10 bg-surface-2 border border-border rounded-md text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors duration-200 resize-none"
  />
</div>

<style>
  textarea {
    min-height: 76px; /* 3 rows * ~25px per row */
  }
</style>
