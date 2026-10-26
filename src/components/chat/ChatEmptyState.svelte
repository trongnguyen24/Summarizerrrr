<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { skillService } from '@/lib/chat/skills/skillService.js'
  import { settings } from '@/stores/settingsStore.svelte.js'

  let { onSelectSkill = null } = $props()

  // What `pinned` actually means: these are the skills offered the moment a
  // chat opens. It is not an ordering flag for the `/` picker.
  let pinnedSkills = $state([])

  $effect(() => {
    settings.chatUserSkills
    pinnedSkills = skillService.listPinnedSkills(settings)
  })
</script>

{#if pinnedSkills.length > 0}
  <!-- Centred in the empty area above the composer. `z-40` sits below the
       composer block (`z-[41]` in ChatShell) so the context-bar panel, which
       opens upward out of that block, stays clickable over this area. -->
  <div
    class="relative z-40 flex w-full flex-1 items-center justify-center px-4 py-6 max-w-3xl mx-auto"
    data-testid="chat-empty-state"
  >
    <div
      class="flex flex-wrap flex-col items-center justify-center gap-3"
      role="group"
      aria-label="Suggested skills"
    >
      {#each pinnedSkills as skill (skill.id)}
        <button
          type="button"
          class="flex items-center gap-2 rounded-full w-full border border-border font-mono pl-4 pr-5 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          onclick={() => onSelectSkill?.(skill)}
        >
          <Icon icon="heroicons:bolt" width="16" height="16" class="shrink-0" />
          <span class="truncate">{skill.name}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}
