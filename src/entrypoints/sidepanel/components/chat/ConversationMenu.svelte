<script>
  // @ts-nocheck
  import { DropdownMenu } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import { listRecentConversations } from '@/stores/chatStore.svelte.js'
  import { showSummarySurface } from '@/stores/sidepanelViewStore.svelte.js'

  let {
    activeConversationId = null,
    onOpenConversation = null,
    onOpenHistory = null,
    onOpenSettings = null,
  } = $props()

  const RECENT_LIMIT = 50

  let recentConversations = $state([])

  async function loadRecent(open) {
    if (!open) return
    try {
      recentConversations = await listRecentConversations({
        limit: RECENT_LIMIT,
      })
    } catch (error) {
      console.error('[ConversationMenu] Failed to load conversations:', error)
      recentConversations = []
    }
  }
</script>

<DropdownMenu.Root onOpenChange={loadRecent}>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <button
        class="p-1 hover:text-text-primary relative text-text-secondary"
        aria-label={$t('chat.menu.aria_label', { default: 'Conversation menu' })}
        {...props}
      >
        <Icon icon="tabler:menu-2" width="20" height="20" />
      </button>
    {/snippet}
  </DropdownMenu.Trigger>

  <DropdownMenu.Portal>
    <!-- preventScroll off: bits-ui's body scroll lock breaks the sidepanel's
         sticky tab bar, which then scrolls away while the menu is open. -->
    <DropdownMenu.Content
      class="bg-surface-1 dark:bg-surface-2 border border-border rounded-md shadow-lg z-50 w-80"
      sideOffset={5}
      align="end"
      preventScroll={false}
    >
      {#if recentConversations.length}
        <div
          class="px-4 pt-4 pb-1 text-[0.7rem] uppercase tracking-wide text-text-secondary"
        >
          {$t('chat.menu.recent', { default: 'Recent conversations' })}
        </div>
        <div class="relative">
          <div
            class="recent-scroll max-h-80 overflow-y-auto overscroll-contain scroll-smooth pt-1 pb-2 scrollbar-gutter:stable"
          >
            {#each recentConversations as conversation (conversation.id)}
              <DropdownMenu.Item
                class="cursor-pointer px-4 py-2 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex flex-col gap-0 text-sm {conversation.id ===
                activeConversationId
                  ? 'text-primary'
                  : ''}"
                onSelect={() => onOpenConversation?.(conversation.id)}
              >
                <span class="truncate block"
                  >{conversation.title || 'Untitled conversation'}</span
                >
              </DropdownMenu.Item>
            {/each}
          </div>
          <div
            class="pointer-events-none absolute left-0 right-3 top-0 z-10 h-4 bg-linear-to-b from-surface-1 via-surface-1/80 to-surface-1/0 dark:from-surface-2 dark:via-surface-2/80 dark:to-surface-2/0"
          ></div>
          <div
            class="pointer-events-none absolute left-0 right-3 bottom-0 z-10 h-4 bg-linear-to-t from-surface-1 via-surface-1/80 to-surface-1/0 dark:from-surface-2 dark:via-surface-2/80 dark:to-surface-2/0"
          ></div>
        </div>
      {/if}

      <div class="border-t border-border my-1"></div>

      <DropdownMenu.Item
        class="cursor-pointer px-4 py-2.5 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex items-center gap-2 text-sm"
        onSelect={() => onOpenHistory?.()}
      >
        <Icon icon="solar:history-linear" width="20" height="20" />
        <span>{$t('chat.menu.history', { default: 'History' })}</span>
      </DropdownMenu.Item>

      <DropdownMenu.Item
        class="cursor-pointer px-4 py-2.5 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex items-center gap-2 text-sm"
        onSelect={() => onOpenSettings?.()}
      >
        <Icon icon="heroicons:cog-6-tooth" width="20" height="20" />
        <span>{$t('chat.menu.settings', { default: 'Settings' })}</span>
      </DropdownMenu.Item>

      <div class="border-t border-border my-1"></div>

      <DropdownMenu.Item
        class="cursor-pointer px-4 py-2.5 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex items-center gap-2 text-sm"
        onSelect={showSummarySurface}
      >
        <Icon icon="heroicons:arrow-uturn-left" width="20" height="20" />
        <span>{$t('notifications.back_to_summarize')}</span>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
  .recent-scroll {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  .recent-scroll:hover {
    scrollbar-color: var(--color-border) transparent;
  }

  .recent-scroll::-webkit-scrollbar {
    width: 4px;
    background: transparent;
  }

  .recent-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .recent-scroll::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 3px;
  }

  .recent-scroll:hover::-webkit-scrollbar-thumb {
    background: var(--color-border);
  }
</style>
