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
  let canStartChat = $derived(activeQuestion && activeQuestion.trim() !== '')

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
    if (!canStartChat) return

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
  class="deep-dive-content bg-surface-2 border border-border rounded-lg shadow-xl
         max-h-[70vh] overflow-y-auto flex flex-col"
>
  <!-- Header -->
  <div
    class="header sticky top-0 z-10 bg-surface-2 border-b border-border px-6 py-4 flex items-center justify-between"
  >
    <div class="flex items-center gap-2">
      <Icon
        icon="heroicons:sparkles"
        width="20"
        height="20"
        class="text-primary"
      />
      <h3 class="text-sm font-semibold text-text-primary">Deep Dive</h3>
    </div>
    <button
      onclick={toggleDeepDive}
      class="close-btn p-1.5 hover:bg-surface-3 rounded-md transition-colors"
      aria-label="Close"
    >
      <Icon icon="heroicons:x-mark" width="20" height="20" />
    </button>
  </div>

  <!-- Content -->
  <div class="content-body px-6 py-4 space-y-4">
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
          <div class="flex flex-col gap-3">
            {#each questions as question, i (question)}
              <QuestionChip
                {question}
                index={i + 1}
                isSelected={selectedQuestion === question}
                onclick={() => handleQuestionSelect(question)}
              />
            {/each}
          </div>
        </div>

        <!-- Custom Question Input -->
        <div class="custom-question-section">
          <CustomQuestionInput
            value={customQuestion}
            onchange={handleCustomQuestionChange}
            onSubmit={handleStartChat}
          />
        </div>

        <!-- Chat Provider & Start Chat -->
        <div class="chat-actions flex gap-2">
          <div class="flex-1">
            <ChatProviderSelect
              value={chatProvider}
              onchange={handleProviderChange}
            />
          </div>
          <button
            class="start-chat-btn flex items-center gap-2 py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors duration-200 {!canStartChat
              ? 'opacity-50 cursor-not-allowed'
              : ''}"
            onclick={handleStartChat}
            disabled={!canStartChat}
          >
            <Icon
              icon="heroicons:chat-bubble-left-right"
              width="16"
              height="16"
            />
            <span class="text-xs font-medium">Start Chat</span>
          </button>
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
</style>
