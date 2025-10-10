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
      label: 'Debate',
      icon: 'heroicons:chat-bubble-oval-left-16-solid',
      description: 'Analyze from multiple perspectives',
    },
  ]
</script>

<div class="flex flex-col w-36 mx-auto gap-4 flex-wrap justify-center">
  {#each actions as action}
    <button
      onclick={() => onActionClick(action.key)}
      class="action-btn font-mono relative py-2 px-4 rounded-full border border-border hover:bg-blackwhite-5 text-text-secondary hover:text-text-primary transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      title={action.description}
    >
      <Icon
        width={20}
        icon={action.icon}
        class="transition-colors duration-125"
      />
      <span class="transition-colors duration-125 text-sm">{action.label}</span>
    </button>
  {/each}
</div>
