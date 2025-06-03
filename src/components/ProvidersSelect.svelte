<!-- @ts-nocheck -->
<script>
  import { Select } from 'bits-ui'
  import { fly } from 'svelte/transition'
  import { providersConfig } from '../lib/providersConfig.js'
  import { settings } from '../stores/settingsStore.svelte.js'

  const providers = Object.keys(providersConfig).map((key) => ({
    value: key,
    label: providersConfig[key].name,
  }))

  let { value = $bindable() } = $props() // Giá trị mặc định sẽ được truyền từ Setting.svelte
  const selectedLabel = $derived(
    value ? providers.find((p) => p.value === value)?.label : 'Google Gemini'
  )

  function handleChange(newValue) {
    value = newValue // Cập nhật giá trị bindable
    settings.selectedProvider = newValue // Cập nhật selectedProvider trong store
    // Phát ra sự kiện tùy chỉnh để Setting.svelte có thể lắng nghe
    const event = new CustomEvent('change', { detail: newValue })
    dispatchEvent(event)
  }
</script>

<Select.Root
  type="single"
  bind:value={settings.selectedProvider}
  items={providers}
  onValueChange={handleChange}
>
  <Select.Trigger
    class="select-none font-mono relative text-xs overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-1.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-white/10 transition-colors duration-150"
    aria-label="Select a provider"
  >
    <div class="provider">
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
      class="focus-override text-text-primary bg-surface-2 outline-hidden z-50 h-96 max-h-[var(--bits-select-content-available-height)] w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] select-none border border-border"
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
                {#each providers as provider, i (i + provider.value)}
                  <Select.Item
                    class=" font-mono text-xs data-highlighted:bg-blackwhite/10 outline-hidden flex h-6 w-full select-none items-center py-1 pl-3 pr-2 capitalize duration-75"
                    value={provider.value}
                    label={provider.label}
                  >
                    {#snippet children({ selected })}
                      {provider.label}
                      {#if selected}
                        <div class="ml-auto">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                          >
                            <path
                              fill="currentColor"
                              fill-rule="evenodd"
                              d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353l4.493-6.74a.75.75 0 0 1 1.04-.207"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </div>
                      {/if}
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
                    d="M7.47 12.78a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8 11.19l-2.72 2.72a.75.75 0 0 0-1.06 1.06zM4.22 4.53l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8 6.19L5.28 3.47a.75.75 0 0 0-1.06 1.06"
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
  .provider::after {
    transform: rotate(45deg) translate(50%, -50%);
  }
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
  .provider::before {
    transform: translateY(0);
  }
</style>
