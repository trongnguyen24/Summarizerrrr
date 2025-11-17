<script>
  // @ts-nocheck
  import { fallbackState, getFallbackMessage } from '@/stores/fallbackStore.svelte.js'
  import { fade, slide } from 'svelte/transition'
  import Icon from '@iconify/svelte'

  /**
   * Fallback Notification Component
   * Shows when AI model is switching to lighter models due to overload
   */
</script>

{#if fallbackState.isActive}
  <div
    class="fallback-notification mx-auto w-fit flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-md text-sm text-amber-300"
    transition:slide={{ duration: 200 }}
  >
    <div class="animate-spin">
      <Icon icon="solar:refresh-linear" width="16" height="16" />
    </div>
    <div class="flex flex-col gap-0.5">
      <span class="font-medium text-amber-200">
        {getFallbackMessage()}
      </span>
      <span class="text-xs text-amber-400/80">
        Switching to lighter model for better availability
      </span>
    </div>
  </div>
{/if}

<style>
  .fallback-notification {
    animation: gentle-pulse 2s ease-in-out infinite;
  }

  @keyframes gentle-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.85;
    }
  }
</style>
