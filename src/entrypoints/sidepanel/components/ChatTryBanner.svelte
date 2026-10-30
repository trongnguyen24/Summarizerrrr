<script>
  import { t } from 'svelte-i18n'
  import { showChatSurface } from '@/stores/sidepanelViewStore.svelte.js'
</script>

<!-- Sits just above the Noti bar; both share the same visibility condition. -->
<button
  onclick={showChatSurface}
  class="fixed left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-1rem)] font-mono bottom-16 py-2 z-50 cursor-pointer flex items-center text-xs text-text-secondary"
  aria-label={$t('notifications.try_chat')}
>
  <span class="shine-once truncate">
    {$t('notifications.try_chat')}
  </span>
</button>

<style>
  /* Same sweep as ChatThinkingIndicator's shine, but played once. The
     gradient is 3× the text width with the highlight in the middle third,
     so both the start (100%) and end (0%) positions show only the base
     color — no JS needed to settle into the resting state. */
  .shine-once {
    background: linear-gradient(
      100deg,
      var(--color-text-secondary) 0%,
      var(--color-text-secondary) 42%,
      var(--color-text-primary) 50%,
      var(--color-text-secondary) 58%,
      var(--color-text-secondary) 100%
    );
    background-size: 300% 100%;
    background-position: 100% 0;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    /* A border, not text-decoration: with background-clip: text the
       decoration is painted in the transparent text color and vanishes. */
    line-height: 1.15;
    border-bottom: 1px solid
      color-mix(in oklch, var(--color-text-secondary) 45%, transparent);
    transition: border-color 200ms;
    animation: try-chat-shine 1.6s ease-in-out 0.4s 1 both;
  }

  button:hover .shine-once {
    border-bottom-color: var(--color-text-secondary);
  }

  @keyframes try-chat-shine {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: 0% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shine-once {
      animation: none;
    }
  }
</style>
