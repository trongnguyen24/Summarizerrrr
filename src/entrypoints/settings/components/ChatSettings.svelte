<svelte:options runes={true} />

<script>
  // @ts-nocheck
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'
  import { settings, updateSettings, updateFeatureSettings } from '@/stores/settingsStore.svelte.js'
  import { CHAT_TONE_ROLES } from '@/lib/chat/chatToneRoles.js'
  import FeatureModelPicker from '@/entrypoints/settings/components/inputs/FeatureModelPicker.svelte'
  import { t } from 'svelte-i18n'
  import { REASONING_CHOICES } from '@/lib/api/reasoningConfig.js'
  import { resolveProviderEntry } from '@/lib/providers/providerRegistry.js'
  import { formatModelDisplayName } from '@/lib/chat/modelDisplayName.js'
  import Icon from '@iconify/svelte'

  const MAX_QUICK_MODELS = 6

  // Chat's tone is independent from Settings > Summary and uses its own
  // chat-native tone roles (CHAT_TONE_ROLES) rather than the summarize-flow
  // toneDefinitions. Savage is hidden: it unlocks by clicking the witty tile
  // three times, mirroring Settings > Summary.
  const TONE_OPTIONS = [
    { value: '', label: 'none', description: 'No tone instruction.' },
    ...['simple', 'expert', 'witty'].map((value) => ({
      value,
      label: value,
      description: CHAT_TONE_ROLES[value].toneDescription,
    })),
  ]

  let wittyClickCount = $state(0)

  function currentTone() {
    return currentPersona().tone || ''
  }

  function handleWittyClick() {
    if (currentTone() === 'witty') {
      wittyClickCount++
      if (wittyClickCount >= 3) patchPersona({ tone: 'savage' })
    } else if (currentTone() !== 'savage') {
      patchPersona({ tone: 'witty' })
      wittyClickCount = 0
    }
  }

  function handleToneClick(option) {
    if (option.value === 'witty') return handleWittyClick()
    wittyClickCount = 0
    patchPersona({ tone: option.value || null })
  }

  function currentPersona() {
    return settings.chatGlobalPersona || {}
  }

  function patchPersona(patch) {
    const next = {
      content: currentPersona().content || '',
      language: currentPersona().language || null,
      tone: currentPersona().tone || null,
      version: (currentPersona().version || 1) + 1,
      ...patch,
    }
    updateSettings({ chatGlobalPersona: next })
  }

  // --- Quick models ---

  function quickModels() {
    return settings.chat?.quickModels || []
  }

  function isQuickModelDuplicate(provider, model) {
    return quickModels().some((qm) => qm.provider === provider && qm.model === model)
  }

  function isQuickModelsFull() {
    return quickModels().length >= MAX_QUICK_MODELS
  }

  function addCurrentModelToQuickModels() {
    const provider = settings.chat?.provider
    const model = settings.chat?.model
    if (!provider || !model) return
    if (isQuickModelDuplicate(provider, model) || isQuickModelsFull()) return
    updateFeatureSettings('chat', {
      quickModels: [...quickModels(), { provider, model }],
    })
  }

  function removeQuickModel(index) {
    const next = quickModels().filter((_, i) => i !== index)
    updateFeatureSettings('chat', { quickModels: next })
  }

  function resolveQuickModelLabel(qm) {
    return formatModelDisplayName(qm.model)
  }

  function resolveQuickModelIcon(qm) {
    const entry = resolveProviderEntry(qm.provider, settings)
    // An unresolvable provider (unconfigured, or a deleted profile) carries the
    // same warning triangle FeatureModelPicker uses for that state.
    if (!entry) return 'heroicons:exclamation-triangle-16-solid'
    return entry.iconifyIcon || 'heroicons:cpu-chip-20-solid'
  }

  function isQuickModelWarning(qm) {
    const entry = resolveProviderEntry(qm.provider, settings)
    return !entry
  }

  // --- Default reasoning ---

  function currentDefaultReasoning() {
    return settings.chat?.defaultReasoningLevel || 'provider-default'
  }

  function setDefaultReasoning(value) {
    updateFeatureSettings('chat', { defaultReasoningLevel: value })
  }
</script>

<!-- Chat Section -->
<div class="setting-block flex flex-col gap-5 pb-6 pt-5">
  <div class="flex items-center h-6 justify-between px-5">
    <label class="block font-bold text-text-primary">Chat</label>
  </div>

  <div class="setting-secsion flex flex-col gap-6 px-5">
    <!-- Chat Model Picker -->
    <div class="flex flex-col gap-2">
      <FeatureModelPicker
        bind:provider={settings.chat.provider}
        bind:model={settings.chat.model}
        onchange={(p, m) => updateFeatureSettings('chat', { provider: p, model: m })}
      />
      <!-- Add to quick models -->
      <button
        type="button"
        id="add-quick-model-btn"
        class="self-start text-xs text-text-secondary hover:text-text-primary transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={isQuickModelsFull() || isQuickModelDuplicate(settings.chat?.provider, settings.chat?.model)}
        onclick={addCurrentModelToQuickModels}
      >
        + {$t('settings.chat.add_to_quick_models')}
      </button>
    </div>

    <!-- Quick models chips -->
    {#if quickModels().length > 0}
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary">{$t('settings.chat.quick_models')}</label>
        <div class="flex flex-wrap gap-1.5">
          {#each quickModels() as qm, i (qm.provider + ':' + qm.model)}
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border transition-colors duration-150
                {isQuickModelWarning(qm)
                  ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                  : 'border-border text-text-secondary bg-muted/5 dark:bg-muted/5'}"
            >
              <Icon
                icon={resolveQuickModelIcon(qm)}
                width="12"
                height="12"
                class="shrink-0"
              />
              <span class="truncate max-w-[200px]">{resolveQuickModelLabel(qm)}</span>
              <button
                type="button"
                class="text-text-secondary hover:text-text-primary transition-colors duration-150 leading-none"
                onclick={() => removeQuickModel(i)}
                title={$t('settings.chat.remove_quick_model')}
                aria-label="{$t('settings.chat.remove_quick_model')}: {resolveQuickModelLabel(qm)}"
              >✕</button>
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Default reasoning level -->
    <div class="flex flex-col gap-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-text-secondary">{$t('settings.chat.default_reasoning')}</label>
      <div class="grid grid-cols-4 w-full gap-1">
        {#each REASONING_CHOICES as choice (choice.value)}
          <ButtonSet
            title={choice.label}
            class="setting-btn {currentDefaultReasoning() === choice.value ? 'active' : ''}"
            onclick={() => setDefaultReasoning(choice.value)}
            Description={choice.description}
          ></ButtonSet>
        {/each}
      </div>
    </div>

    <!-- Tone -->
    <div class="flex flex-col gap-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-text-secondary">Tone</label>
      <div class="grid grid-cols-4 w-full gap-1">
        {#each TONE_OPTIONS as option (option.value)}
          {@const isWittySlot = option.value === 'witty'}
          {@const showSavage = isWittySlot && currentTone() === 'savage'}
          <ButtonSet
            title={showSavage ? 'savage' : option.label}
            class="setting-btn {(isWittySlot ? ['witty', 'savage'].includes(currentTone()) : currentTone() === option.value) ? 'active' : ''}"
            onclick={() => handleToneClick(option)}
            Description={showSavage ? CHAT_TONE_ROLES.savage.toneDescription : option.description}
          ></ButtonSet>
        {/each}
      </div>
    </div>
  </div>
</div>
