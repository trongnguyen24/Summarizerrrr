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
      key: 'reply',
      label: 'Reply',
      icon: 'heroicons:chat-bubble-oval-left-16-solid',
      description: 'Generate thoughtful response',
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
    animate('.action-btn', {
      opacity: 1,
      scale: [0.8, 1],
      delay: stagger(250),
      ease: 'outCirc',
    })
  })
</script>

<div class="flex flex-col w-36 mx-auto gap-4 flex-wrap justify-center">
  {#each actions as action}
    <button
      class="action-btn font-mono opacity-0 relative py-2 px-4 text-sm rounded-full border border-border hover:bg-blackwhite-5 text-text-secondary hover:text-text-primary transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      onclick={() => handleActionClick(action.key)}
      disabled={isAnyLoading}
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
