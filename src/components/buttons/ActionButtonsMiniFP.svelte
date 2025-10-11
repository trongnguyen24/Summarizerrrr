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
</script>

<div
  class="flex absolute bottom-6.5 z-30 mx-auto gap-4 flex-wrap justify-center"
>
  {#each actions as action}
    <button
      class="action-btn-mini-fb font-mono relative p-3.5 rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-blackwhite-5 transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
      onclick={() => onActionClick(action.key)}
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
  .action-btn-mini-fb {
    animation: fadeInScale 300ms ease-out forwards;
    opacity: 0;
    transform: scale(0.8);
  }

  .action-btn-mini-fb:nth-child(1) {
    animation-delay: 800ms;
  }

  .action-btn-mini-fb:nth-child(2) {
    animation-delay: 950ms;
  }

  .action-btn-mini-fb:nth-child(3) {
    animation-delay: 1100ms;
  }

  @keyframes fadeInScale {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
