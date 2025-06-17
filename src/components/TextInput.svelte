<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'

  let {
    text = $bindable(),
    label = '',
    onSave = () => {},
    placeholder = '',
  } = $props()

  let saveStatus = $state('')
  let textDebounceTimer = null

  function scheduleTextSave() {
    clearTimeout(textDebounceTimer)
    textDebounceTimer = setTimeout(() => {
      onSave(text.trim())
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center gap-1 justify-between">
    <label for="text-input" class="block">
      {label}
    </label>
    {#if saveStatus}
      <p id="save-status" transition:fade class="text-success flex mr-auto">
        Saved!
      </p>
    {/if}
  </div>

  <input
    id="text-input"
    bind:value={text}
    {placeholder}
    class="w-full pl-3 text-xs pr-9 h-7.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-white/10 focus:outline-none focus:ring-1 placeholder:text-muted transition-colors duration-150"
    oninput={scheduleTextSave}
  />
</div>
