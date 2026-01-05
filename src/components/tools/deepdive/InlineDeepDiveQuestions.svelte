<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import QuestionChip from './QuestionChip.svelte'
  import { deepDiveState } from '@/stores/deepDiveStore.svelte.js'
  import { openDeepDiveChat } from '@/services/tools/deepDiveService.js'
  import {
    settings,
    updateToolSettings,
  } from '@/stores/settingsStore.svelte.js'
  import {
    setQuestions,
    setGenerating,
    setError,
    setSelectedQuestion,
    setCustomQuestion,
    addToQuestionHistory,
    nextPage,
    previousPage,
    getTotalPages,
  } from '@/stores/deepDiveStore.svelte.js'
  import { generateFollowUpQuestions } from '@/services/tools/deepDiveService.js'
  import { isRTLLanguage } from '@/lib/utils/rtlUtils.js'

  // Import provider icons
  import GeminiIcon from '@/components/icons/GeminiIcon.svelte'
  import ChatGPTIcon from '@/components/icons/ChatGPTIcon.svelte'
  import PerplexityIcon from '@/components/icons/PerplexityIcon.svelte'
  import GrokIcon from '@/components/icons/GrokIcon.svelte'

  // Props
  let { summaryContent, pageTitle, pageUrl, summaryLang = 'English' } = $props()

  // RTL detection
  let isRTL = $derived(isRTLLanguage(summaryLang))

  // Derived states
  let questions = $derived(deepDiveState.questions)
  let isGenerating = $derived(deepDiveState.isGenerating)
  let hasQuestions = $derived(questions.length > 0)
  // Derived state for provider (sync with global settings)
  let chatProvider = $derived(
    settings.tools?.deepDive?.defaultChatProvider || 'gemini',
  )

  // Pagination derived states
  let totalPages = $derived(getTotalPages())
  let hasPagination = $derived(totalPages > 1)
  let canGoBack = $derived(deepDiveState.currentPageIndex > 0 && !isGenerating)
  let canGoForward = $derived(
    deepDiveState.currentPageIndex < totalPages - 1 && !isGenerating,
  )

  // Provider configs
  const providers = [
    { value: 'gemini', label: 'Gemini', icon: GeminiIcon },
    { value: 'chatgpt', label: 'ChatGPT', icon: ChatGPTIcon },
    { value: 'perplexity', label: 'Perplexity', icon: PerplexityIcon },
    { value: 'grok', label: 'Grok', icon: GrokIcon },
  ]

  const selectedProvider = $derived(
    providers.find((p) => p.value === chatProvider) || providers[0],
  )

  /**
   * Handles regenerate questions
   */
  async function handleRegenerate() {
    if (isGenerating) return

    // Clear current selections
    setSelectedQuestion(null)
    setCustomQuestion('')

    setGenerating(true)
    setError(null)

    try {
      console.log('[InlineDeepDiveQuestions] Regenerating questions...')
      console.log(
        '[InlineDeepDiveQuestions] Using history:',
        deepDiveState.questionHistory.length,
        'generations',
      )

      const generated = await generateFollowUpQuestions(
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang,
        deepDiveState.questionHistory,
      )

      setQuestions(generated)
      addToQuestionHistory(generated)

      console.log('[InlineDeepDiveQuestions] Regenerated questions:', generated)
      console.log(
        '[InlineDeepDiveQuestions] Total history:',
        deepDiveState.questionHistory.length,
      )
    } catch (err) {
      console.error('[InlineDeepDiveQuestions] Regeneration error:', err)
      setError(err.message || 'Failed to regenerate questions')
    } finally {
      setGenerating(false)
    }
  }

  /**
   * Handles chat provider change
   */
  async function handleProviderChange(newProvider) {
    // Save to settings store (global) - chatProvider will auto-update via $derived
    await updateToolSettings('deepDive', { defaultChatProvider: newProvider })
    console.log('[InlineDeepDiveQuestions] Provider changed to:', newProvider)
  }

  /**
   * Handle question click - Open chat provider directly
   */
  async function handleQuestionClick(question) {
    try {
      console.log(
        '[InlineDeepDiveQuestions] Opening chat with question:',
        question,
      )
      await openDeepDiveChat(
        question,
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang,
        chatProvider,
      )
    } catch (error) {
      console.error('[InlineDeepDiveQuestions] Error opening chat:', error)
    }
  }
</script>

{#if hasQuestions}
  <div
    class="inline-questions w-full relative max-w-xl mx-auto flex flex-col mt-10 gap-6 transition-opacity duration-300 {isGenerating
      ? 'opacity-50 pointer-events-none'
      : 'opacity-100'}"
  >
    <!-- Header -->
    <div class="border overflow-hidden rounded-t-lg border-border">
      <div class="h-2 w-full top-stripes"></div>
      <p
        class="!text-xs border-t py-3 border-border w-full !m-0 justify-center !text-center font-mono text-text-primary uppercase tracking-wider flex items-center gap-2"
      >
        {$t('settings.tools.deepdive.title')}
      </p>
    </div>

    <!-- Navigation & Provider Controls -->
    <div class="flex justify-between items-center w-full">
      <!-- Navigation Controls -->
      {#if hasPagination}
        <div class="navigation-controls flex items-center justify-center gap-2">
          <!-- Reload Button -->
          <button
            onclick={handleRegenerate}
            disabled={isGenerating}
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
            disabled={isGenerating}
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
              ? 'text-primary'
              : 'hover:text-text-primary text-text-secondary'}"
            title={provider.label}
          >
            <IconComponent width="20" height="20" />
          </button>
        {/each}
      </div>
    </div>

    <!-- Questions List -->
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      class="flex flex-col gap-6 {isRTL ? 'rtl-content' : ''}"
    >
      {#each questions as question, i (question)}
        <QuestionChip
          {question}
          index={i + 1}
          isSelected={false}
          disabled={isGenerating}
          onclick={() => handleQuestionClick(question)}
        />
      {/each}
    </div>
  </div>
{/if}

<style>
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

  .provider-btn:not(:disabled):hover {
    transform: scale(1);
  }

  .provider-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
