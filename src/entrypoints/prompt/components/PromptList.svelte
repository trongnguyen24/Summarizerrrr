<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import CustomizeListRow from '@/entrypoints/prompt/components/CustomizeListRow.svelte'

  let {
    promptKey,
    summarizePrompts,
    customActionPrompts,
    onSelect = null,
  } = $props()
</script>

<!-- Summarize Section -->
<div class="flex flex-col gap-0.5 text-muted">
  <h3
    class="text-xs uppercase tracking-wider text-muted/70 px-2.5 py-1 font-semibold"
  >
    {$t('prompts.sections.summarize')}
  </h3>
  {#each Object.entries(summarizePrompts) as [key, title]}
    <CustomizeListRow
      label={title}
      selected={promptKey === key}
      onSelect={() => onSelect?.(key)}
    />
  {/each}
</div>

<!-- Custom Actions Section -->
<div class="mt-4 flex flex-col gap-0.5 text-muted">
  <h3
    class="text-xs uppercase tracking-wider text-muted/70 px-2.5 py-1 font-semibold"
  >
    {$t('prompts.sections.custom_actions')}
  </h3>
  {#each Object.entries(customActionPrompts) as [key, title]}
    <CustomizeListRow
      label={title}
      selected={promptKey === key}
      onSelect={() => onSelect?.(key)}
    />
  {/each}
</div>
