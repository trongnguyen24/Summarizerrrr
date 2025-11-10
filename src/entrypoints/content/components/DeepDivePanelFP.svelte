<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import {
    deepDiveState,
    setQuestions,
    setGenerating,
    setError,
    addToQuestionHistory,
  } from '@/stores/deepDiveStore.svelte.js'
  import {
    generateFollowUpQuestions,
    openDeepDiveChat,
    validateDeepDiveAvailability,
  } from '@/services/tools/deepDiveService.js'

  // Import Shadow DOM compatible components
  import QuestionChip from '@/components/tools/deepdive/QuestionChip.svelte'

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

  // Local state
  let chatProvider = $state(
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

  // Chat provider configs
  const providers = [
    {
      value: 'gemini',
      label: 'Gemini',
      iconPath: 'M12 2L2 7v10l10 5 10-5V7L12 2z',
    },
    {
      value: 'chatgpt',
      label: 'ChatGPT',
      iconPath: 'M12 2a10 10 0 100 20 10 10 0 000-20z',
    },
    {
      value: 'perplexity',
      label: 'Perplexity',
      iconPath: 'M12 2L2 7l10 5 10-5-10-5z',
    },
    { value: 'grok', label: 'Grok', iconPath: 'M12 2v20M2 12h20' },
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
  function handleProviderChange(newProvider) {
    chatProvider = newProvider
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
  <div class="deep-dive-panel-fp flex flex-col gap-4 px-4 py-6">
    <!-- Header -->
    <div
      class="w-fit mx-auto relative font-mono text-xs text-text-secondary flex justify-center items-center gap-2"
    >
      <div class="absolute left-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
          ><path d="M4 0h1v9H4z" fill="currentColor" /><path
            d="M9 4v1H0V4z"
            fill="currentColor"
          /></svg
        >
      </div>
      <span class="h-px w-20 bg-border/70"></span>
      Tools: Deep dive
      <span class="h-px w-20 bg-border/70"></span>
      <div class="absolute right-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
          ><path d="M4 0h1v9H4z" fill="currentColor" /><path
            d="M9 4v1H0V4z"
            fill="currentColor"
          /></svg
        >
      </div>
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
            class="generate-btn w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-3 hover:bg-surface-1 border border-border rounded-md transition-colors duration-200 {isGenerating
              ? 'opacity-50 cursor-not-allowed'
              : ''}"
            onclick={handleGenerate}
            disabled={isGenerating || !canGenerate}
          >
            {#if isGenerating}
              <Icon
                icon="heroicons:arrow-path"
                width="16"
                height="16"
                class="animate-spin"
              />
              <span class="text-xs text-text-secondary"
                >Generating questions...</span
              >
            {:else}
              <Icon
                icon="heroicons:sparkles"
                width="16"
                height="16"
                class="text-primary"
              />
              <span class="text-xs text-text-primary"
                >Generate Follow-up Questions</span
              >
            {/if}
          </button>
        </div>
      {/if}

      <!-- Questions Display -->
      {#if hasQuestions}
        <div class="questions-section">
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
              <button
                onclick={handleRegenerate}
                disabled={isGenerating || !canGenerate}
                class="regenerate-btn p-2 bg-surface-3 hover:bg-surface-1
                       border border-border rounded-full
                       text-text-secondary hover:text-primary
                       transition-all duration-200
                       {isGenerating ? 'opacity-50 cursor-wait' : ''}"
                title={isGenerating ? 'Generating...' : 'Regenerate questions'}
              >
                <Icon
                  icon="heroicons:arrow-path"
                  width="16"
                  height="16"
                  class={isGenerating ? 'animate-spin' : ''}
                />
              </button>

              <!-- Chat Provider Select (Compact) -->
              <div class="provider-select-wrapper">
                <select
                  bind:value={chatProvider}
                  onchange={(e) => handleProviderChange(e.target.value)}
                  class="provider-select py-2 px-3 text-xs text-text-primary bg-surface-3 hover:bg-surface-1 border border-border rounded-full focus:outline-none focus:ring-0 cursor-pointer transition-all duration-200"
                >
                  {#each providers as provider (provider.value)}
                    <option value={provider.value}>{provider.label}</option>
                  {/each}
                </select>
              </div>

              <!-- Ask Your Own Question Button -->
              <button
                onclick={handleAskYourOwn}
                class="ask-own-btn flex items-center gap-2 py-2 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-full text-xs text-primary transition-all duration-200"
                title="Ask your own question in chat"
              >
                <Icon icon="heroicons:sparkles" width="14" height="14" />
                <span>Ask Your Own</span>
              </button>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .provider-select-wrapper select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fill-rule='evenodd' d='M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z' clip-rule='evenodd'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 0.75rem;
    padding-right: 1.75rem;
  }

  .generate-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .regenerate-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .regenerate-btn:not(:disabled):hover {
    transform: scale(1.05);
  }

  .ask-own-btn:hover {
    transform: scale(1.02);
  }
</style>
