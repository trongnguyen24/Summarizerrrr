<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { _ } from 'svelte-i18n'

  let { warnings = [] } = $props()
</script>

{#if warnings?.length}
  <div
    class="flex flex-col gap-1 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-text-secondary"
    role="status"
    aria-live="polite"
  >
    {#each warnings as warning}
      <div class="flex items-start gap-1.5">
        <Icon
          icon="heroicons:exclamation-circle"
          width="14"
          height="14"
          class="mt-0.5 shrink-0 text-warning"
        />
        <span class="break-words min-w-0 flex-1">
          {#if typeof warning === 'string'}
            {warning}
          {:else}
            {@const key = (warning.code === 'source_dropped' && !warning.params?.title)
              ? 'source_dropped_untitled'
              : warning.code}
            {@const titleVal = warning.params?.title}
            {#if titleVal}
              {@const translated = $_(`chat.context_warning.${key}`, { values: { ...warning.params, title: '__TITLE__' } })}
              {@const parts = translated.split('__TITLE__')}
              {parts[0]}<span class="inline-block max-w-[200px] truncate align-bottom font-medium" title={titleVal}>{titleVal}</span>{parts[1] || ''}
            {:else}
              {$_(`chat.context_warning.${key}`, { values: warning.params })}
            {/if}
          {/if}
        </span>
      </div>
    {/each}
  </div>
{/if}
