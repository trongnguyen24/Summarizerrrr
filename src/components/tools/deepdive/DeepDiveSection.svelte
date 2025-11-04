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
  } from '@/stores/deepDiveStore.svelte.js'
  import {
    generateFollowUpQuestions,
    openDeepDiveChat,
    validateDeepDiveAvailability,
  } from '@/services/tools/deepDiveService.js'
  import { getChatProviderName } from '@/lib/prompts/tools/deepDivePrompts.js'
  import QuestionChip from './QuestionChip.svelte'
  import ChatProviderSelect from './ChatProviderSelect.svelte'
  import CustomQuestionInput from './CustomQuestionInput.svelte'
  import { slide } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'

  // Props
  let { summaryContent, pageTitle, pageUrl, summaryLang = 'English' } = $props()

  // State from store
  let questions = $derived(deepDiveState.questions)
  let isGenerating = $derived(deepDiveState.isGenerating)
  let error = $derived(deepDiveState.error)
  let hasGenerated = $derived(deepDiveState.hasGenerated)

  // Local state
  let selectedQuestion = $state(null)
  let customQuestion = $state('')
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
   * Effect cho lazy generation
   * Chỉ generate khi expanded lần đầu và auto-generate OFF
   */
  $effect(() => {
    const shouldLazyGenerate =
      deepDiveState.isExpanded &&
      !hasGenerated &&
      !toolConfig.autoGenerate &&
      canGenerate

    if (shouldLazyGenerate) {
      console.log('[DeepDiveSection] Lazy generating questions...')
      handleGenerate()
    }
  })

  /**
   * Effect cho auto-generate
   * Chỉ chạy khi auto-generate ON và chưa generate
   */
  $effect(() => {
    const shouldAutoGenerate =
      toolConfig?.enabled &&
      toolConfig?.autoGenerate &&
      !hasGenerated &&
      summaryContent &&
      summaryContent.trim() !== ''

    if (shouldAutoGenerate) {
      console.log('[DeepDiveSection] Auto-generating questions...')
      handleGenerate()
    }
  })

  /**
   * Effect cho ESC key để đóng panel
   */
  $effect(() => {
    function handleEscapeKey(event) {
      if (event.key === 'Escape' && deepDiveState.isExpanded) {
        toggleDeepDive()
      }
    }

    if (deepDiveState.isExpanded) {
      window.addEventListener('keydown', handleEscapeKey)
      return () => {
        window.removeEventListener('keydown', handleEscapeKey)
      }
    }
  })

  /**
   * Handles question generation
   */
  async function handleGenerate() {
    if (!canGenerate) return

    setGenerating(true)
    setError(null)

    try {
      console.log('[DeepDiveSection] Generating questions...')
      const generated = await generateFollowUpQuestions(
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang
      )

      setQuestions(generated)
      console.log('[DeepDiveSection] Generated questions:', generated)
    } catch (err) {
      console.error('[DeepDiveSection] Generation error:', err)
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
    selectedQuestion = question
    customQuestion = '' // Clear custom input when selecting predefined question
    await handleStartChat()
  }

  /**
   * Handles custom question input
   */
  function handleCustomQuestionChange(value) {
    customQuestion = value
    selectedQuestion = null // Clear selection when typing custom question
  }

  /**
   * Handles starting chat with selected/custom question
   */
  async function handleStartChat() {
    if (!canStartChat) return

    try {
      console.log(
        '[DeepDiveSection] Starting chat with question:',
        activeQuestion
      )
      await openDeepDiveChat(
        activeQuestion,
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang, // ✅ Pass summaryLang
        chatProvider
      )
    } catch (err) {
      console.error('[DeepDiveSection] Chat error:', err)
      setError(err.message || 'Failed to open chat')
    }
  }

  /**
   * Handles chat provider change
   */
  function handleProviderChange(newProvider) {
    chatProvider = newProvider
  }
</script>

{#if isToolEnabled}
  <div
    class="deep-dive-section fixed bottom-0 -left-px -right-px
           max-w-2xl mx-auto bg-surface-2 border border-border
           rounded-lg shadow-xl p-4 z-40
           max-h-[70vh] overflow-y-auto"
    transition:slide={{ duration: 300, easing: cubicOut }}
  >
    <!-- Error Display -->
    {#if error}
      <div
        class="error-message mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md"
      >
        <p class="text-xs text-red-400">{error}</p>
      </div>
    {/if}

    <!-- Availability Warning -->
    {#if !availability.available}
      <div
        class="warning-message mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md"
      >
        <p class="text-xs text-yellow-400">{availability.reason}</p>
      </div>
    {:else}
      <!-- Generate Questions Section -->
      {#if !hasQuestions}
        <div class="generate-section mb-4">
          <button
            class="generate-btn w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-2 hover:bg-surface-3 border border-border rounded-md transition-colors duration-200 {isGenerating
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
        <div class="questions-section mb-4">
          <div class="flex flex-col gap-4">
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
        <div class="custom-question-section mb-4">
          <CustomQuestionInput
            value={customQuestion}
            onchange={handleCustomQuestionChange}
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
{/if}

<style>
  .deep-dive-section::-webkit-scrollbar {
    width: 6px;
  }

  .deep-dive-section::-webkit-scrollbar-thumb {
    background-color: oklch(0.77 0.003 106.6 / 40%);
    border-radius: 10px;
  }

  .deep-dive-section::-webkit-scrollbar-thumb:hover {
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
