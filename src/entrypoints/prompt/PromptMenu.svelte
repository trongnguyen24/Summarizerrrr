<script>
  import { t } from 'svelte-i18n'
  export let promptKey
  export let summarizePrompts
  export let customActionPrompts
  export let handlePromptMenuClick
</script>

<div
  class="w-56 relative z-20 bg-background overflow-hidden border-r border-border/70 flex flex-col"
>
  <h2 class="text-lg p-4 font-bold">{$t('prompts.title')}</h2>

  <!-- Summarize Section -->
  <div class="flex flex-col px-2 text-muted gap-1">
    <h3
      class="text-xs uppercase tracking-wider text-muted/70 px-2 py-1 font-semibold"
    >
      {$t('prompts.sections.summarize')}
    </h3>
    {#each Object.entries(summarizePrompts) as [key, title]}
      <button
        class="prompt-button relative py-2 px-4 transition-colors duration-125 hover:bg-blackwhite/5 rounded-sm {promptKey ===
        key
          ? 'text-text-primary active font-bold'
          : 'text-text-secondary'} w-full text-left"
        onclick={() => handlePromptMenuClick(key)}
      >
        {title}
      </button>
    {/each}
  </div>

  <!-- Custom Actions Section -->
  <div class="flex flex-col px-2 text-muted gap-1 mt-4">
    <h3
      class="text-xs uppercase tracking-wider text-muted/70 px-2 py-1 font-semibold"
    >
      {$t('prompts.sections.custom_actions')}
    </h3>
    {#each Object.entries(customActionPrompts) as [key, title]}
      <button
        class="prompt-button relative py-2 px-4 transition-colors duration-125 hover:bg-blackwhite/5 rounded-sm {promptKey ===
        key
          ? 'text-text-primary active font-bold'
          : 'text-text-secondary'} w-full text-left"
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
