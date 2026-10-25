<script>
  // @ts-nocheck
  /**
   * Free-text search over the list (title + URL). Applies to summaries and
   * chats alike, unlike the old content-type filter it replaced.
   * Matching rows are filtered in SidePanel via lib/utils/archiveListFilter.js.
   */
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import KindFilter from '@/entrypoints/archive/components/displays/KindFilter.svelte'
  import { kindFilterStore } from '@/stores/kindFilterStore.svelte.js'

  let { value = $bindable('') } = $props()

  function handleKeyDown(event) {
    if (event.key === 'Escape' && value) {
      event.stopPropagation()
      value = ''
    }
  }
</script>

<div
  class="group flex items-center gap-2 h-13 pl-4 pr-2.5 w-full bg-background border-b border-border dark:border-border/50 focus-within:text-text-primary text-muted transition-colors duration-150"
>
  <Icon
    icon="heroicons:magnifying-glass"
    width="16"
    height="16"
    class="shrink-0"
  />
  <input
    type="search"
    class="flex-1 min-w-0 bg-transparent border-none p-0 text-sm text-text-primary placeholder:text-muted/40 focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:hidden"
    placeholder={$t('archive.search_placeholder')}
    aria-label={$t('archive.search_placeholder')}
    bind:value
    onkeydown={handleKeyDown}
  />
  {#if value}
    <button
      class="shrink-0 text-muted hover:text-text-primary transition-colors duration-150"
      onclick={() => (value = '')}
      aria-label={$t('archive.search_clear')}
      title={$t('archive.search_clear')}
    >
      <Icon icon="heroicons:x-mark" width="16" height="16" />
    </button>
  {/if}
  <!-- Kind icons stay hidden until the row is hovered/focused, or a kind is active -->
  <div
    class="transition-opacity duration-150 {kindFilterStore.selectedKind
      ? 'opacity-100'
      : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}"
  >
    <KindFilter />
  </div>
</div>
