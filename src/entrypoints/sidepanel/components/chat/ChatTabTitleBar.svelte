<script>
  // @ts-nocheck
  import { onMount } from 'svelte'
  import {
    chatState,
    chatTabsState,
    getChatTabRuntimeDescriptors,
    handleChatBrowserTabRemoved,
    handleChatTabNavigation,
    removeChatTabSession,
    activateChatSession,
    syncChatForActiveTab,
    updateChatTabMetadata,
  } from '@/stores/chatStore.svelte.js'
  import {
    getAdjacentChatTabId,
    mergeChatTabsWithBrowserTabs,
  } from '@/services/chat/chatTabPolicy.js'
  import SidepanelTabBar from '@/entrypoints/sidepanel/components/SidepanelTabBar.svelte'

  let tabs = $state([])
  let loadSequence = 0
  let lastBrowserTabs = []

  let activeSessionId = $derived(chatTabsState.activeSessionTabId)
  let activeTabId = $derived(
    chatTabsState.activeSessionTabId ?? chatTabsState.activeBrowserTabId,
  )

  $effect(() => {
    const _trigger = [
      chatTabsState.version,
      chatTabsState.activeSessionTabId,
      chatState.activeConversationId,
      chatState.messages.length,
      chatState.composerText,
      chatState.selectedSkill,
      chatState.pendingAttachments.length,
      chatState.isSending,
      chatState.streamingMessage,
      chatState.error,
    ]
    recomputeTabs()
  })

  onMount(() => {
    initialize()

    const handleActivated = async ({ tabId }) => {
      try {
        const tab = await browser.tabs.get(tabId)
        await syncChatForActiveTab(tabId, {
          url: tab?.url || null,
          title: tab?.title ?? null,
          favIconUrl: tab?.favIconUrl ?? null,
        })
      } catch (error) {
        console.error('[ChatTabTitleBar] Failed to activate chat tab:', error)
      }
      await refreshTabsInfo()
    }

    const handleUpdated = (tabId, changeInfo) => {
      if (changeInfo.url) handleChatTabNavigation(tabId, changeInfo.url)
      if (changeInfo.title || changeInfo.favIconUrl) {
        updateChatTabMetadata(tabId, {
          ...(changeInfo.title !== undefined && { title: changeInfo.title }),
          ...(changeInfo.favIconUrl !== undefined && { favIconUrl: changeInfo.favIconUrl }),
        })
      }
      if (changeInfo.url || changeInfo.title) refreshTabsInfo()
    }

    const handleRemoved = (tabId) => {
      handleChatBrowserTabRemoved(tabId)
      refreshTabsInfo()
    }

    browser.tabs.onActivated.addListener(handleActivated)
    browser.tabs.onUpdated.addListener(handleUpdated)
    browser.tabs.onRemoved.addListener(handleRemoved)
    return () => {
      browser.tabs.onActivated.removeListener(handleActivated)
      browser.tabs.onUpdated.removeListener(handleUpdated)
      browser.tabs.onRemoved.removeListener(handleRemoved)
    }
  })

  async function initialize() {
    try {
      const [activeTab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (activeTab?.id) {
        await syncChatForActiveTab(activeTab.id, {
          url: activeTab.url || null,
          title: activeTab.title ?? null,
          favIconUrl: activeTab.favIconUrl ?? null,
        })
      }
    } catch (error) {
      console.error('[ChatTabTitleBar] Failed to initialize:', error)
    }
    await refreshTabsInfo()
  }

  // Re-fetches the browser tab list. Only call this from real browser-tab
  // events (activated/updated/removed, initial mount) — it's a cross-process
  // call and must not run on every composer keystroke.
  async function refreshTabsInfo() {
    const sequence = ++loadSequence
    try {
      const browserTabs = await browser.tabs.query({ currentWindow: true })
      if (sequence !== loadSequence) return
      lastBrowserTabs = browserTabs
      recomputeTabs()
    } catch (error) {
      console.error('[ChatTabTitleBar] Failed to load tabs:', error)
    }
  }

  // Re-derives the tab bar from the last-fetched browser tab list. Safe to
  // call on every chat-session change (draft text, streaming state, etc.)
  // since it does no browser API calls.
  function recomputeTabs() {
    tabs = mergeChatTabsWithBrowserTabs({
      runtimeTabs: getChatTabRuntimeDescriptors(),
      browserTabs: lastBrowserTabs,
      activeBrowserTabId: chatTabsState.activeBrowserTabId,
      activeSessionId: chatTabsState.activeSessionTabId,
    })
  }

  async function selectTab(tabId) {
    if (!tabId || tabId === activeSessionId) return
    const selectedTab = tabs.find((tab) => tab.id === tabId)
    try {
      if (selectedTab?.detached) {
        await activateChatSession(tabId)
      } else if (tabId === chatTabsState.activeBrowserTabId) {
        await syncChatForActiveTab(tabId)
      } else {
        await browser.tabs.update(tabId, { active: true })
      }
    } catch (error) {
      console.error('[ChatTabTitleBar] Failed to navigate to tab:', error)
    }
  }

  function removeTab(tabId) {
    removeChatTabSession(tabId)
    refreshTabsInfo()
  }

  function navigateByOffset(offset) {
    const targetId = getAdjacentChatTabId(tabs, activeTabId, offset)
    if (targetId != null) selectTab(targetId)
  }
</script>

<SidepanelTabBar
  {tabs}
  {activeTabId}
  onSelectTab={selectTab}
  onRemoveTab={removeTab}
  onPrevious={() => navigateByOffset(-1)}
  onNext={() => navigateByOffset(1)}
/>
