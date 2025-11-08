<script>
  // @ts-nocheck
  import { Select } from 'bits-ui'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
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

  // Dynamic width measurement for smooth animation
  let wrapperElement = $state(null)
  let fullWidth = $state(null)
  let isInitialized = $state(false)

  // Measure width when element mounts or selectedProvider changes
  $effect(() => {
    console.log('[ChatProviderSelect] Effect triggered', {
      hasElement: !!wrapperElement,
      isCompact,
      selectedProvider: selectedProvider.label,
    })

    if (!wrapperElement) return

    // Measure the trigger's natural width
    requestAnimationFrame(() => {
      try {
        // Find the Select.Trigger button inside wrapper
        const triggerButton = wrapperElement.querySelector('button')

        if (!triggerButton) {
          console.error('[ChatProviderSelect] Trigger button not found')
          return
        }

        console.log('[ChatProviderSelect] Trigger button found', {
          currentWidth: triggerButton.offsetWidth,
        })

        // Clone to measure natural width
        const clone = triggerButton.cloneNode(true)
        clone.style.width = 'auto'
        clone.style.position = 'absolute'
        clone.style.visibility = 'hidden'
        clone.style.pointerEvents = 'none'

        wrapperElement.appendChild(clone)

        const width = clone.offsetWidth
        fullWidth = `${width}px`
        isInitialized = true

        console.log('[ChatProviderSelect] Measured width', {
          width,
          provider: selectedProvider.label,
          fullWidth,
        })

        clone.remove()
      } catch (error) {
        console.error('[ChatProviderSelect] Measurement error', error)
      }
    })
  })

  // Compute trigger width based on compact state
  const triggerWidth = $derived(() => {
    // Wait for initial measurement before animating
    if (!isInitialized) {
      return 'auto'
    }

    const width = isCompact ? '2.25rem' : fullWidth

    console.log('[ChatProviderSelect] Computed triggerWidth', {
      isCompact,
      fullWidth,
      result: width,
      isInitialized,
    })

    return width
  })

  function handleChange(newValue) {
    if (onchange) {
      onchange(newValue)
    }
  }
</script>

<div bind:this={wrapperElement}>
  <Select.Root
    type="single"
    bind:value
    items={providers}
    onValueChange={handleChange}
  >
    <Select.Trigger
      class="flex relative items-center justify-between gap-1 py-2 px-2 hover:bg-blackwhite-5 overflow-hidden rounded-full focus:outline-none focus:ring-0"
      style="width: {triggerWidth()}; transition: width 300ms ease-out, background-color 200ms;"
      aria-label={ariaLabel}
    >
      <div class="flex items-center gap-1 min-w-0">
        <div class="size-5 relative flex-shrink-0">
          {#key selectedProvider.value}
            <div
              in:slideScaleFade={{
                delay: 160,
                slideFrom: 'left',
                duration: 300,
                startBlur: 4,
                slideDistance: '0px',
                startScale: 1.25,
              }}
              out:slideScaleFade={{
                slideFrom: 'left',
                duration: 260,
                startBlur: 2,
                slideDistance: '0px',
                startScale: 0.85,
              }}
              class="absolute inset-0 flex items-center justify-center"
            >
              <selectedProvider.icon width={20} height={20} />
            </div>
          {/key}
        </div>
        <span
          class="label-text text-xs text-text-primary {isCompact
            ? 'compact'
            : ''}"
        >
          {selectedProvider.label}
        </span>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="size-3 transition-opacity {isCompact
          ? ' opacity-0'
          : ' opacity-100'}"
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
              <div
                {...props}
                in:slideScaleFade={{
                  slideFrom: 'top',
                  duration: 250,
                  slideDistance: '8px',
                  startScale: 0.85,
                }}
                out:slideScaleFade={{
                  slideFrom: 'top',
                  duration: 200,
                  slideDistance: '8px',
                  startScale: 0.95,
                }}
              >
                <Select.Viewport>
                  {#each providers as provider (provider.value)}
                    <Select.Item
                      class="w-full flex items-center gap-2 py-3 px-3 text-sm text-text-secondary hover:bg-blackwhite-5 rounded-md data- data-[selected]:text-text-primary transition-colors duration-75 cursor-pointer outline-none"
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
</div>

<style>
  /* Label text smooth transition */
  .label-text {
    opacity: 1;
    max-width: 200px;
    /* overflow: hidden; */
    white-space: nowrap;
    transition:
      opacity 200ms ease-out,
      max-width 300ms ease-out;
  }

  /* Compact state - hide text smoothly */
  .label-text.compact {
    opacity: 0;
    max-width: 0;
  }
</style>
