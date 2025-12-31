<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { Dialog } from 'bits-ui'
  import { slideScaleFade, fadeOnly } from '@/lib/ui/slideScaleFade.js'

  let { conflict, isResolving = false, onResolve } = $props()

  // Track which option is selected: 'local' | 'cloud' | null
  let selectedOption = $state(null)

  // Check how many API keys are configured
  function getApiKeyStatus(settings) {
    if (!settings) return 'No API keys'

    const apiKeyFields = [
      'geminiApiKey',
      'geminiAdvancedApiKey',
      'chatgptApiKey',
      'deepseekApiKey',
      'groqApiKey',
      'cerebrasApiKey',
      'openrouterApiKey',
      'openaiCompatibleApiKey',
    ]

    const keyCount = apiKeyFields.filter(
      (field) => settings[field] && settings[field].trim() !== '',
    ).length

    if (keyCount === 0) return 'No API keys'
    return `✓ ${keyCount} API key${keyCount > 1 ? 's' : ''}`
  }

  // Default prompt value to compare against
  const DEFAULT_PROMPT = 'Summarize content, format by ## and ###: __CONTENT__'

  // Check if settings has any custom prompts
  function getPromptStatus(settings) {
    if (!settings) return 'Default'

    const promptFields = [
      'youtubeCustomPromptContent',
      'webCustomPromptContent',
      'chapterCustomPromptContent',
      'courseSummaryCustomPromptContent',
      'courseConceptsCustomPromptContent',
      'selectedTextCustomPromptContent',
      'analyzeCustomPromptContent',
      'explainCustomPromptContent',
      'debateCustomPromptContent',
      'commentCustomPromptContent',
    ]

    const hasCustom = promptFields.some((field) => {
      const value = settings[field]
      return value && value.trim() !== '' && value !== DEFAULT_PROMPT
    })

    return hasCustom ? '✓ Custom prompts' : 'Default'
  }

  function formatRelativeTimestamp(timestamp) {
    if (!timestamp) return 'Unknown'
    const now = Date.now()
    const diffMs = now - timestamp
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  function handleSync() {
    if (selectedOption) {
      onResolve(selectedOption)
    }
  }

  function handleCancel() {
    selectedOption = null
    onResolve('cancel')
  }
</script>

<Dialog.Root open={!!conflict}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-[999] bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fadeOnly></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      class="outline-hidden flex flex-col font-mono fixed left-[50%] top-1/2 w-[calc(100vw-32px)] max-w-md z-[1000] -translate-y-1/2 rounded-lg overflow-hidden shadow-lg translate-x-[-50%]"
    >
      {#snippet child({ props, open })}
        {#if open}
          <div
            {...props}
            transition:slideScaleFade={{
              duration: 300,
              slideFrom: 'bottom',
              slideDistance: '0rem',
              startScale: 0.95,
            }}
          >
            <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                class="block size-3.5 bg-error rounded-full"
                onclick={() => onResolve('cancel')}
              >
                <Icon
                  class="text-red-800 transition-opacity duration-150"
                  width={14}
                  icon="heroicons:x-mark-16-solid"
                />
              </button>
            </div>
            <div class="px-4 text-xs top-0 w-full bg-surface-2 py-2">
              <p class="!text-center text-text-primary select-none font-bold">
                Settings Sync
              </p>
            </div>

            <div class="bg-surface-1 flex flex-col p-4 gap-4">
              <p class="text-text-secondary text-xs leading-relaxed">
                Your local settings differ from cloud. <br />
                <span class="text-text-primary font-medium"
                  >Select one to keep:</span
                >
              </p>

              <!-- Cards Container -->
              <div class="grid grid-row-2 gap-3">
                <!-- Local Settings Card -->
                <button
                  type="button"
                  onclick={() => (selectedOption = 'local')}
                  class="relative bg-dot bg-background flex p-4 gap-4 justify-center items-center overflow-hidden text-left"
                >
                  <span
                    class="absolute z-50 size-6 rotate-45 bg-surface-1 border transition-all duration-200 bottom-px -left-px -translate-x-1/2 translate-y-1/2 {selectedOption ===
                    'local'
                      ? 'border-muted '
                      : 'border-border'}"
                  ></span>
                  <span
                    class="absolute z-[2] size-6 rotate-45 bg-surface-1 -top-px border -right-px translate-x-1/2 -translate-y-1/2 transition-all duration-200 {selectedOption ===
                    'local'
                      ? 'border-muted  '
                      : 'border-border'}"
                  ></span>
                  <span
                    class="absolute z-[5] size-2 rotate-45 bg-text-primary top-px right-px translate-x-1/2 -translate-y-1/2"
                  ></span>
                  <div
                    class=" absolute z-[1] inset-0 border transition-all duration-200 {selectedOption ===
                    'local'
                      ? 'border-muted '
                      : 'border-border'}
                    "
                  ></div>
                  <div class="size-16 shrink-0 overflow-hidden relative">
                    <div
                      class="absolute z-[4] border border-border dark:border-surface-2 inset-0"
                    ></div>
                    <div class="absolute inset-1 bg-surface-2"></div>
                    <span
                      class="absolute z-[2] size-6 rotate-45 bg-surface-1 bottom-px left-px -translate-x-1/2 translate-y-1/2"
                    ></span>
                    <span
                      class="absolute z-[2] size-6 rotate-45 bg-surface-1 top-px right-px translate-x-1/2 -translate-y-1/2"
                    ></span>
                    <span
                      class="absolute z-[5] size-4 rotate-45 bg-surface-1 border border-border dark:border-surface-2 bottom-px left-px -translate-x-1/2 translate-y-1/2"
                    ></span>
                    <span
                      class="absolute z-[5] size-4 rotate-45 border-surface-1 bg-border dark:bg-muted border dark:border-surface-2 top-px right-px translate-x-1/2 -translate-y-1/2"
                    ></span>
                    <Icon
                      icon="heroicons:computer-desktop"
                      class="size-8 center-abs text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
                    />
                  </div>
                  <div
                    class="flex flex-col text-xs text-text-secondary justify-center gap-1 w-full flex-1"
                  >
                    <div class="flex items-center gap-2">
                      <span class=" font-bold text-text-primary"
                        >This Device •
                      </span>
                      {formatRelativeTimestamp(conflict?.localTimestamp)}
                    </div>

                    <div class="flex text-text-secondary items-center gap-1.5">
                      <span
                        class={getApiKeyStatus(
                          conflict?.localSettings,
                        )?.includes('✓')
                          ? 'font-medium'
                          : 'text-muted'}
                        >{getApiKeyStatus(conflict?.localSettings)}</span
                      >
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span
                        class={getPromptStatus(
                          conflict?.localSettings,
                        )?.includes('✓')
                          ? 'font-medium'
                          : 'text-muted'}
                        >{getPromptStatus(conflict?.localSettings)}</span
                      >
                    </div>
                  </div>
                </button>

                <!-- Cloud Settings Card -->
                <button
                  type="button"
                  onclick={() => (selectedOption = 'cloud')}
                  class="relative bg-dot bg-background flex gap-4 p-4 justify-center items-center overflow-hidden text-left"
                >
                  <span
                    class="absolute z-50 size-6 rotate-45 bg-surface-1 border transition-all duration-200 bottom-px -left-px -translate-x-1/2 translate-y-1/2 {selectedOption ===
                    'cloud'
                      ? 'border-muted '
                      : 'border-border'}"
                  ></span>
                  <span
                    class="absolute z-[2] size-6 rotate-45 bg-surface-1 -top-px border -right-px translate-x-1/2 -translate-y-1/2 transition-all duration-200 {selectedOption ===
                    'cloud'
                      ? 'border-muted  '
                      : 'border-border'}"
                  ></span>
                  <span
                    class="absolute z-[5] size-2 rotate-45 bg-text-primary top-px right-px translate-x-1/2 -translate-y-1/2"
                  ></span>
                  <div
                    class=" absolute z-[1] inset-0 border transition-all duration-200 {selectedOption ===
                    'cloud'
                      ? 'border-muted '
                      : 'border-border'}
                    "
                  ></div>
                  <div class="size-16 shrink-0 overflow-hidden relative">
                    <div
                      class="absolute z-[4] border border-border dark:border-surface-2 inset-0"
                    ></div>
                    <div class="absolute inset-1 bg-surface-2"></div>
                    <span
                      class="absolute z-[2] size-6 rotate-45 bg-surface-1 bottom-px left-px -translate-x-1/2 translate-y-1/2"
                    ></span>
                    <span
                      class="absolute z-[2] size-6 rotate-45 bg-surface-1 top-px right-px translate-x-1/2 -translate-y-1/2"
                    ></span>
                    <span
                      class="absolute z-[5] size-4 rotate-45 bg-surface-1 border border-border dark:border-surface-2 bottom-px left-px -translate-x-1/2 translate-y-1/2"
                    ></span>
                    <span
                      class="absolute z-[5] size-4 rotate-45 border-surface-1 bg-border dark:bg-muted border dark:border-surface-2 top-px right-px translate-x-1/2 -translate-y-1/2"
                    ></span>
                    <Icon
                      icon="heroicons:cloud"
                      class="size-8 center-abs text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
                    />
                  </div>

                  <div
                    class="flex text-xs text-text-secondary flex-col justify-center gap-1 w-full flex-1"
                  >
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-text-primary">Cloud • </span>
                      {formatRelativeTimestamp(conflict?.cloudTimestamp)}
                    </div>

                    <div class="flex items-center gap-1.5">
                      <span
                        class={getApiKeyStatus(
                          conflict?.cloudSettings,
                        )?.includes('✓')
                          ? 'font-medium'
                          : 'text-muted'}
                        >{getApiKeyStatus(conflict?.cloudSettings)}</span
                      >
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span
                        class={getPromptStatus(
                          conflict?.cloudSettings,
                        )?.includes('✓')
                          ? 'font-medium'
                          : 'text-muted'}
                        >{getPromptStatus(conflict?.cloudSettings)}</span
                      >
                    </div>
                  </div>
                </button>
              </div>

              <!-- Sync Explanation -->
              {#if selectedOption}
                <div
                  class="text-xs space-y-2"
                  transition:fadeOnly={{ duration: 150 }}
                >
                  <p class="text-text-secondary leading-relaxed">
                    {#if selectedOption === 'local'}
                      <strong>This Device:</strong><br />
                      • Settings will be overwritten from this device to Cloud.
                    {:else}
                      <strong>Cloud:</strong><br />
                      • Settings will be overwritten from Cloud to this device.
                    {/if}
                  </p>
                  <p class="text-text-secondary leading-relaxed">
                    • Archive, Tags and History will be merged from both this
                    device and Cloud.
                  </p>
                </div>
              {/if}

              <!-- Action Buttons -->
              <div class="flex gap-3 mt-2">
                <button
                  onclick={handleCancel}
                  disabled={isResolving}
                  class="flex-1 px-4 py-2.5 text-xs font-medium text-text-secondary disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  class=" flex-1 flex relative text-xs font-medium overflow-hidden group"
                  onclick={handleSync}
                  disabled={!selectedOption || isResolving}
                >
                  <div
                    class=" font-medium py-2 px-4 w-full border transition-colors duration-200 {selectedOption
                      ? 'bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white'
                      : ' bg-white dark:bg-surface-1 text-text-secondary border-border/40'}"
                  >
                    Sync
                  </div>
                  <span
                    class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 {selectedOption
                      ? ' border-orange-400 group-hover:border-orange-300/75'
                      : ' border-border/40'}"
                  ></span>
                </button>
                <!-- <button
                  onclick={handleSync}
                  disabled={!selectedOption || isResolving}
                  class="flex-1 px-4 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 {selectedOption
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                    : 'bg-surface-2 text-muted cursor-not-allowed'}"
                >
                  {#if isResolving}
                    <Icon
                      icon="heroicons:arrow-path"
                      class="size-4 animate-spin"
                    />
                    <span>Syncing...</span>
                  {:else}
                    <Icon icon="heroicons:arrow-path" class="size-4" />
                    <span>Sync</span>
                  {/if}
                </button> -->
              </div>
            </div>
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
