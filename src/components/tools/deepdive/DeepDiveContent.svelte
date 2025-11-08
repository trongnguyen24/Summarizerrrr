<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import {
    deepDiveState,
    setQuestions,
    setGenerating,
    setError,
    toggleDeepDive,
    setCustomQuestion,
    setSelectedQuestion,
  } from '@/stores/deepDiveStore.svelte.js'
  import {
    generateFollowUpQuestions,
    openDeepDiveChat,
    validateDeepDiveAvailability,
  } from '@/services/tools/deepDiveService.js'
  import QuestionChip from './QuestionChip.svelte'
  import CustomQuestionInput from './CustomQuestionInput.svelte'
  import ChatProviderSelect from './ChatProviderSelect.svelte'

  // Props
  let { summaryContent, pageTitle, pageUrl, summaryLang = 'English' } = $props()

  // State from store
  let questions = $derived(deepDiveState.questions)
  let isGenerating = $derived(deepDiveState.isGenerating)
  let error = $derived(deepDiveState.error)
  let hasGenerated = $derived(deepDiveState.hasGenerated)

  // UI state from store (persisted)
  let selectedQuestion = $derived(deepDiveState.selectedQuestion)
  let customQuestion = $derived(deepDiveState.customQuestion)

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
  let activeQuestion = $derived(selectedQuestion || customQuestion)
  // NEW: Separate logic for custom input only
  let canStartChatWithCustom = $derived(
    customQuestion && customQuestion.trim() !== ''
  )
  // Compact mode for ChatProviderSelect when user types in CustomQuestionInput
  let isCompact = $derived(customQuestion.length > 0)

  /**
   * ❌ REMOVED: Lazy generation logic
   * Questions are now generated BEFORE dialog opens (in DeepDiveFAB)
   * Dialog only opens when questions are ready
   */

  /**
   * Handles question generation
   */
  async function handleGenerate() {
    if (!canGenerate) return

    setGenerating(true)
    setError(null)

    try {
      console.log('[DeepDiveContent] Generating questions...')
      const generated = await generateFollowUpQuestions(
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang
      )

      setQuestions(generated)
      console.log('[DeepDiveContent] Generated questions:', generated)
    } catch (err) {
      console.error('[DeepDiveContent] Generation error:', err)
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
   * Handles question selection
   */
  async function handleQuestionSelect(question) {
    // Auto-start chat with the selected question
    setSelectedQuestion(question)
    setCustomQuestion('') // Clear custom input when selecting predefined question
    await handleStartChat()
  }

  /**
   * Handles custom question input
   */
  function handleCustomQuestionChange(value) {
    setCustomQuestion(value)
    setSelectedQuestion(null) // Clear selection when typing custom question
  }

  /**
   * Handles chat provider change
   */
  function handleProviderChange(newProvider) {
    chatProvider = newProvider
  }

  /**
   * Handles starting chat with selected/custom question
   */
  async function handleStartChat() {
    // Check if we have any question (selected or custom)
    const questionToUse = activeQuestion
    if (!questionToUse || questionToUse.trim() === '') return

    try {
      console.log(
        '[DeepDiveContent] Starting chat with question:',
        activeQuestion
      )
      await openDeepDiveChat(
        activeQuestion,
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang,
        chatProvider
      )
    } catch (err) {
      console.error('[DeepDiveContent] Chat error:', err)
      setError(err.message || 'Failed to open chat')
    }
  }
</script>

<div
  class="deep-dive-content
         max-h-[calc(100vh-2rem)] h-screen flex flex-col"
>
  <!-- Header -->
  <div class="header sticky top-0 z-10 px-2 flex">
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
      Deep dive
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
    <!-- <button
      onclick={toggleDeepDive}
      class="close-btn p-1.5 hover:bg-surface-3 ml-auto rounded-md transition-colors"
      aria-label="Close"
    >
      <Icon icon="heroicons:x-mark" width="20" height="20" />
    </button> -->
  </div>

  <!-- Content -->
  <div class=" flex flex-col flex-1 justify-center">
    <div
      class="flex flex-col justify-center items-center gap-6 -translate-y-10"
    >
      <h3
        class="text-sm font-mono !text-center uppercase text-balance text-text-primary"
      >
        {pageTitle}
      </h3>

      <!-- <span
        class=" font-mono text-xs px-4 text-text-secondary py-1 mx-auto rounded-4xl w-fit"
        >---  ---</span
      > -->
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
        <!-- Custom Question Input -->
        <div class="custom-question-section relative">
          <CustomQuestionInput
            value={customQuestion}
            onchange={handleCustomQuestionChange}
            onSubmit={handleStartChat}
          />
          <!-- Chat Provider & Start Chat -->
          <div
            class="chat-actions flex gap-1 absolute items-center z-20 bottom-3.5 right-1.75"
          >
            <div class="flex-1">
              <ChatProviderSelect
                value={chatProvider}
                onchange={handleProviderChange}
                {isCompact}
              />
            </div>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button
              class="start-chat-btn flex items-center justify-center gap-2 size-10 dark:bg-white text-black rounded-full transition-all scale-100 duration-300 {!canStartChatWithCustom
                ? ' !bg-muted/30 !scale-75 text-muted cursor-not-allowed'
                : 'dark:hover:bg-white ring-black !bg-black hover:ring-2 !text-white dark:ring-white'}"
              onclick={handleStartChat}
              disabled={!canStartChatWithCustom}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="size-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="questions-section">
          <div class="flex flex-col gap-3">
            {#each questions as question, i (question)}
              <QuestionChip
                {question}
                index={i + 1}
                isSelected={selectedQuestion === question}
                disabled={isGenerating}
                onclick={() => handleQuestionSelect(question)}
              />
            {/each}

            <!-- Regenerate Button -->
            <div class="flex justify-center pt-2">
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
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .deep-dive-content::-webkit-scrollbar {
    width: 6px;
  }

  .deep-dive-content::-webkit-scrollbar-thumb {
    background-color: oklch(0.77 0.003 106.6 / 40%);
    border-radius: 10px;
  }

  .deep-dive-content::-webkit-scrollbar-thumb:hover {
    background-color: oklch(0.77 0.003 106.6 / 60%);
  }

  .generate-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .start-chat-btn:disabled {
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
</style>
