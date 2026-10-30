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
    // Re-clicking the active kind clears it
    if (kindFilterStore.selectedKind === kind) {
      clearKindFilter()
    } else {
      setKindFilter(kind)
    }
  }
</script>

<div class="flex items-center gap-0.5">
  {#each kinds as entry (entry.label)}
    <button
      class="p-1.5 rounded-md transition-colors duration-200 {kindFilterStore.selectedKind ===
      entry.kind
        ? 'bg-surface-2 text-text-primary'
        : 'hover:bg-blackwhite/5 text-text-secondary'}"
      onclick={() => handleKindClick(entry.kind)}
      aria-pressed={kindFilterStore.selectedKind === entry.kind}
      aria-label={entry.label}
      title={entry.label}
    >
      <Icon icon={entry.icon} width="18" height="18" />
    </button>
  {/each}
</div>
