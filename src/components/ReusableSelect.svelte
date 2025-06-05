<!-- @ts-nocheck -->
<script>
  import { Select } from 'bits-ui'
  import { fly } from 'svelte/transition'

  let {
    items = [],
    bindValue = $bindable(),
    defaultLabel = '',
    ariaLabel = '',
    className = '',
    onValueChangeCallback = () => {},
  } = $props()

  const selectedLabel = $derived(
    bindValue
      ? items.find((item) => item.value === bindValue)?.label
      : defaultLabel
  )

  function handleChange(newValue) {
    bindValue = newValue
    if (onValueChangeCallback) {
      onValueChangeCallback(newValue)
    }
  }
</script>

<Select.Root
  type="single"
  bind:value={bindValue}
  {items}
  onValueChange={handleChange}
>
  <Select.Trigger
    class="select-none font-mono w-full relative text-xs overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-1.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-white/10 transition-colors duration-150"
    aria-label={ariaLabel}
  >
    <div class={className}>
      {selectedLabel}
    </div>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
    >
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06m5.56-4.44a.75.75 0 0 1-1.06 0L8 4.06L6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06"
        clip-rule="evenodd"
      />
    </svg>
  </Select.Trigger>
  <Select.Portal>
    <Select.Content
      class="focus-override text-text-primary bg-surface-2 outline-hidden z-50 max-h-[var(--bits-select-content-available-height)] w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] select-none border border-border"
      sideOffset={4}
      forceMount
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div {...props} transition:fly={{ duration: 300 }}>
              <Select.ScrollUpButton
                class="flex w-full py-1 items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="currentColor"
                    fill-rule="evenodd"
                    d="M7.47 3.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1-1.06 1.06L8 4.81L5.28 7.53a.75.75 0 0 1-1.06-1.06zm-3.25 8.25l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 1 1-1.06 1.06L8 9.81l-2.72 2.72a.75.75 0 0 1-1.06-1.06"
                    clip-rule="evenodd"
                  />
                </svg>
              </Select.ScrollUpButton>
              <Select.Viewport>
                {#each items as item, i (i + item.value)}
                  <Select.Item
                    class=" relative font-mono text-xs data-selected:text-text-primary text-text-secondary data-highlighted:bg-blackwhite/10 outline-hidden flex w-full select-none items-center py-1 pl-3 pr-2 capitalize duration-75"
                    value={item.value}
                    label={item.label}
                  >
                    {#snippet children({ selected })}
                      <div class=" line-clamp-1 truncate">
                        {item.label}
                      </div>
                      <!-- {#if selected}
                        <div class=" text-primary absolute left-0.5 top-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="8"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fill="currentColor"
                              d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11s-4.925 11-11 11S1 18.075 1 12m14.5 0L10 7.75v8.5z"
                            />
                          </svg>
                        </div>
                      {/if} -->
                    {/snippet}
                  </Select.Item>
                {/each}
              </Select.Viewport>
              <Select.ScrollDownButton
                class="flex w-full py-1 items-center justify-center"
                ><svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="currentColor"
                    fill-rule="evenodd"
                    d="M7.47 12.78a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8 11.19L5.28 8.47a.75.75 0 0 0-1.06 1.06zM4.22 4.53l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8 6.19L5.28 3.47a.75.75 0 0 0-1.06 1.06"
                    clip-rule="evenodd"
                  />
                </svg></Select.ScrollDownButton
              >
            </div>
          </div>
        {/if}
      {/snippet}
    </Select.Content>
  </Select.Portal>
</Select.Root>

<style>
  .lang::after,
  .provider::after {
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
  .lang::after,
  .provider::after {
    transform: rotate(45deg) translate(50%, -50%);
  }
  .lang::before,
  .provider::before {
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
  .lang::before,
  .provider::before {
    transform: translateY(0);
  }
</style>
