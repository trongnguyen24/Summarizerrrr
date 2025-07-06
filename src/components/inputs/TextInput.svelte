<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import PlusIcon from '../PlusIcon.svelte'

  let { apiKey = $bindable(), label = '', onSave = () => {} } = $props()

  let saveStatus = $state('')
  let apiKeyDebounceTimer = null

  /**
   * Schedules the API key save operation with a debounce.
   * Clears any existing timer and sets a new one.
   */
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

  <div class="lang overflow-hidden relative">
    <input
      type="text"
      id="api-key-input"
      bind:value={apiKey}
      class="w-full pl-3 text-xs pr-9 h-7.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
      oninput={scheduleApiKeySave}
    />
  </div>
</div>

<style>
  .lang::after {
    display: block;
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    height: 8px;
    width: 8px;
    background-color: var(--color-text-primary);
    transform: rotate(45deg) translate(-50%, -50%);
    transition: transform 0.3s ease-out;
    transform-origin: top right;
  }
  .lang::after {
    transform: rotate(45deg) translate(50%, -50%);
  }
  .lang::before {
    display: block;
    content: '';
    z-index: -1;
    position: absolute;
    bottom: 0;
    left: 0;
    height: 28px;
    width: 100%;
    background-color: rgba(124, 124, 124, 0.025);
    transform: translateY(100%);
    transition: transform 0.3s ease-out;
  }
  .lang::before {
    transform: translateY(0);
  }
</style>
