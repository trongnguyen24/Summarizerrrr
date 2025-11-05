<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import { fade } from 'svelte/transition'
  import {
    deepDiveState,
    toggleDeepDive,
    startPreloading,
    finishPreloadingAndOpen,
    cancelPreloading,
    setQuestions,
    setError,
  } from '@/stores/deepDiveStore.svelte.js'
  import {
    generateFollowUpQuestions,
    validateDeepDiveAvailability,
  } from '@/services/tools/deepDiveService.js'
  import { toast } from 'svelte-sonner'

  // Props
  let { summaryContent, pageTitle, pageUrl, summaryLang = 'English' } = $props()

  // Derived state
  let isExpanded = $derived(deepDiveState.isExpanded)
  let hasQuestions = $derived(deepDiveState.questions.length > 0)
  let isPreloading = $derived(deepDiveState.isPreloading)
  let isGenerating = $derived(deepDiveState.isGenerating)

  /**
   * Handle FAB click - Option 2 flow
   */
  async function handleFABClick() {
    console.log('[DeepDiveFAB] Click', { hasQuestions, isExpanded })

    // If already expanded, just toggle (close)
    if (isExpanded) {
      toggleDeepDive()
      return
    }

    // If has questions, open dialog immediately
    if (hasQuestions) {
      toggleDeepDive()
      return
    }

    // Check availability first
    const availability = validateDeepDiveAvailability()
    if (!availability.available) {
      toast.error(availability.reason)
      return
    }

    // Start pre-loading
    startPreloading()

    try {
      console.log('[DeepDiveFAB] Generating questions...')
      const questions = await generateFollowUpQuestions(
        summaryContent,
        pageTitle,
        pageUrl,
        summaryLang
      )

      setQuestions(questions)
      finishPreloadingAndOpen()
      console.log('[DeepDiveFAB] Questions generated, dialog opened')
    } catch (error) {
      console.error('[DeepDiveFAB] Generation error:', error)
      cancelPreloading()
      toast.error(error.message || 'Failed to generate questions')
    }
  }

  /**
   * Handle ESC key to cancel preloading
   */
  $effect(() => {
    function handleEscapeKey(event) {
      if (event.key === 'Escape' && isPreloading) {
        cancelPreloading()
        toast.info('Question generation cancelled')
      }
    }

    if (isPreloading) {
      window.addEventListener('keydown', handleEscapeKey)
      return () => {
        window.removeEventListener('keydown', handleEscapeKey)
      }
    }
  })
</script>

<!-- FAB Button -->
<button
  onclick={handleFABClick}
  disabled={isPreloading}
  class="fixed bottom-6 left-4 z-40 p-2 transition-colors overflow-hidden
         border border-primary/10 hover:border-primary/20
         dark:border-border/70 dark:hover:border-gray-700
         text-primary/90 hover:text-primary
         bg-gradient-to-br from-orange-100 dark:from-gray-950
         to-orange-50 dark:to-surface-2
         rounded-full group
         {isPreloading ? 'cursor-wait opacity-90' : ''}"
  title={isPreloading ? 'Generating questions...' : 'Deep Dive with AI'}
  transition:slideScaleFade={{
    duration: 400,
    delay: 200,
    slideFrom: 'bottom',
    slideDistance: '0.5rem',
    startScale: 0.75,
  }}
>
  <div class="chip__filter overflow-hidden"></div>

  {#if isGenerating}
    <Icon
      icon="svg-spinners:ring-resize"
      width="20"
      height="20"
      class="animate-spin"
    />
  {:else}
    <Icon
      icon="heroicons:sparkles-20-solid"
      width="20"
      height="20"
      class="{isExpanded
        ? ''
        : ''} group-hover:scale-110 ease-in-out transition-transform duration-300"
    />
  {/if}
</button>

<!-- Simple Tooltip (Custom) -->
{#if !isPreloading}
  <div
    class="tooltip-container fixed bottom-6 left-16 z-50"
    transition:fade={{ duration: 150 }}
  >
    <div class="tooltip">
      <div class="tooltip-header">
        <!-- <Icon
          icon="svg-spinners:ring-resize"
          width="14"
          height="14"
          class="text-primary"
        /> -->
        <span class="tooltip-text">Generating questions...</span>
      </div>
      <!-- <div class="tooltip-hint">Press ESC to cancel</div> -->
    </div>
  </div>
{/if}

<style>
  .chip__filter {
    position: absolute;
    inset: 5px;
    z-index: 20;
    border-radius: 100px;
    filter: blur(4px);
  }

  .chip__filter::before {
    content: '';
    display: block;
    position: absolute;
    filter: blur(8px);
    border-radius: 100px;
    mix-blend-mode: color-dodge;
    width: 1.5rem;
    top: 0;
    aspect-ratio: 1;
    transform-origin: center;
    background: linear-gradient(-45deg, #3f312100 20%, #ffa856, #3f342100 80%)
      200%;
    animation: shimmer-1 5s linear infinite;
  }

  .chip__filter::after {
    content: '';
    display: block;
    position: absolute;
    width: 1.5rem;
    aspect-ratio: 1;
    mix-blend-mode: color-dodge;
    transform-origin: center;
    background: linear-gradient(45deg, #3f312100 40%, #ffbb67, #3f342100 55%)
      300%;
    filter: blur(4px);
    border-radius: 100px;
    animation: shimmer-2 4s linear infinite;
  }

  @keyframes shimmer-1 {
    0% {
      transform: translateX(-100%) translateY(-100%) scale(0.2);
    }
    50% {
      transform: translateX(0) translateY(0) scale(0.75);
    }
    100% {
      transform: translateX(100%) translateY(100%) scale(0.2);
    }
  }

  @keyframes shimmer-2 {
    0% {
      transform: translateX(-100%) translateY(100%) scale(0.1);
    }
    50% {
      transform: translateX(0) translateY(0) scale(0.8);
    }
    100% {
      transform: translateX(100%) translateY(-100%) scale(0.2);
    }
  }

  /* Custom Tooltip Styles */
  .tooltip-container {
    pointer-events: none;
  }

  .tooltip {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 0.5rem 0.75rem;
    min-width: 180px;
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tooltip-text {
    font-size: 0.75rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .tooltip-hint {
    font-size: 0.625rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
    margin-left: 1.375rem;
  }
</style>
