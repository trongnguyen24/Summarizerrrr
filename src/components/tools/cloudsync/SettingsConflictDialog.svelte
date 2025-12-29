<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'

  let { conflict, isResolving = false, onResolve } = $props()

  // Check if settings has any API key configured
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

    const hasKey = apiKeyFields.some(
      (field) => settings[field] && settings[field].trim() !== '',
    )
    return hasKey ? '✓ Has API keys' : 'No API keys'
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

    return hasCustom ? '✓ Has custom prompts' : 'Default'
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
</script>

<Dialog.Root open={!!conflict}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-[999] bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade></div>
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

            <div class="bg-surface-1 flex flex-col p-6 gap-4">
              <p class="text-text-secondary text-xs leading-relaxed">
                Your local settings differ from cloud. Choose which settings to
                keep:
              </p>

              <!-- Local Settings Card -->
              <div class="border border-border rounded-lg p-4">
                <div class="flex justify-between items-center mb-2">
                  <div class="flex items-center gap-2">
                    <Icon
                      icon="heroicons:device-phone-mobile"
                      class="size-4 text-primary"
                    />
                    <span class="text-xs font-medium text-text-primary"
                      >This Device</span
                    >
                  </div>
                  <span class="text-[10px] text-muted">
                    {formatRelativeTimestamp(conflict?.localTimestamp)}
                  </span>
                </div>
                <div class="text-[11px] text-text-secondary space-y-1 mb-3">
                  <div class="flex gap-2">
                    <span class="text-muted w-16">API Keys:</span>
                    <span
                      class={getApiKeyStatus(conflict?.localSettings)?.includes(
                        '✓',
                      )
                        ? 'text-green-500'
                        : ''}>{getApiKeyStatus(conflict?.localSettings)}</span
                    >
                  </div>
                  <div class="flex gap-2">
                    <span class="text-muted w-16">Prompts:</span>
                    <span
                      class={getPromptStatus(conflict?.localSettings)?.includes(
                        '✓',
                      )
                        ? 'text-green-500'
                        : ''}>{getPromptStatus(conflict?.localSettings)}</span
                    >
                  </div>
                </div>
                <button
                  onclick={() => onResolve('local')}
                  disabled={isResolving}
                  class="font-mono w-full flex justify-center items-center group overflow-hidden relative text-text-primary"
                >
                  <div
                    class="absolute inset-0 border border-border group-hover:border-border-2 bg-surface-2"
                  ></div>
                  <div class="relative !text-center z-10 px-6 py-2 text-sm">
                    {isResolving ? 'Processing...' : 'Use Local'}
                  </div>
                  <span
                    class="absolute z-10 size-4 border border-border group-hover:border-border-2 rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
                  ></span>
                </button>
              </div>

              <!-- Cloud Settings Card -->
              <div class="border border-border rounded-lg p-4">
                <div class="flex justify-between items-center mb-2">
                  <div class="flex items-center gap-2">
                    <Icon icon="heroicons:cloud" class="size-4 text-blue-500" />
                    <span class="text-xs font-medium text-text-primary"
                      >Cloud</span
                    >
                  </div>
                  <span class="text-[10px] text-muted">
                    {formatRelativeTimestamp(conflict?.cloudTimestamp)}
                  </span>
                </div>
                <div class="text-[11px] text-text-secondary space-y-1 mb-3">
                  <div class="flex gap-2">
                    <span class="text-muted w-16">API Keys:</span>
                    <span
                      class={getApiKeyStatus(conflict?.cloudSettings)?.includes(
                        '✓',
                      )
                        ? 'text-green-500'
                        : ''}>{getApiKeyStatus(conflict?.cloudSettings)}</span
                    >
                  </div>
                  <div class="flex gap-2">
                    <span class="text-muted w-16">Prompts:</span>
                    <span
                      class={getPromptStatus(conflict?.cloudSettings)?.includes(
                        '✓',
                      )
                        ? 'text-green-500'
                        : ''}>{getPromptStatus(conflict?.cloudSettings)}</span
                    >
                  </div>
                </div>
                <button
                  onclick={() => onResolve('cloud')}
                  disabled={isResolving}
                  class="font-mono overflow-hidden w-full group relative text-white"
                >
                  <div
                    class="absolute inset-0 border border-blue-400 group-hover:border-blue-300 bg-blue-500"
                  ></div>
                  <div class="relative !text-center z-10 px-6 py-2 text-sm">
                    {isResolving ? 'Processing...' : 'Use Cloud'}
                  </div>
                  <span
                    class="absolute z-10 size-4 border border-blue-400 group-hover:border-blue-300 rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
                  ></span>
                </button>
              </div>

              <!-- Cancel Button -->
              <button
                onclick={() => onResolve('cancel')}
                disabled={isResolving}
                class="w-full px-3 py-2 text-xs text-muted border border-border rounded-md hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                Cancel - Don't sync settings now
              </button>
            </div>
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
