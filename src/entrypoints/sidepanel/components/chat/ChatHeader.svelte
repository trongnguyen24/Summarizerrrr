<script>
  // @ts-nocheck
  import { _ } from 'svelte-i18n'
  import ConversationMenu from '@/entrypoints/sidepanel/components/chat/ConversationMenu.svelte'
  import Icon from '@iconify/svelte'
  import { tabTitle } from '@/stores/tabTitleStore.svelte.js'
  import { chatState, closeConversation } from '@/stores/chatStore.svelte.js'
  import { browser } from 'wxt/browser'

  let { onOpenConversation = null } = $props()

  function openHistory() {
    browser.tabs.create({ url: browser.runtime.getURL('archive.html') })
  }

  function openSettings() {
    browser.tabs.create({ url: browser.runtime.getURL('settings.html') })
  }

  function handleNewChat() {
    closeConversation()
  }
</script>

<div
  class="relative flex h-8 w-full shrink-0 items-center gap-1 px-2"
>
  <div class="line-clamp-1 flex-1 text-left text-xs text-text-secondary">
    {$tabTitle}
  </div>

  <button
    class="p-1.5 text-text-secondary hover:text-text-primary"
    aria-label={$_('chat.header.new_chat', { default: 'New chat' })}
    onclick={handleNewChat}
  >
    <Icon icon="heroicons:plus" width="20" height="20" />
  </button>

  <ConversationMenu
    activeConversationId={chatState.activeConversationId}
    {onOpenConversation}
    onOpenHistory={openHistory}
    onOpenSettings={openSettings}
  />
</div>
