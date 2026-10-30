<script>
  // @ts-nocheck
  import { _ } from 'svelte-i18n'
  import ChatSourceIcon from '@/components/chat/ChatSourceIcon.svelte'
  import { tabMentionService } from '@/services/chat/tabMentionService.js'

  // tabMentionService reports reasons as English sentences; map the known ones
  // to locale keys and let anything else through unchanged.
  const DISABLED_REASON_KEYS = {
    'Browser, extension, store, and local pages cannot be attached.':
      'chat.tab_mention.reason_unsupported',
    'PDF and viewer pages cannot be attached.': 'chat.tab_mention.reason_pdf',
    'Comments already attached for this video.':
      'chat.tab_mention.reason_comments_attached',
  }

  function disabledReasonLabel(reason) {
    if (!reason) return reason
    const key = DISABLED_REASON_KEYS[reason]
    return key ? $_(key, { default: reason }) : reason
  }
  let { open = false, query = '', attachments = [], onSelect = null, onClose = null } = $props()
  let entries = $state([])
  let error = $state('')
  let selectedIndex = $state(0)
  let itemEls = $state([])

  $effect(() => {
    if (open) {
      tabMentionService.listMentionSources(query, { attachments })
        .then((items) => {
          entries = items
          selectedIndex = 0
        })
        .catch((e) => error = e.message)
    }
  })

  // Keep the highlighted item within the scrollable viewport during keyboard nav.
  $effect(() => {
    if (open) itemEls[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  })

  async function select(entry) {
    try {
      await onSelect?.(entry)
      onClose?.()
    } catch (e) {
      error = e.message
    }
  }

  export function handleKeyDown(event) {
    if (!open || entries.length === 0) return false

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedIndex = (selectedIndex + 1) % entries.length
      return true
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedIndex = (selectedIndex - 1 + entries.length) % entries.length
      return true
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const entry = entries[selectedIndex]
      if (entry && !entry.disabledReason) {
        select(entry)
      }
      return true
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose?.()
      return true
    }

    return false
  }
</script>
{#if open}
  <div role="listbox" aria-label={$_('chat.tab_mention.aria_label', { default: 'Matching sources' })} class="absolute bottom-full left-3 right-3 mb-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface-1 p-1 shadow-xl z-30">
    {#if error}<p class="p-2 text-xs text-error">{error}</p>{/if}
    {#each entries as entry, i (entry.id)}
      <button
        bind:this={itemEls[i]}
        role="option"
        aria-selected={i === selectedIndex}
        class="flex w-full items-center gap-2 rounded p-2 text-left text-sm hover:bg-surface-2 disabled:opacity-50 {i === selectedIndex ? 'bg-surface-2 ring-1 ring-border' : ''}"
        disabled={!!entry.disabledReason}
        title={disabledReasonLabel(entry.disabledReason) || entry.url}
        onclick={() => select(entry)}
      >
        <ChatSourceIcon
          favIconUrl={entry.favIconUrl}
          fallbackIcon="heroicons:document-text"
          size={18}
        />
        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium">{entry.isCommentEntry ? entry.label : (entry.title || 'Untitled tab')}</span>
          <span class="block truncate text-xs text-text-secondary">
            {entry.hostname}{entry.disabledReason ? ` · ${entry.disabledReason}` : ''}
          </span>
        </span>
      </button>
    {:else}
      <p class="p-2 text-xs text-text-secondary">{$_('chat.tab_mention.no_results', { default: 'No matching tabs.' })}</p>
    {/each}
  </div>
{/if}
