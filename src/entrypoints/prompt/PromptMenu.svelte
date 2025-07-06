<script>
  export let promptKey
  export let promptTitles
  export let handlePromptMenuClick
</script>

<div
  class="w-56 relative z-20 bg-background overflow-hidden border-r border-border/70 flex flex-col"
>
  <h2 class="text-lg p-4 font-bold">Prompts</h2>
  <div class="flex flex-col px-2 text-muted gap-1">
    {#each Object.entries(promptTitles) as [key, title]}
      <button
        class="prompt-button relative p-2 transition-colors duration-125 hover:bg-blackwhite/5 rounded-sm {promptKey ===
        key
          ? 'text-text-primary active font-bold'
          : 'variant-ghost'} w-full text-left"
        onclick={() => handlePromptMenuClick(key)}
      >
        {title}
      </button>
    {/each}
  </div>
</div>

<style>
  /* Your component-specific styles here */
  .prompt-button::after {
    content: '';
    display: block;
    width: 0px;
    position: absolute;
    background: white;
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    right: -0.5rem;
    left: -0.5rem;
    height: 1rem;
    border-radius: 0 4px 4px 0;
    transition: all 0.3s ease-in-out;
    box-shadow:
      0 0 2px #ffffff18,
      0 0 0 #ffffff18;
  }
  .prompt-button.active {
    &::after {
      transform: translateY(-50%) translateX(0px);
      width: 4px;
      box-shadow:
        4px 0 8px 2px #ffffff71,
        0 0 3px 1px #ffffff94;
    }
  }
</style>
