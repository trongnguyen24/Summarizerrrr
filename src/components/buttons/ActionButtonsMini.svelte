<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import {
    executeCustomAction,
    fetchChapterSummary,
    fetchCommentSummary,
    fetchCourseConcepts,
    summaryState,
  } from '@/stores/summaryStore.svelte.js'
  import Tooltip from '@/components/ui/Tooltip.svelte'
  import { Tooltip as BitsTooltip } from 'bits-ui'
  import { t } from 'svelte-i18n'

  import { ACTION_BUTTONS } from '@/lib/constants/actionConstants.js'
  import {
    getHasAnimatedButtons,
    setHasAnimatedButtons,
  } from '@/services/tabCacheService.js'

  const actions = ACTION_BUTTONS

  async function handleActionClick(actionType) {
    if (actionType === 'chapters') {
      await fetchChapterSummary()
    } else if (actionType === 'comments') {
      await fetchCommentSummary()
    } else if (actionType === 'courseConcepts') {
      await fetchCourseConcepts()
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
      if (action.showOnlyForCourse) {
        return summaryState.isCourseVideoActive
      }
      return true
    }),
  )

  // Track if we should skip animation (already animated for this tab)
  let skipAnimation = $state(false)

  // Animation control: reset animations when visibleActions changes
  let animationKey = $derived(visibleActions.map((a) => a.key).join('-'))
  let showAnimations = $state(false)

  // Reset and trigger animations when visibleActions changes
  $effect(() => {
    // React to animationKey changes
    animationKey

    // Check if animation already played for this tab
    skipAnimation = getHasAnimatedButtons()

    // Reset animations
    showAnimations = false

    // If already animated for this tab, show immediately
    if (skipAnimation) {
      showAnimations = true
      return
    }

    // First time for this tab - trigger animation after brief delay
    const timer = setTimeout(() => {
      showAnimations = true
      // Mark that animation has played for this tab
      setHasAnimatedButtons(true)
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
    {#each visibleActions as action, i}
      <Tooltip
        content={$t(`custom_actions.${action.key}_description`)}
        {customAnchor}
        side="top"
        align="center"
      >
        {#snippet children({ builder })}
          <button
            class="action-btn-mini font-mono relative p-2.5 text-xs rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-blackwhite-5 transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            class:animate={showAnimations}
            class:no-delay={skipAnimation}
            onclick={() => handleActionClick(action.key)}
            {...builder}
            style={skipAnimation ? '' : `animation-delay: ${600 + i * 150}ms`}
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

  /* Show immediately without animation when switching between cached tabs */
  .action-btn-mini.no-delay {
    opacity: 1;
    transform: scale(1);
    animation: none;
  }

  @keyframes fadeInScale {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
