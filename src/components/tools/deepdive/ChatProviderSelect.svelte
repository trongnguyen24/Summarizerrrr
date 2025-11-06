<script>
  // @ts-nocheck
  import { Select } from 'bits-ui'
  import { fly } from 'svelte/transition'
  import Icon from '@iconify/svelte'

  let {
    value = $bindable('gemini'),
    onchange,
    ariaLabel = 'Select chat provider',
  } = $props()

  const providers = [
    {
      value: 'gemini',
      label: 'Gemini',
      icon: 'simple-icons:googlebard',
    },
    { value: 'chatgpt', label: 'ChatGPT', icon: 'simple-icons:openai' },
    {
      value: 'perplexity',
      label: 'Perplexity',
      icon: 'simple-icons:perplexity',
    },
    { value: 'grok', label: 'Grok', icon: 'simple-icons:x' },
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
    class="w-full flex items-center justify-between gap-1 py-2.5 px-2 hover:bg-blackwhite-5 rounded-full  transition-colors duration-200 focus:outline-none focus:ring-1"
    aria-label={ariaLabel}
  >
    <div class="flex items-center gap-2">
      <Icon icon={selectedProvider.icon} width="16" height="16" />
      <span class="text-xs text-text-primary">{selectedProvider.label}</span>
    </div>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="size-3"
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
      class="z-50 w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] bg-surface-2 border border-border rounded-md shadow-lg overflow-hidden outline-none"
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
                    class="w-full flex items-center gap-2 py-2 px-3 text-xs text-text-secondary hover:bg-surface-3 data-[selected]:bg-primary/10 data-[selected]:text-text-primary transition-colors duration-150 cursor-pointer outline-none"
                    value={provider.value}
                    label={provider.label}
                  >
                    {#snippet children({ selected })}
                      <Icon icon={provider.icon} width="16" height="16" />
                      <span class="flex-1">{provider.label}</span>
                      {#if selected}
                        <Icon
                          icon="heroicons:check"
                          width="16"
                          height="16"
                          class="text-primary"
                        />
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
