<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import {
    executeCustomAction,
    fetchChapterSummary,
    summaryState,
  } from '@/stores/summaryStore.svelte.js'

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
      label: 'Debate',
      icon: 'heroicons:chat-bubble-oval-left-16-solid',
      description: 'Analyze from multiple perspectives',
    },
    {
      key: 'chapters',
      label: 'Chapters',
      icon: 'heroicons:queue-list-16-solid',
      description: 'Summarize by chapters',
      showOnlyForYouTube: true,
    },
  ]

  async function handleActionClick(actionType) {
    if (actionType === 'chapters') {
      await fetchChapterSummary()
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
    })
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
</script>

<div class="flex flex-col w-36 mx-auto gap-4 flex-wrap justify-center">
  {#each visibleActions as action}
    <button
      class="action-btn font-mono relative py-2 px-4 text-sm rounded-full border border-border hover:bg-blackwhite-5 text-text-secondary hover:text-text-primary transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      class:animate={showAnimations}
      onclick={() => handleActionClick(action.key)}
      title={action.description}
    >
      <Icon
        width={16}
        icon={action.icon}
        class="transition-colors duration-125"
      />
      <span class="transition-colors duration-125">{action.label}</span>
    </button>
  {/each}
</div>

<style>
  .action-btn {
    opacity: 0;
    transform: scale(0.7);
    transition: none;
  }

  /* Only animate when class is applied */
  .action-btn.animate {
    animation: fadeInScale 300ms ease-out forwards;
  }

  .action-btn.animate:nth-child(1) {
    animation-delay: 50ms;
  }

  .action-btn.animate:nth-child(2) {
    animation-delay: 200ms;
  }

  .action-btn.animate:nth-child(3) {
    animation-delay: 350ms;
  }

  .action-btn.animate:nth-child(4) {
    animation-delay: 500ms;
  }

  @keyframes fadeInScale {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
