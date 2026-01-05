<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import QuestionChip from './QuestionChip.svelte'
  import {
    settings,
    updateToolSettings,
  } from '@/stores/settingsStore.svelte.js'
  import { generateFollowUpQuestions } from '@/services/tools/deepDiveService.js'
  import { openDeepDiveChat } from '@/services/tools/deepDiveService.js'
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

  // Local state (không dùng global deepDiveState)
  let questions = $state([])
  let isGenerating = $state(false)
  let hasGenerated = $state(false)
  let error = $state(null)
  let questionHistory = $state([])
  let currentPageIndex = $state(0)

  // Derived states
  let hasQuestions = $derived(questions.length > 0)
  let chatProvider = $derived(
    settings.tools?.deepDive?.defaultChatProvider || 'gemini',
  )

  // Pagination derived states
  let totalPages = $derived(questionHistory.length)
  let hasPagination = $derived(totalPages > 1)
  let canGoBack = $derived(currentPageIndex > 0 && !isGenerating)
  let canGoForward = $derived(
    currentPageIndex < totalPages - 1 && !isGenerating,
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

  // Reset state when summary changes
  $effect(() => {
    if (summaryContent) {
      // Reset all local state when summary changes
      questions = []
      isGenerating = false
      hasGenerated = false
      error = null
      questionHistory = []
      currentPageIndex = 0
    }
  })

  /**
   * Generate questions for the first time
   */
  async function handleGenerate() {
    if (isGenerating || !summaryContent) return

    isGenerating = true
    error = null

    try {
      console.log('[DeepDiveQuestionsArchive] Generating questions...')

      const generated = await generateFollowUpQuestions(
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang,
        questionHistory,
      )

      questions = generated
      hasGenerated = true
      questionHistory.push([...generated])
      currentPageIndex = questionHistory.length - 1

      console.log('[DeepDiveQuestionsArchive] Generated questions:', generated)
    } catch (err) {
      console.error('[DeepDiveQuestionsArchive] Generation error:', err)
      error = err.message || 'Failed to generate questions'
    } finally {
      isGenerating = false
    }
  }

  /**
   * Regenerate questions
   */
  async function handleRegenerate() {
    if (isGenerating) return

    isGenerating = true
    error = null

    try {
      console.log('[DeepDiveQuestionsArchive] Regenerating questions...')

      const generated = await generateFollowUpQuestions(
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang,
        questionHistory,
      )

      questions = generated
      questionHistory.push([...generated])
      currentPageIndex = questionHistory.length - 1

      console.log(
        '[DeepDiveQuestionsArchive] Regenerated questions:',
        generated,
      )
    } catch (err) {
      console.error('[DeepDiveQuestionsArchive] Regeneration error:', err)
      error = err.message || 'Failed to regenerate questions'
    } finally {
      isGenerating = false
    }
  }

  /**
   * Handle provider change
   */
  async function handleProviderChange(newProvider) {
    await updateToolSettings('deepDive', { defaultChatProvider: newProvider })
    console.log('[DeepDiveQuestionsArchive] Provider changed to:', newProvider)
  }

  /**
   * Handle question click - Open chat provider
   */
  async function handleQuestionClick(question) {
    try {
      console.log(
        '[DeepDiveQuestionsArchive] Opening chat with question:',
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
    } catch (err) {
      console.error('[DeepDiveQuestionsArchive] Error opening chat:', err)
    }
  }

  /**
   * Navigate to previous page
   */
  function previousPage() {
    if (currentPageIndex > 0) {
      currentPageIndex--
      questions = questionHistory[currentPageIndex]
    }
  }

  /**
   * Navigate to next page
   */
  function nextPage() {
    if (currentPageIndex < questionHistory.length - 1) {
      currentPageIndex++
      questions = questionHistory[currentPageIndex]
    }
  }
</script>

{#if !hasGenerated}
  <!-- Generate Button - Shown before first generation -->
  <div
    class="generate-section w-full relative max-w-xl mx-auto flex flex-col mt-10 gap-4"
  >
    <div class="border overflow-hidden rounded-lg border-border">
      <div class="h-2 w-full top-stripes"></div>
      <div class="flex flex-col items-center gap-3 py-6 border-t border-border">
        <p
          class="text-xs text-text-secondary font-mono uppercase tracking-wider"
        >
          {$t('settings.tools.deepdive.title')}
        </p>
        <button
          onclick={handleGenerate}
          disabled={isGenerating}
          class="generate-btn flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border rounded-full text-sm text-text-primary hover:bg-surface-3 hover:border-muted/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isGenerating}
            <Icon
              icon="heroicons:arrow-path"
              width="16"
              height="16"
              class="animate-spin"
            />
            <span>{$t('settings.tools.deepdive.generating')}</span>
          {:else}
            <Icon icon="heroicons:sparkles" width="16" height="16" />
            <span>{$t('settings.tools.deepdive.generate_new_questions')}</span>
          {/if}
        </button>
        {#if error}
          <p class="text-xs text-red-500 mt-2">{error}</p>
        {/if}
      </div>
    </div>
  </div>
{:else if hasQuestions}
  <!-- Questions List - Shown after generation -->
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

    <!-- Error display -->
    {#if error}
      <p class="text-xs text-red-500 text-center">{error}</p>
    {/if}
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
