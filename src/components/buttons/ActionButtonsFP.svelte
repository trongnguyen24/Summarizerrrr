<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ShadowTooltip from '@/components/ui/ShadowTooltip.svelte'
  import { t } from 'svelte-i18n'
  import { ShadowTooltipState } from '@/components/ui/shadowTooltipState.svelte.js'
  import { setContext } from 'svelte'
  import { fadeOnly } from '@/lib/ui/slideScaleFade.js'

  let { onActionClick, isYouTubeActive, isCourseActive = false } = $props()

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
  class="flex flex-col mt-2 w-36 mx-auto gap-3 flex-wrap justify-center relative"
>
  <!-- Shared Anchor for Tooltips -->
  <div
    class="absolute -bottom-12 left-1/2 -translate-x-1/2 w-full flex justify-center pointer-events-none"
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
        onclick={() => onActionClick(action.key)}
        class="action-btn w-full font-mono opacity-0 relative py-2 px-4 text-sm rounded-full border border-border hover:bg-blackwhite-5 text-text-secondary hover:text-text-primary transition-colors duration-125 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        style="animation-delay: {400 + i * 100}ms"
      >
        <Icon
          width={16}
          icon={action.icon}
          class="transition-colors duration-125"
        />
        <span class="transition-colors duration-125">{action.label}</span>
      </button>
    </ShadowTooltip>
  {/each}
</div>

<style>
  .action-btn {
    animation: fadeInScale 300ms ease-out forwards;
    opacity: 0;
    transform: scale(0.7);
  }

  @keyframes fadeInScale {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
