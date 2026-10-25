<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import CustomizeListRow from '@/entrypoints/prompt/components/CustomizeListRow.svelte'

  // Sidebar list only: the Customize header and tabs live in App.svelte.
  let {
    skills = [],
    selectedId = null,
    onSelect = null,
    onCreate = null,
  } = $props()

  let builtIns = $derived(skills.filter((skill) => skill.builtIn))
  let userSkills = $derived(skills.filter((skill) => !skill.builtIn))
</script>

<button
  class="flex w-full items-center justify-center gap-1.5 rounded-md border border-border/60 p-2.5 text-sm text-text-secondary transition-colors hover:border-primary hover:text-primary"
  onclick={() => onCreate?.()}
>
  <Icon icon="heroicons:plus" width="16" height="16" />
  <span>New skill</span>
</button>

<!-- Built-in Section -->
<div class="mt-4 flex flex-col gap-0.5 text-muted">
  <h3
    class="text-xs uppercase tracking-wider text-muted/70 px-2.5 py-1 font-semibold"
  >
    Built-in
  </h3>
  {#each builtIns as skill (skill.id)}
    <CustomizeListRow
      label={skill.name}
      selected={selectedId === skill.id}
      onSelect={() => onSelect?.(skill.id)}
    />
  {/each}
</div>

<!-- User Skills Section -->
<div class="mt-4 flex flex-col gap-0.5 text-muted">
  <h3
    class="text-xs uppercase tracking-wider text-muted/70 px-2.5 py-1 font-semibold"
  >
    User skills
  </h3>
  {#each userSkills as skill (skill.id)}
    <CustomizeListRow
      label={skill.name}
      selected={selectedId === skill.id}
      onSelect={() => onSelect?.(skill.id)}
    />
  {:else}
    <p class="px-2.5 py-2 text-xs text-muted/70">No custom skills yet.</p>
  {/each}
</div>
