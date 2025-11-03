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
  <div class="input-wrapper relative">
    <Icon
      icon="heroicons:pencil"
      width="16"
      height="16"
      class="input-icon absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
    />
    <input
      id="custom-question"
      type="text"
      bind:value={inputValue}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      placeholder="Type your question here..."
      class="w-full py-2 pl-10 pr-10 bg-surface-2 border border-border rounded-md text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors duration-200"
    />
    {#if inputValue}
      <button
        class="clear-btn absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors duration-150"
        onclick={handleClear}
        type="button"
      >
        <Icon icon="heroicons:x-mark" width="16" height="16" />
      </button>
    {/if}
  </div>
</div>

<style>
  .input-wrapper {
    position: relative;
  }

  input:focus {
    outline: none;
  }

  .clear-btn {
    cursor: pointer;
  }
</style>
