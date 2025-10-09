<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { animate, stagger } from 'animejs'
  import {
    summaryState,
    executeCustomAction,
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
      label: 'Debate Mode',
      icon: 'heroicons:chat-bubble-oval-left-16-solid',
      description: 'Analyze from multiple perspectives',
    },
  ]

  async function handleActionClick(actionType) {
    await executeCustomAction(actionType)
  }

  const isAnyLoading = $derived(
    summaryState.isLoading ||
      summaryState.isChapterLoading ||
      summaryState.isCourseSummaryLoading ||
      summaryState.isCourseConceptsLoading ||
      summaryState.isCustomActionLoading
  )
  $effect(() => {
    animate('.action-btn-mini', {
      opacity: 1,
      scale: [0.8, 1],
      delay: stagger(250),
      ease: 'outCirc',
    })
  })
</script>

<div class="flex absolute bottom-4 z-30 mx-auto gap-3 flex-wrap justify-center">
  {#each actions as action}
    <button
      class="action-btn-mini font-mono opacity-0 relative p-2.5 text-xs rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-blackwhite-5 transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
      onclick={() => handleActionClick(action.key)}
      disabled={isAnyLoading}
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
