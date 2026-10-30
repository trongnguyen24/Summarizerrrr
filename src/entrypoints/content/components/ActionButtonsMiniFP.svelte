<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  import ShadowTooltip from '@/entrypoints/content/components/ShadowTooltip.svelte'
  import { t } from 'svelte-i18n'
  import { ShadowTooltipState } from '@/entrypoints/content/components/shadowTooltipState.svelte.js'
  import { setContext } from 'svelte'
  import { fadeOnly } from '@/lib/utils/slideScaleFade.js'

  let {
    onActionClick,
    isYouTubeActive = false,
    isCourseActive = false,
    // inline: sit in normal flow (MobileSheet's compact header) instead of
    // being pinned to the bottom of a fixed-height header (FloatingPanel).
    inline = false,
  } = $props()

  import { getVisibleActions } from '@/lib/config/actionConstants.js'
  import { settings } from '@/stores/settingsStore.svelte.js'

  // Filter actions by page type and the user's hidden-buttons setting
  let visibleActions = $derived(
    getVisibleActions({
      isYouTube: isYouTubeActive,
      isCourse: isCourseActive,
      hidden: settings.hiddenActionButtons,
    }),
  )

  // Initialize shared tooltip state
  const tooltipState = new ShadowTooltipState()
  setContext('shadow-tooltip-state', tooltipState)
</script>

{#if visibleActions.length}
<div
  class="flex z-30 mx-auto gap-4 flex-wrap justify-center {inline
    ? 'relative'
    : 'absolute bottom-6.5'}"
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
{/if}

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
