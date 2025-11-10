<script>
  // @ts-nocheck
  import QuestionChip from './QuestionChip.svelte'
  import { deepDiveState } from '@/stores/deepDiveStore.svelte.js'
  import { openDeepDiveChat } from '@/services/tools/deepDiveService.js'
  import { settings } from '@/stores/settingsStore.svelte.js'

  // Props
  let { summaryContent, pageTitle, pageUrl, summaryLang = 'English' } = $props()

  // Derived states
  let questions = $derived(deepDiveState.questions)
  let isGenerating = $derived(deepDiveState.isGenerating)
  let hasQuestions = $derived(questions.length > 0)
  let defaultProvider = $derived(
    settings.tools?.deepDive?.defaultChatProvider || 'gemini'
  )

  /**
   * Handle question click - Open chat provider directly
   */
  async function handleQuestionClick(question) {
    try {
      console.log(
        '[InlineDeepDiveQuestions] Opening chat with question:',
        question
      )
      await openDeepDiveChat(
        question,
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang,
        defaultProvider
      )
    } catch (error) {
      console.error('[InlineDeepDiveQuestions] Error opening chat:', error)
    }
  }
</script>

{#if isGenerating}
  <div class="inline-questions-loading">
    <p class="text-xs text-text-secondary animate-pulse">
      Generating follow-up questions...
    </p>
  </div>
{:else if hasQuestions}
  <div class="inline-questions flex flex-col gap-4">
    <p
      class="text-xs w-full !m-0 justify-center !text-center font-mono text-text-primary tracking-wider flex items-center gap-2"
    >
      Deep Dive Questions
    </p>
    <div class="flex flex-col gap-6">
      {#each questions as question, i (question)}
        <QuestionChip
          {question}
          index={i + 1}
          isSelected={false}
          disabled={false}
          onclick={() => handleQuestionClick(question)}
        />
      {/each}
    </div>
  </div>
{/if}
