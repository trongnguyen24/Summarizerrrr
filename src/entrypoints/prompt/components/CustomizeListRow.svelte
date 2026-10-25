<script>
  // @ts-nocheck
  // One sidebar row for the Customize page (prompts and skills). Mirrors
  // archive/components/ArchiveListItem.svelte's row: same height, colours and
  // the glowing bar on the left of the selected row. Copied rather than
  // imported — cross-surface component imports are banned (Rule 5).
  let { label, selected = false, onSelect = null } = $props()
</script>

<div class="relative h-10">
  <button
    class="list-button w-full relative p-2.5 text-left text-sm rounded-md transition-colors hover:bg-blackwhite/5 {selected
      ? 'text-text-primary bg-neutral-100 hover:bg-white/60 dark:hover:bg-white/10 dark:bg-surface-2 active'
      : 'text-text-secondary hover:bg-surface-1 dark:hover:bg-surface-2'}"
    onclick={() => onSelect?.()}
  >
    <div class="line-clamp-1">{label}</div>
  </button>
</div>

<style>
  .list-button::after {
    content: '';
    display: block;
    width: 0px;
    position: absolute;
    background: white;
    top: 50%;
    transform: translateY(-50%) translateX(-0.25rem);
    right: -0.5rem;
    left: -0.5rem;
    height: 1rem;
    border-radius: 0 4px 4px 0;
    transition: all 0.3s ease-in-out;
    box-shadow:
      0 0 2px #ffffff18,
      0 0 0 #ffffff18;
  }

  .list-button.active {
    &::after {
      transform: translateY(-50%) translateX(1px);
      width: 4px;
      box-shadow:
        4px 0 8px 2px #ffffff71,
        0 0 3px 1px #ffffff94;
    }
  }
</style>
