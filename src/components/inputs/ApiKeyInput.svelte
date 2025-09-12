<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import PlusIcon from '@/components/icon/PlusIcon.svelte'

  let {
    apiKey = $bindable(),
    label = '',
    placeholder = '',
    onSave = () => {},
    linkHref = '',
    linkText = '',
  } = $props()

  let showApiKey = $state(false)
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
    {#if linkHref && linkText}
      <a
        href={linkHref}
        target="_blank"
        class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
      >
        {linkText}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </a>
    {/if}
  </div>

  <div class="relative">
    <PlusIcon />
    <input
      type={showApiKey ? 'text' : 'password'}
      id="api-key-input"
      {placeholder}
      bind:value={apiKey}
      class="w-full pl-3 text-text-primary text-xs pr-9 h-8.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
      oninput={scheduleApiKeySave}
    />
    <button
      class="absolute size-6 text-muted right-1 top-1.25 grid place-items-center cursor-pointer"
      onclick={() => (showApiKey = !showApiKey)}
      tabindex="0"
      aria-label={showApiKey ? 'Hide API Key' : 'Show API Key'}
      onkeypress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          showApiKey = !showApiKey
        }
      }}
    >
      {#if !showApiKey}
        <Icon class="absolute" width={16} icon="heroicons:eye-slash-16-solid" />
      {:else}
        <Icon class="absolute" width={16} icon="heroicons:eye-16-solid" />
      {/if}
    </button>
  </div>
</div>
