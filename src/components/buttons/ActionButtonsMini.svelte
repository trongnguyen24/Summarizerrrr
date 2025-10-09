<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import {
    summaryState,
    executeCustomAction,
  } from '@/stores/summaryStore.svelte.js'

  const actions = [
    {
      key: 'analyze',
      label: 'Analyze',
      icon: 'solar:chart-square-linear',
      description: 'Analyze content structure and arguments',
    },
    {
      key: 'explain',
      label: 'Explain',
      icon: 'solar:lightbulb-minimalistic-linear',
      description: 'Explain in simple terms',
    },
    {
      key: 'reply',
      label: 'Reply',
      icon: 'solar:chat-round-linear',
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
</script>

<div class="flex absolute bottom-5 z-30 mx-auto gap-3 flex-wrap justify-center">
  {#each actions as action}
    <button
      class="action-btn font-mono relative p-3 text-xs rounded-full border border-border bg-surface-2/50 hover:bg-surface-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
      onclick={() => handleActionClick(action.key)}
      disabled={isAnyLoading}
      title={action.description}
    >
      <Icon width={16} icon={action.icon} class="text-text-secondary" />
      <!-- <span class="text-text-primary">{action.label}</span> -->
    </button>
  {/each}
</div>

<style>
  .action-btn:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .action-btn:active {
    transform: translateY(0);
  }
</style>
