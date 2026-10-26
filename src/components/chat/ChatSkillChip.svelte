<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let { skill, onClear = null } = $props()
</script>

{#if skill}
  <!-- Plain `/name`, matching how the skill is typed. No pill, no accent colour:
       it sits inside the composer box, so it should read as part of the input. -->
  <span
    class="inline-flex min-w-0 items-center gap-1 text-xs text-text-secondary"
  >
    <span class="truncate">/{skill.name || skill.skillId}</span>
    {#if onClear}
      <button
        type="button"
        class="shrink-0 text-muted transition-colors hover:text-text-primary"
        aria-label="Clear selected skill"
        onclick={onClear}
      >
        <Icon icon="tabler:x" width="12" height="12" />
      </button>
    {/if}
  </span>
{/if}
