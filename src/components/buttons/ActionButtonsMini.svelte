<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import {
    executeCustomAction,
    fetchChapterSummary,
    fetchCommentSummary,
    summaryState,
  } from '@/stores/summaryStore.svelte.js'
  import Tooltip from '@/components/ui/Tooltip.svelte'
  import { Tooltip as BitsTooltip } from 'bits-ui'

  const actions = [
    {
      key: 'analyze',
      label: 'Analyze',
      icon: 'heroicons:chart-bar-16-solid',
      description: 'Analyze content structure and arguments',
    },
    {
      key: 'explain',
      label: 'Explain',
      icon: 'heroicons:light-bulb-16-solid',
      description: 'Explain in simple terms',
    },
    {
      key: 'debate',
      label: 'Debate Mode',
      icon: 'heroicons:scale-16-solid',
      description: 'Analyze from multiple perspectives',
    },
    {
      key: 'chapters',
      label: 'Chapters',
      icon: 'heroicons:queue-list-16-solid',
      description: 'Summarize by chapters',
      showOnlyForYouTube: true,
    },
    {
      key: 'comments',
      label: 'Comments',
      icon: 'heroicons:chat-bubble-bottom-center-text-16-solid',
      description: 'Summarize YouTube comments',
      showOnlyForYouTube: true,
    },
  ]

  async function handleActionClick(actionType) {
    if (actionType === 'chapters') {
      await fetchChapterSummary()
    } else if (actionType === 'comments') {
      await fetchCommentSummary()
    } else {
      await executeCustomAction(actionType)
    }
  }

  // Filter actions based on current page type
  let visibleActions = $derived(
    actions.filter((action) => {
      if (action.showOnlyForYouTube) {
        return summaryState.isYouTubeVideoActive
      }
      return true
    }),
  )

  // Animation control: reset animations when visibleActions changes
  let animationKey = $derived(visibleActions.map((a) => a.key).join('-'))
  let showAnimations = $state(false)

  // Reset and trigger animations when visibleActions changes
  $effect(() => {
    // React to animationKey changes
    animationKey

    // Reset animations
    showAnimations = false

    // Trigger animations after a brief delay for browser to re-render
    const timer = setTimeout(() => {
      showAnimations = true
    }, 50)

    return () => clearTimeout(timer)
  })

  let customAnchor = $state(null)
</script>

<div class="flex absolute bottom-4 z-10 mx-auto gap-3 flex-wrap justify-center">
  <div
    bind:this={customAnchor}
    class="absolute -bottom-15 left-1/2 -translate-x-1/2 w-px h-px"
  ></div>
  <BitsTooltip.Provider>
    {#each visibleActions as action}
      <Tooltip
        content={action.description}
        {customAnchor}
        side="top"
        align="center"
      >
        {#snippet children({ builder })}
          <button
            class="action-btn-mini font-mono relative p-2.5 text-xs rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-blackwhite-5 transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            class:animate={showAnimations}
            onclick={() => handleActionClick(action.key)}
            {...builder}
          >
            <Icon
              width={16}
              icon={action.icon}
              class="transition-colors duration-125"
            />
            <!-- <span class="text-text-primary">{action.label}</span> -->
          </button>
        {/snippet}
      </Tooltip>
    {/each}
  </BitsTooltip.Provider>
</div>

<style>
  .action-btn-mini {
    opacity: 0;
    transform: scale(0.8);
    transition: none;
  }

  /* Only animate when class is applied */
  .action-btn-mini.animate {
    animation: fadeInScale 300ms ease-out forwards;
  }

  .action-btn-mini.animate:nth-child(1) {
    animation-delay: 50ms;
  }

  .action-btn-mini.animate:nth-child(2) {
    animation-delay: 200ms;
  }

  .action-btn-mini.animate:nth-child(3) {
    animation-delay: 350ms;
  }

  .action-btn-mini.animate:nth-child(4) {
    animation-delay: 500ms;
  }

  .action-btn-mini.animate:nth-child(5) {
    animation-delay: 650ms;
  }

  @keyframes fadeInScale {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
