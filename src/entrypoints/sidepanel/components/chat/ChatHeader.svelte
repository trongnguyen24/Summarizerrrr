<script>
  // @ts-nocheck
  import ConversationMenu from '@/entrypoints/sidepanel/components/chat/ConversationMenu.svelte'
  import { chatState } from '@/stores/chatStore.svelte.js'
  import { browser } from 'wxt/browser'

  let { onOpenConversation = null } = $props()

  function openHistory() {
    browser.tabs.create({ url: browser.runtime.getURL('archive.html') })
  }

  function openSettings() {
    browser.tabs.create({ url: browser.runtime.getURL('settings.html') })
  }
</script>

<!-- Pinned to the right edge of the tab bar row (mirrors the prev/next
     buttons on the left) so the menu costs no vertical space. -->
<div class="fixed right-0 top-0 z-40 flex h-9 items-center px-1">
  <div
    class="absolute right-0 top-0 h-8.5 w-14 bg-linear-to-l from-background-dark/70 to-background-dark/0 mask-l-from-50% backdrop-blur-[2px]"
  ></div>
  <div class="relative z-10 flex">
    <ConversationMenu
      activeConversationId={chatState.activeConversationId}
      {onOpenConversation}
      onOpenHistory={openHistory}
      onOpenSettings={openSettings}
    />
  </div>
</div>
