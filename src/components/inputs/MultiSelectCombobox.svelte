<!-- @ts-nocheck -->
<script>
  import { Combobox } from 'bits-ui'
  import { flyOnly } from '@/lib/ui/slideScaleFade.js'
  import Icon from '@iconify/svelte'

  let {
    items = [],
    selectedValues = $bindable([]),
    placeholder = 'Select items...',
    ariaLabel = '',
    id = '',
    noResultsText = 'No results found.',
    onValueChangeCallback = () => {},
    label = '',
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

  // Get selected labels for display
  const selectedLabels = $derived(
    selectedValues
      .map((val) => items.find((item) => item.value === val)?.label)
      .filter(Boolean)
      .join(', '),
  )

  function handleInput(e) {
    searchValue = e.currentTarget.value
  }

  function handleValueChange(newValues) {
    if (Array.isArray(newValues)) {
      selectedValues = newValues
      if (onValueChangeCallback) {
        onValueChangeCallback(newValues)
      }
    }
  }

  function handleOpenChange(open) {
    // Reset search when dropdown closes
    if (!open) {
      searchValue = ''
    }
  }

  function toggleItem(value) {
    const index = selectedValues.indexOf(value)
    if (index === -1) {
      selectedValues = [...selectedValues, value]
    } else {
      selectedValues = selectedValues.filter((v) => v !== value)
    }
    if (onValueChangeCallback) {
      onValueChangeCallback(selectedValues)
    }
  }

  function isSelected(value) {
    return selectedValues.includes(value)
  }
</script>

{#if label}
  <label class="text-xs text-text-secondary mb-1 block" for={id}>
    {label}
  </label>
{/if}

<Combobox.Root
  type="multiple"
  {items}
  bind:value={selectedValues}
  onValueChange={handleValueChange}
  onOpenChange={handleOpenChange}
>
  <div class="relative">
    <Combobox.Input
      {id}
      class="select-none font-mono w-full relative text-xs overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-2 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150"
      placeholder={selectedValues.length > 0
        ? `${selectedValues.length} selected`
        : placeholder}
      oninput={handleInput}
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
      class="focus-override text-text-primary bg-surface-2 outline-hidden z-50 max-h-[var(--bits-combobox-content-available-height)] w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] select-none border border-border shadow-popover"
      sideOffset={4}
      forceMount
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div {...props} transition:flyOnly={{ duration: 300 }}>
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
                        <div class="flex items-center gap-2">
                          <div
                            class="size-4 border rounded flex items-center justify-center transition-colors {selected
                              ? 'bg-primary border-primary'
                              : 'border-border'}"
                          >
                            {#if selected}
                              <Icon
                                icon="heroicons:check-16-solid"
                                class="size-3 text-white"
                              />
                            {/if}
                          </div>
                          <span class="line-clamp-1 truncate">{item.label}</span
                          >
                        </div>
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

<!-- Display selected items as tags -->
{#if selectedValues.length > 0}
  <div class="flex flex-wrap gap-1 mt-2">
    {#each selectedValues as value}
      {@const item = items.find((i) => i.value === value)}
      {#if item}
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-primary/10 text-primary rounded"
        >
          {item.label}
          <button
            type="button"
            class="hover:text-red-500 transition-colors"
            onclick={() => toggleItem(value)}
            aria-label="Remove {item.label}"
          >
            <Icon icon="heroicons:x-mark-16-solid" class="size-3" />
          </button>
        </span>
      {/if}
    {/each}
  </div>
{/if}
