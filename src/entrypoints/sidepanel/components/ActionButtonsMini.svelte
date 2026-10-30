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

  import { getVisibleActions } from '@/lib/config/actionConstants.js'
  import { settings } from '@/stores/settingsStore.svelte.js'

  // inline: sit in normal flow (compact header) instead of being pinned to
  // the bottom of the fixed-height header.
  let { inline = false } = $props()
  import {
    getHasAnimatedButtons,
    setHasAnimatedButtons,
  } from '@/services/tabCacheService.js'

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

  // Filter actions by page type and the user's hidden-buttons setting
  let visibleActions = $derived(
    getVisibleActions({
      isYouTube: summaryState.isYouTubeVideoActive,
      isCourse: summaryState.isCourseVideoActive,
      hidden: settings.hiddenActionButtons,
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

<div
  class="flex z-10 mx-auto gap-3 flex-wrap justify-center {inline
    ? 'relative'
    : 'absolute bottom-4'}"
>
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
          <!-- `{...builder}` first: the bits-ui trigger props carry their own
               `onclick`, and the last writer wins in a spread. -->
          <button
            {...builder}
            class="action-btn-mini font-mono relative p-2.5 text-xs rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-blackwhite-5 transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            class:animate={showAnimations}
            class:no-delay={skipAnimation}
            onclick={() => handleActionClick(action.key)}
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
