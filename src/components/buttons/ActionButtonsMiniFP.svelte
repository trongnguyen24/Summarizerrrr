<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  import ShadowTooltip from '@/components/ui/ShadowTooltip.svelte'
  import { t } from 'svelte-i18n'
  import { ShadowTooltipState } from '@/components/ui/shadowTooltipState.svelte.js'
  import { setContext } from 'svelte'
  import { fadeOnly } from '@/lib/ui/slideScaleFade.js'

  let {
    onActionClick,
    isYouTubeActive = false,
    isCourseActive = false,
  } = $props()

  import { ACTION_BUTTONS } from '@/lib/constants/actionConstants.js'

  const actions = ACTION_BUTTONS

  // Filter actions based on current page type
  let visibleActions = $derived(
    actions.filter((action) => {
      if (action.showOnlyForYouTube) {
        return isYouTubeActive
      }
      if (action.showOnlyForCourse) {
        return isCourseActive
      }
      return true
    }),
  )

  // Initialize shared tooltip state
  const tooltipState = new ShadowTooltipState()
  setContext('shadow-tooltip-state', tooltipState)
</script>

<div
  class="flex absolute bottom-6.5 z-30 mx-auto gap-4 flex-wrap justify-center"
>
  <!-- Shared Anchor for Tooltips -->
  <div
    class="absolute -bottom-16 left-1/2 -translate-x-1/2 w-full flex justify-center pointer-events-none"
  >
    {#if tooltipState.activeContent}
      <div
        class="z-50 px-2 py-1 text-xs text-muted whitespace-nowrap mb-2"
        in:fadeOnly={{ duration: 200 }}
        out:fadeOnly={{ duration: 0 }}
      >
        {tooltipState.activeContent}
      </div>
    {/if}
  </div>

  {#each visibleActions as action, i}
    <ShadowTooltip content={$t(`custom_actions.${action.key}_description`)}>
      <button
        class="action-btn-mini-fb font-mono relative p-3 rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-blackwhite-5 transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        onclick={() => onActionClick(action.key)}
        style="animation-delay: {600 + i * 150}ms"
      >
        <Icon
          width={16}
          icon={action.icon}
          class="transition-colors duration-125"
        />
        <!-- <span class="text-text-primary">{action.label}</span> -->
      </button>
    </ShadowTooltip>
  {/each}
</div>

<style>
  .action-btn-mini-fb {
    animation: fadeInScale 300ms ease-out forwards;
    opacity: 0;
    transform: scale(0.8);
  }

  @keyframes fadeInScale {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
