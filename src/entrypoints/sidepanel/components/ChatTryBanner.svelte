<script>
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import { showChatSurface } from '@/stores/sidepanelViewStore.svelte.js'
</script>

<!-- Sits just above the Noti bar; both share the same visibility condition. -->
<button
  onclick={showChatSurface}
  class="fixed left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-1rem)] font-mono bottom-16 z-50 cursor-pointer group"
  aria-label={$t('notifications.try_chat')}
>
  <div
    class="dark:bg-surface-2 bg-background py-2 px-4 dark:border text-text-secondary border-border rounded-4xl flex items-center gap-2 transition-all duration-200 hover:border-border-active hover:bg-surface-3"
  >
    <div class="flex-1 text-xs truncate text-left">
      {$t('notifications.try_chat')}
    </div>
    <Icon icon="heroicons:arrow-right" width="16" height="16" />
  </div>
</button>
