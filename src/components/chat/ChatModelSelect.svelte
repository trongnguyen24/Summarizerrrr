<script>
  // @ts-nocheck
  import { DropdownMenu } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import { browser } from 'wxt/browser'
  import {
    chatState,
    setChatModel,
    getEffectiveChatModel,
    notifyChatDraftChanged,
  } from '@/stores/chatStore.svelte.js'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import {
    resolveProviderEntry,
    isProviderConfigured,
  } from '@/lib/providers/providerRegistry.js'
  import { formatModelDisplayName } from '@/lib/chat/modelDisplayName.js'
  import {
    getChatReasoningOptions,
    effectiveReasoningLevel,
  } from '@/lib/api/reasoningConfig.js'
  import { acquireOverlayScrollLock } from '@/lib/utils/overlayScrollLock.js'
  import { _ } from 'svelte-i18n'

  let { disabled = false } = $props()

  const isDisabled = $derived(disabled || chatState.isSending)

  // Effective chat model currently active (either conversation, override, or fallback default)
  const effectiveModel = $derived(getEffectiveChatModel())

  const effectiveEntry = $derived(
    effectiveModel.provider
      ? resolveProviderEntry(effectiveModel.provider, settings)
      : null,
  )

  const isEffectiveUnconfigured = $derived(
    effectiveModel.provider &&
      !isProviderConfigured(effectiveModel.provider, settings),
  )

  const isEffectiveWarning = $derived(
    !effectiveEntry || isEffectiveUnconfigured,
  )

  // Trigger label and icon
  const triggerLabel = $derived(formatModelDisplayName(effectiveModel.model))
  const triggerIcon = $derived(
    isEffectiveWarning
      ? 'heroicons:exclamation-triangle-16-solid'
      : effectiveEntry?.iconifyIcon || 'heroicons:cpu-chip-20-solid',
  )

  // Model comparison helper
  function isSameModel(a, b) {
    return a && b && a.provider === b.provider && a.model === b.model
  }

  // Resolve metadata for any list item
  function resolveItemDetails(item) {
    const entry = resolveProviderEntry(item.provider, settings)
    const isUnconfigured =
      item.provider && !isProviderConfigured(item.provider, settings)
    const isWarning = !entry || isUnconfigured

    const label = formatModelDisplayName(item.model)
    const icon = isWarning
      ? 'heroicons:exclamation-triangle-16-solid'
      : entry?.iconifyIcon || 'heroicons:cpu-chip-20-solid'

    return { label, icon, isWarning }
  }

  // Menu items list derivation
  const menuItems = $derived.by(() => {
    const items = []

    // A. Default model (derived from settings.chat block)
    const defProv = settings.chat?.provider || 'gemini'
    const defMod = settings.chat?.model || ''
    const defEntry = resolveProviderEntry(defProv, settings)
    const defaultModelId = defMod || defEntry?.defaultModel || ''

    const defaultItem = {
      provider: defProv,
      model: defaultModelId,
    }
    items.push(defaultItem)

    // B. Quick models
    const quickList = settings.chat?.quickModels || []
    for (const qm of quickList) {
      if (!isSameModel(qm, defaultItem)) {
        items.push({
          provider: qm.provider,
          model: qm.model,
        })
      }
    }

    // C. Conversation's current pair if not in A or B
    const isCurrentInList =
      isSameModel(effectiveModel, defaultItem) ||
      quickList.some((qm) => isSameModel(effectiveModel, qm))
    if (!isCurrentInList && effectiveModel.provider && effectiveModel.model) {
      items.push({
        provider: effectiveModel.provider,
        model: effectiveModel.model,
      })
    }

    return items
  })

  function handleSelect(item) {
    if (isDisabled) return
    setChatModel({ provider: item.provider, model: item.model })
  }

  // --- Reasoning effort derivations ---
  const activeProviderId = $derived(
    chatState.conversation?.providerId || settings.chat?.provider || '',
  )
  const activeModelId = $derived(
    chatState.conversation?.modelId || settings.chat?.model || null,
  )
  const reasoningOptions = $derived(
    getChatReasoningOptions(activeProviderId, activeModelId),
  )
  const displayedReasoningLevel = $derived(
    effectiveReasoningLevel(chatState.reasoningLevel, settings),
  )
  const currentChoice = $derived(
    reasoningOptions.find((o) => o.value === displayedReasoningLevel) ||
      reasoningOptions[0],
  )
  const supportsReasoning = $derived(reasoningOptions.length > 1)
  const showEffortSuffix = $derived(
    supportsReasoning && displayedReasoningLevel !== 'provider-default',
  )

  // Reset reasoning level when available options shrink (e.g. provider switch)
  $effect(() => {
    const validValues = new Set(reasoningOptions.map((o) => o.value))
    if (
      !validValues.has(
        effectiveReasoningLevel(chatState.reasoningLevel, settings),
      )
    ) {
      chatState.reasoningLevel = 'provider-default'
      notifyChatDraftChanged()
    }
  })

  function handleReasoningChange(level) {
    chatState.reasoningLevel = level
    notifyChatDraftChanged()
  }

  function openSettings() {
    browser.tabs.create({
      url: browser.runtime.getURL('settings.html') + '?tab=chat',
    })
  }

  let releaseScrollLock = null

  function handleOpenChange(open) {
    if (open) {
      releaseScrollLock?.()
      releaseScrollLock = acquireOverlayScrollLock()
      return
    }

    releaseScrollLock?.()
    releaseScrollLock = null
  }

  $effect(() => {
    return () => releaseScrollLock?.()
  })

  // Shared class for a menu row (model item, submenu trigger, manage item)
  const ROW =
    'flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-sm transition-colors hover:bg-surface-2 data-[highlighted]:bg-surface-2'
</script>

<DropdownMenu.Root onOpenChange={handleOpenChange}>
  <DropdownMenu.Trigger disabled={isDisabled}>
    {#snippet child({ props })}
      <button
        class="inline-flex items-center gap-1 px-2 py-1 -ml-1 rounded-full text-xs leading-none font-medium whitespace-nowrap cursor-pointer transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
        {isEffectiveWarning
          ? 'text-warning hover:bg-warning/10'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'}
        {isDisabled ? 'opacity-50 cursor-default pointer-events-none' : ''}"
        data-testid="model-trigger"
        data-warning={isEffectiveWarning}
        aria-label={$_('chat.model_select.aria_label', {
          default: `Chat model: {model}`,
          values: { model: effectiveModel.model || 'Auto' },
        })}
        {...props}
      >
        <Icon icon={triggerIcon} width="12" height="12" class="shrink-0" />
        <span class="max-w-32 truncate select-none" data-testid="model-name"
          >{triggerLabel}</span
        >
        {#if showEffortSuffix}
          <span
            class="text-muted font-normal select-none"
            data-testid="model-effort">{currentChoice?.label}</span
          >
        {/if}
        {#if !isDisabled}
          <Icon
            icon="heroicons:chevron-up-down-16-solid"
            width="12"
            height="12"
            class="opacity-60"
          />
        {/if}
      </button>
    {/snippet}
  </DropdownMenu.Trigger>

  <DropdownMenu.Portal>
    <DropdownMenu.Content
      class="bg-surface-1 dark:bg-surface-2 border border-border rounded-lg shadow-lg z-50 min-w-48 max-w-72 p-1"
      sideOffset={6}
      align="start"
      side="top"
    >
      {#each menuItems as item (item.provider + ':' + item.model)}
        {@const details = resolveItemDetails(item)}
        {@const isActive = isSameModel(effectiveModel, item)}
        <DropdownMenu.Item
          class="{ROW} {details.isWarning
            ? 'text-warning'
            : 'text-text-primary'}"
          onSelect={() => handleSelect(item)}
        >
          <Icon
            icon={details.icon}
            width="12"
            height="12"
            class="shrink-0 {details.isWarning ? 'text-warning' : 'text-muted'}"
          />
          <span
            class="flex-1 text-left text-xs truncate"
            data-testid="model-option-label">{details.label}</span
          >
          {#if isActive}
            <Icon
              icon="heroicons:check"
              width="12"
              height="12"
              class="shrink-0 text-text-secondary"
            />
          {/if}
        </DropdownMenu.Item>
      {/each}

      <DropdownMenu.Separator class="h-px bg-border my-1" />

      {#if supportsReasoning}
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger
            class="{ROW} text-text-primary text-xs data-[state=open]:bg-surface-2"
          >
            <Icon
              icon="heroicons:sparkles"
              width="12"
              height="12"
              class="shrink-0 text-muted"
            />
            <span
              >{$_('chat.model_select.reasoning', {
                default: 'Reasoning',
              })}</span
            >
            <span class="ml-auto text-muted">{currentChoice?.label}</span>
            <Icon
              icon="heroicons:chevron-right-16-solid"
              width="12"
              height="12"
              class="shrink-0 text-muted"
            />
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent
            class="bg-surface-1 dark:bg-surface-2 border border-border rounded-lg shadow-lg z-50 min-w-24 p-1"
            sideOffset={4}
          >
            {#each reasoningOptions as option (option.value)}
              <DropdownMenu.Item
                class="{ROW} text-text-primary"
                onSelect={() => handleReasoningChange(option.value)}
              >
                <span class="flex-1 text-xs">{option.label}</span>
                {#if option.value === displayedReasoningLevel}
                  <Icon
                    icon="heroicons:check"
                    width="12"
                    height="12"
                    class="shrink-0 text-text-secondary"
                  />
                {/if}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
        <DropdownMenu.Separator class="h-px bg-border my-1" />
      {/if}

      <DropdownMenu.Item
        class="{ROW} text-text-primary text-xs"
        onSelect={openSettings}
      >
        <Icon
          icon="heroicons:cog-6-tooth"
          width="12"
          height="12"
          class="shrink-0 text-muted"
        />
        <span
          >{$_('chat.model_select.manage_models', {
            default: 'Manage models...',
          })}</span
        >
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
