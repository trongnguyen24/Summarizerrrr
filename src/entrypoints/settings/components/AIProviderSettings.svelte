<svelte:options runes={true} />

<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import { DropdownMenu } from 'bits-ui'
  import { slideScaleFade } from '@/lib/utils/slideScaleFade.js'
  import { OverlayScrollbars } from 'overlayscrollbars'
  import 'overlayscrollbars/overlayscrollbars.css'
  import LanguageSelect from '@/components/inputs/LanguageSelect.svelte'
  import ProviderKeyConfig from '@/entrypoints/settings/components/ProviderKeyConfig.svelte'
  import OpenAICompatibleProfileConfig from '@/entrypoints/settings/components/OpenAICompatibleProfileConfig.svelte'
  import {
    PROVIDER_LIST,
    resolveProviderEntry,
    listAddedProviderEntries,
  } from '@/lib/providers/providerRegistry.js'
  import {
    settings,
    updateSettings,
    addProvider,
    removeProvider,
    addOpenAICompatibleProfile,
    removeOpenAICompatibleProfile,
  } from '@/stores/settingsStore.svelte.js'
  import { isOpenAICompatibleProfileId } from '@/lib/providers/openAICompatibleProfiles.js'

  // Gemini is always present in addedProviders and can't be removed, so it is
  // the safe default to open when the page mounts.
  let selectedProviderId = $state('gemini')

  function selectProvider(id) {
    selectedProviderId = id
  }

  // The menu list is portalled, so it mounts/unmounts with the menu: attach
  // OverlayScrollbars per node instead of a component-level instance.
  function overlayScroll(node) {
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    if (isTouchDevice) return

    const instance = OverlayScrollbars(node, {
      scrollbars: {
        theme: 'os-theme-custom-app',
        autoHide: 'leave',
        autoHideDelay: 400,
      },
    })
    return { destroy: () => instance.destroy() }
  }

  const availableToAdd = $derived(
    PROVIDER_LIST.filter((p) => {
      if (p.isTemplate) return true
      return !(settings.addedProviders || []).includes(p.id)
    }),
  )
  const addedProviders = $derived(listAddedProviderEntries(settings))
  const selectedProvider = $derived(
    resolveProviderEntry(selectedProviderId, settings),
  )

  async function handleAddProvider(id) {
    if (id === 'openaiCompatible') {
      const newId = await addOpenAICompatibleProfile()
      selectedProviderId = newId
    } else {
      await addProvider(id)
      selectedProviderId = id
    }
  }

  async function handleRemoveProvider(id) {
    const allAdded = listAddedProviderEntries(settings)
    const remaining = allAdded.filter((p) => p.id !== id)
    if (selectedProviderId === id) {
      selectedProviderId = remaining[0]?.id || null
    }

    if (isOpenAICompatibleProfileId(id)) {
      await removeOpenAICompatibleProfile(id)
    } else {
      await removeProvider(id)
    }
  }
</script>

<!-- AI Provider Section -->
<div class="setting-block flex gap-5 pb-6 pt-5 flex-col">
  <!-- Output language: shared by summary, deep dive and chat, so it lives with
       the provider instead of inside the Summary tab. -->
  <div class="flex flex-col gap-2 px-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block font-bold text-text-primary"
      >{$t('settings.summary.language_output')}</label
    >
    <LanguageSelect
      bind:value={settings.summaryLang}
      onchange={(event) => updateSettings({ summaryLang: event.detail })}
    />
  </div>

  <div class="flex items-center h-6 justify-between px-5">
    <label class="block font-bold text-text-primary">Model AI</label>
    {#if availableToAdd.length > 0}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <button
              type="button"
              class="flex items-center gap-1.5 font-medium text-xs text-primary hover:text-primary/80 transition-colors w-fit px-1"
              {...props}
            >
              <Icon
                icon="heroicons:plus-circle-20-solid"
                width="16"
                height="16"
              />
              {$t('settings.provider_key_config.add_provider', {
                default: 'Add provider',
              })}
            </button>
          {/snippet}
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            class="bg-surface-1 dark:bg-surface-2 border border-border rounded-lg shadow-lg z-50 min-w-52 overflow-hidden"
            sideOffset={4}
            align="end"
            collisionPadding={8}
            forceMount
          >
            {#snippet child({ wrapperProps, props, open })}
              {#if open}
                <div {...wrapperProps}>
                  <div
                    {...props}
                    in:slideScaleFade={{
                      slideFrom: 'top',
                      duration: 175,
                      slideDistance: '8px',
                      startScale: 0.9,
                    }}
                    out:slideScaleFade={{
                      slideFrom: 'top',
                      duration: 75,
                      slideDistance: '0',
                      startScale: 1,
                    }}
                  >
                    <div
                      use:overlayScroll
                      class="max-h-[min(18rem,var(--bits-floating-available-height,18rem))] overflow-y-auto py-1"
                    >
                      {#each availableToAdd as provider (provider.id)}
                        <DropdownMenu.Item
                          class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-text-primary whitespace-nowrap outline-hidden select-none cursor-pointer data-highlighted:bg-blackwhite/10 transition-colors"
                          onSelect={() => handleAddProvider(provider.id)}
                        >
                          <span
                            class="flex size-3.5 shrink-0 items-center justify-center"
                          >
                            <Icon
                              icon={provider.iconifyIcon ||
                                'heroicons:cube-20-solid'}
                              width="14"
                              height="14"
                              class="text-text-secondary"
                            />
                          </span>
                          <span>{provider.label}</span>
                        </DropdownMenu.Item>
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}
            {/snippet}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    {/if}
  </div>

  <div class="setting-secsion flex flex-col gap-4 px-5">
    <div class="grid gap-2 md:grid-cols-2">
      {#each addedProviders as provider (provider.id)}
        <div class="flex items-center gap-0.5">
          <button
            type="button"
            class="focus-visible:ring-primary group relative flex h-9 flex-1 items-center gap-2 overflow-hidden px-6 pr-2 text-left text-sm text-text-secondary transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-offset-1 {selectedProviderId ===
            provider.id
              ? 'text-text-primary'
              : ''}"
            aria-pressed={selectedProviderId === provider.id}
            onclick={() => selectProvider(provider.id)}
          >
            <div
              class="absolute inset-0 border border-transparent bg-muted/5 transition-colors hover:border-blackwhite/15 {selectedProviderId ===
              provider.id
                ? '!border-border !bg-blackwhite/5 hover:!border-blackwhite/15'
                : ''}"
            ></div>
            <div
              class="absolute z-10 -bottom-2 -left-2 size-4 rotate-45 border bg-surface-1 transition-colors group-hover:border-blackwhite/15 {selectedProviderId ===
              provider.id
                ? '!border-border hover:!border-blackwhite/15'
                : 'border-transparent'}"
            ></div>
            <span
              class="absolute left-3 z-0 size-1 rounded-full transition-all {selectedProviderId ===
              provider.id
                ? '!bg-white !shadow-[0_0_6px_rgba(255,255,255,1),0_0_3px_rgba(255,255,255,0.647)]'
                : '!bg-blackwhite/10 shadow-[0_0_0_rgba(255,255,255,0),0_0_0_rgba(255,255,255,0)]'}"
            ></span>
            <span class="flex size-4 shrink-0 items-center justify-center">
              <Icon
                icon={provider.iconifyIcon || 'heroicons:cube-20-solid'}
                width="16"
                height="16"
              />
            </span>
            <span class="line-clamp-1 font-medium">{provider.label}</span>
          </button>

          {#if provider.id !== 'gemini'}
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center border border-transparent bg-muted/5 text-text-secondary transition-colors hover:border-blackwhite/15 hover:text-red-500 {selectedProviderId ===
              provider.id
                ? 'border-border'
                : ''}"
              onclick={() => handleRemoveProvider(provider.id)}
              title={$t('settings.provider_key_config.remove_provider', {
                default: 'Remove',
              })}
              aria-label={$t('settings.provider_key_config.remove_provider', {
                default: 'Remove',
              })}
            >
              <Icon icon="heroicons:x-mark-20-solid" width="14" height="14" />
            </button>
          {/if}
        </div>
      {/each}
    </div>

    {#if selectedProvider}
      {#if isOpenAICompatibleProfileId(selectedProvider.id)}
        <OpenAICompatibleProfileConfig
          profileId={selectedProvider.id}
          onRemove={() => handleRemoveProvider(selectedProvider.id)}
        />
      {:else}
        <ProviderKeyConfig
          entry={selectedProvider}
          isExpanded={true}
          showHeader={false}
        />
      {/if}
    {/if}

    <!-- The guide video only covers Gemini, so only show it for Gemini. -->
    {#if selectedProviderId === 'gemini'}
      <a
        href="https://www.youtube.com/watch?v=Is2mJuF2HPY"
        target="_blank"
        class="text-xs flex gap-1 items-center mt-auto self-center text-text-secondary hover:text-primary underline underline-offset-2 transition-colors"
      >
        {$t('apiKeyPrompt.setupGuide')}<Icon
          width={12}
          icon="heroicons:arrow-up-right-16-solid"
        />
      </a>
    {/if}
  </div>
</div>
