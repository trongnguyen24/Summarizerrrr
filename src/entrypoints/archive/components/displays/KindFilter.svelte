<script>
  // @ts-nocheck
  /**
   * Splits the merged list by record kind (summary vs chat).
   * Unlike the content-type and tag filters, this one hides non-matching rows
   * instead of dimming them — see SidePanel's filter effect.
   */
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import {
    kindFilterStore,
    setKindFilter,
    clearKindFilter,
  } from '@/stores/kindFilterStore.svelte.js'

  let kinds = $derived([
    { kind: null, label: $t('archive.kind_all'), icon: 'heroicons:squares-2x2' },
    {
      kind: 'summary',
      label: $t('archive.kind_summaries'),
      icon: 'heroicons:document-text',
    },
    {
      kind: 'chat',
      label: $t('archive.kind_chats'),
      icon: 'heroicons:chat-bubble-left-right',
    },
  ])

  function handleKindClick(kind) {
    // Re-clicking the active kind clears it, matching HistoryTagFilter
    if (kind === null || kindFilterStore.selectedKind === kind) {
      clearKindFilter()
    } else {
      setKindFilter(kind)
    }
  }
</script>

<div class="pb-4">
  <div class="flex gap-2 px-2">
    {#each kinds as entry (entry.label)}
      <button
        class="flex-1 flex flex-col items-center gap-1 p-2 rounded-md transition-colors duration-200 {kindFilterStore.selectedKind ===
        entry.kind
          ? 'bg-surface-2 text-text-primary'
          : 'hover:bg-blackwhite/5 text-text-secondary'}"
        onclick={() => handleKindClick(entry.kind)}
        aria-pressed={kindFilterStore.selectedKind === entry.kind}
        title={entry.label}
      >
        <div class="size-6 relative">
          <Icon
            icon={entry.icon}
            width="24"
            height="24"
            class="transition-colors duration-200"
          />
        </div>
        <span class="text-xs font-medium">
          {entry.label}
        </span>
      </button>
    {/each}
  </div>
</div>
