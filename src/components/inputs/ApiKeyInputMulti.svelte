<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import PlusIcon from '@/components/icons/PlusIcon.svelte'

  let {
    apiKey = $bindable(),
    label = '',
    placeholder = '',
    onSave = () => {},
    linkHref = '',
    linkText = '',
    id = 'api-key-input',
    showStatus = true,
    externalStatus = null,
  } = $props()

  let showApiKey = $state(false)
  let saveStatus = $state('')
  let apiKeyDebounceTimer = null

  function scheduleApiKeySave() {
    clearTimeout(apiKeyDebounceTimer)
    apiKeyDebounceTimer = setTimeout(() => {
      // Guard against undefined apiKey
      if (apiKey === undefined || apiKey === null) {
        return
      }
      onSave(apiKey.trim())
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }

  let finalStatus = $derived(
    externalStatus !== null ? externalStatus : showStatus ? saveStatus : '',
  )
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center gap-1 justify-between">
    <label for={id} class="block">
      {label}
    </label>
    {#if finalStatus}
      <p id="save-status" transition:fade class="text-success flex mr-auto">
        {finalStatus === 'saved!' ? 'Saved!' : finalStatus}
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
    <div
      class="relative w-full h-8.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus-within:border-blackwhite/30 dark:border-blackwhite/10 dark:focus-within:border-blackwhite/20 transition-colors duration-150 overflow-hidden"
    >
      <input
        type={showApiKey ? 'text' : 'password'}
        {id}
        {placeholder}
        bind:value={apiKey}
        class="absolute top-0 left-0 w-[133.33%] h-[133.33%] pl-4 pr-12 text-base text-text-primary bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted origin-top-left scale-75"
        oninput={scheduleApiKeySave}
      />
    </div>
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
