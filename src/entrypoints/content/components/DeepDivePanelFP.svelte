<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import {
    settings,
    updateToolSettings,
  } from '@/stores/settingsStore.svelte.js'
  import {
    deepDiveState,
    setQuestions,
    setGenerating,
    setError,
    addToQuestionHistory,
    setSelectedQuestion,
    setCustomQuestion,
    nextPage,
    previousPage,
    getTotalPages,
  } from '@/stores/deepDiveStore.svelte.js'
  import {
    generateFollowUpQuestions,
    openDeepDiveChat,
    validateDeepDiveAvailability,
  } from '@/services/tools/deepDiveService.js'

  // Import Shadow DOM compatible components
  import QuestionChip from '@/components/tools/deepdive/QuestionChip.svelte'

  // Import provider icons
  import GeminiIcon from '@/components/icons/GeminiIcon.svelte'
  import ChatGPTIcon from '@/components/icons/ChatGPTIcon.svelte'
  import PerplexityIcon from '@/components/icons/PerplexityIcon.svelte'
  import GrokIcon from '@/components/icons/GrokIcon.svelte'

  // Props
  let {
    summaryContent,
    pageTitle,
    pageUrl,
    summaryLang = 'English',
    isVisible = false,
  } = $props()

  // State from store
  let questions = $derived(deepDiveState.questions)
  let isGenerating = $derived(deepDiveState.isGenerating)
  let error = $derived(deepDiveState.error)
  let hasGenerated = $derived(deepDiveState.hasGenerated)

  // Derived state for provider (sync with global settings)
  let chatProvider = $derived(
    settings.tools?.deepDive?.defaultChatProvider || 'gemini'
  )

  // Derived state
  let toolConfig = $derived(settings.tools?.deepDive ?? {})
  let isToolEnabled = $derived(toolConfig.enabled ?? false)
  let availability = $derived(validateDeepDiveAvailability())
  let canGenerate = $derived(
    isToolEnabled && availability.available && summaryContent && !isGenerating
  )
  let hasQuestions = $derived(questions.length > 0)

  // Pagination state
  let totalPages = $derived(getTotalPages())
  let hasPagination = $derived(totalPages > 1)
  let canGoBack = $derived(deepDiveState.currentPageIndex > 0 && !isGenerating)
  let canGoForward = $derived(
    deepDiveState.currentPageIndex < totalPages - 1 && !isGenerating
  )

  // Chat provider configs
  const providers = [
    {
      value: 'gemini',
      label: 'Gemini',
      icon: GeminiIcon,
    },
    {
      value: 'chatgpt',
      label: 'ChatGPT',
      icon: ChatGPTIcon,
    },
    {
      value: 'perplexity',
      label: 'Perplexity',
      icon: PerplexityIcon,
    },
    { value: 'grok', label: 'Grok', icon: GrokIcon },
  ]

  const selectedProvider = $derived(
    providers.find((p) => p.value === chatProvider) || providers[0]
  )

  /**
   * Handles question generation
   */
  async function handleGenerate() {
    if (!canGenerate) return

    setGenerating(true)
    setError(null)

    try {
      console.log('[DeepDivePanelFP] Generating questions...')
      console.log(
        '[DeepDivePanelFP] Using history:',
        deepDiveState.questionHistory.length,
        'generations'
      )

      const generated = await generateFollowUpQuestions(
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang,
        deepDiveState.questionHistory
      )

      setQuestions(generated)
      addToQuestionHistory(generated)

      console.log('[DeepDivePanelFP] Generated questions:', generated)
      console.log(
        '[DeepDivePanelFP] Total history:',
        deepDiveState.questionHistory.length
      )
    } catch (err) {
      console.error('[DeepDivePanelFP] Generation error:', err)
      setError(err.message || 'Failed to generate questions')
    } finally {
      setGenerating(false)
    }
  }

  /**
   * Handles regenerate questions
   */
  async function handleRegenerate() {
    if (!canGenerate) return

    // Clear current selections
    setSelectedQuestion(null)
    setCustomQuestion('')

    // Reuse existing generate logic
    await handleGenerate()
  }

  /**
   * Handles question selection - directly open chat
   */
  async function handleQuestionSelect(question) {
    await handleStartChatWithQuestion(question)
  }

  /**
   * Handles "Ask Your Own Question" - opens chat with open-ended prompt
   */
  async function handleAskYourOwn() {
    await handleStartChatWithQuestion('') // Empty string triggers open-ended prompt
  }

  /**
   * Handles chat provider change
   */
  async function handleProviderChange(newProvider) {
    // Save to settings store (global) - chatProvider will auto-update via $derived
    await updateToolSettings('deepDive', { defaultChatProvider: newProvider })
    console.log('[DeepDivePanelFP] Provider changed to:', newProvider)
  }

  /**
   * Handles starting chat with question (or empty for open-ended)
   */
  async function handleStartChatWithQuestion(question) {
    try {
      console.log(
        '[DeepDivePanelFP] Starting chat with question:',
        question || '[open-ended]'
      )
      await openDeepDiveChat(
        question,
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang,
        chatProvider
      )
    } catch (err) {
      console.error('[DeepDivePanelFP] Chat error:', err)
      setError(err.message || 'Failed to open chat')
    }
  }
</script>

{#if isVisible}
  <div class="deep-dive-panel-fp flex flex-col mx-auto gap-6 py-6">
    <!-- Header -->
    <div
      class="w-full border-t border-b py-3 border-border relative font-mono text-text-primary flex justify-center items-center gap-2"
    >
      <div
        class="h-2 absolute w-full top-0 -translate-y-2 top-stripes border-t border-border"
      ></div>
      <span class="uppercase text-xs">Deep Dive Questions</span>
    </div>

    <!-- Error Display -->
    {#if error}
      <div
        class="error-message p-3 bg-red-500/10 border border-red-500/30 rounded-md"
      >
        <p class="text-xs text-red-400">{error}</p>
      </div>
    {/if}

    <!-- Availability Warning -->
    {#if !availability.available}
      <div
        class="warning-message p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md"
      >
        <p class="text-xs text-yellow-400">{availability.reason}</p>
      </div>
    {:else}
      <!-- Generate Questions Section -->
      {#if !hasQuestions}
        <div class="generate-section">
          <button
            class="generate-btn w-fit flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-1 hover:bg-surface-2 border border-border rounded-full transition-colors duration-200 {isGenerating
              ? 'opacity-50 cursor-not-allowed'
              : ''}"
            onclick={handleGenerate}
            disabled={isGenerating || !canGenerate}
          >
            {#if isGenerating}
              <Icon
                icon="heroicons:arrow-path"
                width="24"
                height="24"
                class="animate-spin"
              />
              <span class="text-xs text-text-secondary"
                >{$t('settings.tools.deepdive.generating_questions')}</span
              >
            {:else}
              <Icon
                icon="heroicons:sparkles"
                width="24"
                height="24"
                class="text-primary"
              />
              <span class="text-sm text-text-primary"
                >{$t('settings.tools.deepdive.generate_questions')}</span
              >
            {/if}
          </button>
        </div>
      {/if}

      <!-- Questions Display -->
      {#if hasQuestions}
        <div
          class="questions-section flex flex-col px-6 max-w-[32em] mx-auto gap-6"
        >
          <!-- Chat Provider Buttons -->
          <div class="flex justify-between items-center w-full">
            <!-- Navigation Controls -->
            {#if hasPagination}
              <div
                class="navigation-controls flex items-center justify-center gap-2"
              >
                <!-- Reload Button -->
                <button
                  onclick={handleRegenerate}
                  disabled={isGenerating || !canGenerate}
                  class="nav-btn"
                  title={isGenerating
                    ? $t('settings.tools.deepdive.generating')
                    : $t('settings.tools.deepdive.generate_new_questions')}
                  aria-label="Reload questions"
                >
                  <Icon
                    icon="heroicons:arrow-path"
                    width="16"
                    height="16"
                    class={isGenerating ? 'animate-spin' : ''}
                  />
                </button>
                <!-- Back Button -->
                <button
                  onclick={previousPage}
                  disabled={!canGoBack}
                  class="nav-btn"
                  title={$t('settings.tools.deepdive.previous_questions')}
                  aria-label="Previous page"
                >
                  <Icon icon="heroicons:chevron-left" width="16" height="16" />
                </button>

                <!-- Forward Button -->
                <button
                  onclick={nextPage}
                  disabled={!canGoForward}
                  class="nav-btn"
                  title={$t('settings.tools.deepdive.next_questions')}
                  aria-label="Next page"
                >
                  <Icon icon="heroicons:chevron-right" width="16" height="16" />
                </button>
              </div>
            {:else if hasQuestions}
              <!-- Single page - show reload only -->
              <div class="flex justify-center">
                <button
                  onclick={handleRegenerate}
                  disabled={isGenerating || !canGenerate}
                  class="nav-btn"
                  title={isGenerating
                    ? $t('settings.tools.deepdive.generating')
                    : $t('settings.tools.deepdive.generate_new_questions')}
                >
                  <Icon
                    icon="heroicons:arrow-path"
                    width="16"
                    height="16"
                    class={isGenerating ? 'animate-spin' : ''}
                  />
                </button>
              </div>
            {/if}
            <!-- Provider Buttons -->
            <div
              class="provider-buttons flex w-fit overflow-hidden px-1 gap-1 border border-border rounded-full"
            >
              {#each providers as provider (provider.value)}
                {@const IconComponent = provider.icon}
                <button
                  onclick={() => handleProviderChange(provider.value)}
                  class="provider-btn px-2 py-1.5 transition-all duration-200
                             {chatProvider === provider.value
                    ? '  text-primary'
                    : 'hover:text-text-primary  text-text-secondary '}"
                  title={provider.label}
                >
                  <IconComponent width="20" height="20" />
                </button>
              {/each}
            </div>
          </div>
          <div class="flex flex-col gap-5">
            {#each questions as question, i (question)}
              <QuestionChip
                {question}
                index={i + 1}
                isSelected={false}
                disabled={isGenerating}
                onclick={() => handleQuestionSelect(question)}
              />
            {/each}

            <!-- Action Buttons Row -->
            <div class="flex justify-center items-center gap-2 pt-2">
              <!-- Regenerate Button -->

              <!-- Ask Your Own Question Button -->
              <button
                onclick={handleAskYourOwn}
                class="ask-own-btn flex items-center gap-2 py-2 px-4 underline text-sm text-text-secondary hover:text-text-primary transition-all duration-200"
                title={$t('settings.tools.deepdive.ask_own_question_in_chat')}
              >
                <Icon icon="heroicons:sparkles" width="20" height="20" />
                <span>{$t('settings.tools.deepdive.ask_own_question')}</span>
              </button>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .generate-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .nav-btn {
    padding: 0.5em;
    background-color: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 10rem;
    color: var(--text-secondary);
    transition: all 200ms;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-btn:hover {
    background-color: var(--color-surface-2);
    color: var(--primary);
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    border: 1px solid transparent;
    pointer-events: none;
  }

  .ask-own-btn:hover {
    transform: scale(1);
  }

  .provider-btn:not(:disabled):hover {
    transform: scale(1);
  }

  .provider-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
