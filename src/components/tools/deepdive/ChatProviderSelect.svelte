<script>
  // @ts-nocheck
  import { Select } from 'bits-ui'
  import { fly } from 'svelte/transition'
  import GeminiIcon from '@/components/icons/GeminiIcon.svelte'
  import ChatGPTIcon from '@/components/icons/ChatGPTIcon.svelte'
  import PerplexityIcon from '@/components/icons/PerplexityIcon.svelte'
  import GrokIcon from '@/components/icons/GrokIcon.svelte'

  let {
    value = $bindable('gemini'),
    onchange,
    ariaLabel = 'Select chat provider',
    isCompact = false,
  } = $props()

  const providers = [
    {
      value: 'gemini',
      label: 'Gemini',
      icon: GeminiIcon,
    },
    { value: 'chatgpt', label: 'ChatGPT', icon: ChatGPTIcon },
    {
      value: 'perplexity',
      label: 'Perplexity',
      icon: PerplexityIcon,
    },
    { value: 'grok', label: 'Grok', icon: GrokIcon },
  ]

  const selectedProvider = $derived(
    providers.find((p) => p.value === value) || providers[0]
  )

  function handleChange(newValue) {
    if (onchange) {
      onchange(newValue)
    }
  }
</script>

<Select.Root
  type="single"
  bind:value
  items={providers}
  onValueChange={handleChange}
>
  <Select.Trigger
    class="w-full flex items-center justify-between gap-1 py-2 px-2 hover:bg-blackwhite-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-0"
    aria-label={ariaLabel}
  >
    <div class="flex items-center gap-1 {isCompact ? 'compact' : ''}">
      <selectedProvider.icon width={20} height={20} />
      <span class="text-xs text-text-primary">{selectedProvider.label}</span>
    </div>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="size-3 {isCompact ? 'hidden' : ''}"
    >
      <path
        fill-rule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clip-rule="evenodd"
      />
    </svg>
  </Select.Trigger>

  <Select.Portal>
    <Select.Content
      class="z-50 w-40 min-w-[var(--bits-select-anchor-width)] bg-surface-2 border border-border rounded-xl shadow-lg p-1 overflow-hidden outline-none"
      align="end"
      sideOffset={4}
      forceMount
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div {...props} transition:fly={{ y: -4, duration: 150 }}>
              <Select.Viewport>
                {#each providers as provider (provider.value)}
                  <Select.Item
                    class="w-full flex items-center gap-2 py-3 px-3 text-sm text-text-secondary hover:bg-blackwhite-5 rounded-md data- data-[selected]:text-text-primary transition-colors duration-150 cursor-pointer outline-none"
                    value={provider.value}
                    label={provider.label}
                  >
                    {#snippet children({ selected })}
                      <provider.icon width={20} height={20} />
                      <span class="flex-1">{provider.label}</span>
                      {#if selected}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          class="size-4"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      {/if}
                    {/snippet}
                  </Select.Item>
                {/each}
              </Select.Viewport>
            </div>
          </div>
        {/if}
      {/snippet}
    </Select.Content>
  </Select.Portal>
</Select.Root>

<style>
  /* Smooth transition for compact mode */
  .compact span {
    opacity: 0;
    width: 0;
    overflow: hidden;
    transition:
      opacity 200ms ease-out,
      width 200ms ease-out;
  }

  /* Default state with smooth transition */
  span {
    opacity: 1;
    width: auto;
    transition:
      opacity 200ms ease-in,
      width 200ms ease-in;
  }
</style>
