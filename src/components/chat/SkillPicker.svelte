<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let {
    open = false,
    query = '',
    skills = [],
    onSelect = null,
    onClose = null,
  } = $props()

  let selectedIndex = $state(0)
  let itemEls = $state([])

  let matchingSkills = $derived.by(() => {
    const normalizedQuery = String(query || '').trim().toLocaleLowerCase()
    if (!normalizedQuery) return skills
    return skills.filter((skill) =>
      String(skill.name || '').toLocaleLowerCase().includes(normalizedQuery),
    )
  })

  $effect(() => {
    if (open) {
      query
      selectedIndex = 0
    }
  })

  $effect(() => {
    if (open) itemEls[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  })

  function select(skill) {
    onSelect?.(skill)
    onClose?.()
  }

  export function handleKeyDown(event) {
    if (!open) return false

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose?.()
      return true
    }

    if (matchingSkills.length === 0) {
      if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        return true
      }
      return false
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedIndex = (selectedIndex + 1) % matchingSkills.length
      return true
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedIndex = (selectedIndex - 1 + matchingSkills.length) % matchingSkills.length
      return true
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      select(matchingSkills[selectedIndex])
      return true
    }

    return false
  }
</script>

{#if open}
  <div
    role="listbox"
    aria-label="Matching skills"
    class="absolute bottom-full left-3 right-3 z-30 mb-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface-1 p-1 shadow-xl"
  >
    {#each matchingSkills as skill, i (skill.id)}
      <button
        bind:this={itemEls[i]}
        type="button"
        role="option"
        aria-selected={i === selectedIndex}
        class="flex w-full items-center gap-2 rounded p-2 text-left text-sm hover:bg-surface-2 {i === selectedIndex ? 'bg-surface-2 ring-1 ring-border' : ''}"
        onclick={() => select(skill)}
      >
        <Icon icon="heroicons:bolt" width="16" height="16" />
        <span class="min-w-0 flex-1 truncate font-medium">{skill.name}</span>
      </button>
    {:else}
      <p class="p-2 text-xs text-text-secondary">No matching skills.</p>
    {/each}
  </div>
{/if}
