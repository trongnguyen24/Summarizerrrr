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
      key: 'chapters',
      label: 'Chapters',
      icon: 'heroicons:queue-list-16-solid',
      description: 'Summarize by chapters',
      showOnlyForYouTube: true,
    },
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
      icon: 'heroicons:chat-bubble-oval-left-16-solid',
      description: 'Analyze from multiple perspectives',
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
</script>

<div class="flex absolute bottom-4 z-30 mx-auto gap-3 flex-wrap justify-center">
  {#each visibleActions as action}
    <button
      class="action-btn-mini font-mono opacity-0 relative p-2.5 text-xs rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-blackwhite-5 transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
      onclick={() => handleActionClick(action.key)}
      title={action.description}
    >
      <Icon
        width={16}
        icon={action.icon}
        class="transition-colors duration-125"
      />
      <!-- <span class="text-text-primary">{action.label}</span> -->
    </button>
  {/each}
</div>

<style>
  .action-btn-mini {
    animation: fadeInScale 300ms ease-out forwards;
    opacity: 0;
    transform: scale(0.8);
  }

  .action-btn-mini:nth-child(1) {
    animation-delay: 800ms;
  }

  .action-btn-mini:nth-child(2) {
    animation-delay: 950ms;
  }

  .action-btn-mini:nth-child(3) {
    animation-delay: 1100ms;
  }

  .action-btn-mini:nth-child(4) {
    animation-delay: 1250ms;
  }

  @keyframes fadeInScale {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
