<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import PlusIcon from './PlusIcon.svelte'

  let { apiKey = $bindable(), label = '', onSave = () => {} } = $props()

  let saveStatus = $state('')
  let apiKeyDebounceTimer = null

  function scheduleApiKeySave() {
    clearTimeout(apiKeyDebounceTimer)
    apiKeyDebounceTimer = setTimeout(() => {
      onSave(apiKey.trim())
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center gap-1 justify-between">
    <label for="api-key-input" class="block">
      {label}
    </label>
    {#if saveStatus}
      <p id="save-status" transition:fade class="text-success flex mr-auto">
        Saved!
      </p>
    {/if}
  </div>

  <div class="relative">
    <PlusIcon />
    <input
      type="text"
      id="api-key-input"
      bind:value={apiKey}
      class="w-full pl-3 text-xs pr-9 h-7.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-white/10 focus:outline-none focus:ring-1 placeholder:text-muted transition-colors duration-150"
      oninput={scheduleApiKeySave}
    />
  </div>
</div>
