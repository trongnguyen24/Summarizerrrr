<!-- @ts-nocheck -->
<script>
  import { Combobox } from 'bits-ui'
  import { fly } from 'svelte/transition'

  let {
    items = [],
    bindValue = $bindable(),
    placeholder = '',
    ariaLabel = '',
    id = '',
    noResultsText = 'No results found.',
    onValueChangeCallback = () => {},
  } = $props()

  // searchValue is only for filtering, starts empty
  let searchValue = $state('')

  // Filter items based on search value
  const filteredItems = $derived(
    searchValue === ''
      ? items
      : items.filter((item) =>
          item.label.toLowerCase().includes(searchValue.toLowerCase()),
        ),
  )

  function handleInput(e) {
    searchValue = e.currentTarget.value
  }

  function handleValueChange(newValue) {
    if (newValue) {
      bindValue = newValue
      if (onValueChangeCallback) {
        onValueChangeCallback(newValue)
      }
    }
  }

  function handleOpenChange(open) {
    // Reset search when dropdown closes
    if (!open) {
      searchValue = ''
    }
  }
</script>

<Combobox.Root
  type="single"
  {items}
  bind:value={bindValue}
  onValueChange={handleValueChange}
  onOpenChange={handleOpenChange}
  inputValue={bindValue}
>
  <div class="relative">
    <Combobox.Input
      {id}
      class="select-none font-mono w-full relative text-xs overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-2 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150 "
      {placeholder}
      oninput={handleInput}
      defaultValue={bindValue}
      aria-label={ariaLabel}
    />
    <Combobox.Trigger
      class="absolute right-0 top-0 h-full w-8 flex items-center justify-center cursor-pointer"
      aria-label="Open dropdown"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        class="pointer-events-none"
      >
        <path
          fill="currentColor"
          fill-rule="evenodd"
          d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06m5.56-4.44a.75.75 0 0 1-1.06 0L8 4.06L6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06"
          clip-rule="evenodd"
        />
      </svg>
    </Combobox.Trigger>
  </div>

  <Combobox.Portal>
    <Combobox.Content
      class="focus-override text-text-primary bg-surface-2 outline-hidden z-50 max-h-[var(--bits-combobox-content-available-height)] w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] select-none border border-border  shadow-popover"
      sideOffset={4}
      forceMount
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div {...props} transition:fly={{ duration: 300 }}>
              <Combobox.ScrollUpButton
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
              </Combobox.ScrollUpButton>
              <Combobox.Viewport class="p-1">
                {#each filteredItems as item, i (i + item.value)}
                  <Combobox.Item
                    class="rounded-sm relative font-mono text-xs data-selected:text-text-primary text-text-secondary data-highlighted:bg-blackwhite/10 outline-hidden flex w-full select-none items-center py-2.25 pl-3 pr-2 capitalize duration-75"
                    value={item.value}
                    label={item.label}
                  >
                    {#snippet children({ selected })}
                      <div class="flex items-center justify-between w-full">
                        <span class="line-clamp-1 truncate">{item.label}</span>
                        {#if selected}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            class="ml-2 text-primary"
                          >
                            <path
                              fill="currentColor"
                              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            />
                          </svg>
                        {/if}
                      </div>
                    {/snippet}
                  </Combobox.Item>
                {:else}
                  <span
                    class="block px-5 py-2 text-xs text-text-secondary font-mono"
                  >
                    {noResultsText}
                  </span>
                {/each}
              </Combobox.Viewport>
              <Combobox.ScrollDownButton
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
                    d="M7.47 12.78a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8 11.19L5.28 8.47a.75.75 0 0 0-1.06 1.06zM4.22 4.53l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8 6.19L5.28 3.47a.75.75 0 0 0-1.06 1.06"
                    clip-rule="evenodd"
                  />
                </svg>
              </Combobox.ScrollDownButton>
            </div>
          </div>
        {/if}
      {/snippet}
    </Combobox.Content>
  </Combobox.Portal>
</Combobox.Root>
