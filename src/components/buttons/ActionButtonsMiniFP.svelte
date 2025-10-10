<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let { onActionClick } = $props()

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
    await onActionClick?.(actionType)
  }
</script>

<div class="flex absolute bottom-4 z-30 mx-auto gap-3 flex-wrap justify-center">
  {#each actions as action}
    <button
      class="action-btn-mini-fp font-mono relative p-2.5 text-xs rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-blackwhite-5 transition-colors duration-125 flex items-center gap-1.5"
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
