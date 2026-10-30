<script>
  // @ts-nocheck
  import { _ } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import { conversationRepository } from '@/lib/db/conversationRepository.js'

  let { groundingRefs = [], open = false } = $props()

  let resolvedSources = $state([])
  let isLoading = $state(false)

  $effect(() => {
    const refs = groundingRefs
    if (!refs || refs.length === 0) {
      resolvedSources = []
      return
    }

    isLoading = true
    const sourceIds = refs.map((ref) => ref.sourceId)
    conversationRepository
      .getSourcesByIds(sourceIds)
      .then((sources) => {
        const sourceMap = new Map(sources.map((s) => [s.id, s]))
        resolvedSources = refs.map((ref) => {
          const source = sourceMap.get(ref.sourceId)
          return {
            sourceId: ref.sourceId,
            contentKind: ref.contentKind || 'condensed',
            title: source?.title || source?.normalizedUrl || $_('chat.source_drawer.unknown', { default: 'Unknown source' }),
            url: source?.url || source?.normalizedUrl || null,
            sourceType: source?.sourceType || null,
          }
        })
      })
      .catch((err) => {
        console.error('[ChatSourceDrawer] Failed to resolve sources:', err)
        resolvedSources = refs.map((ref) => ({
          sourceId: ref.sourceId,
          contentKind: ref.contentKind || 'condensed',
          title: $_('chat.source_drawer.unknown', { default: 'Unknown source' }),
          url: null,
          sourceType: null,
        }))
      })
      .finally(() => {
        isLoading = false
      })
  })

  function iconForType(sourceType) {
    if (sourceType === 'youtube') return 'heroicons:play-circle'
    if (sourceType === 'course') return 'heroicons:academic-cap'
    return 'heroicons:document-text'
  }
</script>

{#if open && resolvedSources.length > 0}
  <div class="mt-1 flex flex-col gap-1.5 rounded-lg border border-border bg-surface-1 p-2.5">
    {#each resolvedSources as source (source.sourceId)}
      <div class="flex items-start gap-2 text-xs text-text-secondary">
        <Icon icon={iconForType(source.sourceType)} width="14" height="14" class="mt-0.5 shrink-0" />
        <div class="flex min-w-0 flex-col gap-0.5">
          {#if source.url}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              class="truncate text-text-primary hover:underline"
              title={source.title}
            >
              {source.title}
            </a>
          {:else}
            <span class="truncate text-text-primary" title={source.title}>{source.title}</span>
          {/if}
          <span class="text-[10px] text-text-secondary/60">{source.contentKind}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if open && isLoading}
  <div class="mt-1 text-xs text-text-secondary/60">{$_('chat.source_drawer.loading', { default: 'Loading sources…' })}</div>
{/if}
