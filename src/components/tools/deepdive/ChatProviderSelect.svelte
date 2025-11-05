<script>
  // @ts-nocheck
  import { getChatProviderName } from '@/lib/prompts/tools/deepDivePrompts.js'
  import Icon from '@iconify/svelte'

  let { value = 'gemini', onchange } = $props()

  const providers = [
    { id: 'gemini', name: 'Google Gemini', icon: 'simple-icons:googlebard' },
    { id: 'chatgpt', name: 'ChatGPT', icon: 'simple-icons:openai' },
    { id: 'perplexity', name: 'Perplexity', icon: 'simple-icons:perplexity' },
    { id: 'grok', name: 'Grok', icon: 'simple-icons:x' },
  ]

  let isOpen = $state(false)
  let selectedProvider = $derived(
    providers.find((p) => p.id === value) || providers[0]
  )

  function handleSelect(providerId) {
    onchange(providerId)
    isOpen = false
  }

  function toggleDropdown() {
    isOpen = !isOpen
  }
</script>

<div class="chat-provider-select relative">
  <button
    class="select-trigger w-full flex items-center justify-between gap-2 py-2 px-3 bg-surface-2 hover:bg-surface-3 border border-border rounded-md transition-colors duration-200"
    onclick={toggleDropdown}
  >
    <div class="flex items-center gap-2">
      <Icon icon={selectedProvider.icon} width="16" height="16" />
      <span class="text-xs text-text-primary">{selectedProvider.name}</span>
    </div>
    <Icon
      icon={isOpen ? 'heroicons:chevron-up' : 'heroicons:chevron-down'}
      width="16"
      height="16"
      class="text-text-secondary"
    />
  </button>

  {#if isOpen}
    <div
      class="dropdown-menu absolute top-full left-0 w-full mt-1 bg-surface-2 border border-border rounded-md shadow-lg z-50 overflow-hidden"
    >
      {#each providers as provider (provider.id)}
        <button
          class="dropdown-item w-full flex items-center gap-2 py-2 px-3 hover:bg-surface-3 transition-colors duration-150 {value ===
          provider.id
            ? 'bg-primary/10'
            : ''}"
          onclick={() => handleSelect(provider.id)}
        >
          <Icon icon={provider.icon} width="16" height="16" />
          <span class="text-xs text-text-primary">{provider.name}</span>
          {#if value === provider.id}
            <Icon
              icon="heroicons:check"
              width="16"
              height="16"
              class="ml-auto text-primary"
            />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .select-trigger {
    cursor: pointer;
  }

  .dropdown-item {
    cursor: pointer;
    text-align: left;
  }

  .dropdown-menu {
    animation: slideDown 0.15s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
