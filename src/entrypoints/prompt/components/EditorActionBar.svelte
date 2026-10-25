<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  // Sticky Discard / Save bar shared by PromptEditor and SkillEditor.
  // Always rendered so the layout never jumps; Discard / Save are disabled
  // while there is nothing to save.
  // `actions` renders extra buttons (e.g. a skill's Reset / Delete) at the
  // bar's left edge, flush with the fields above.
  let { dirty = false, onDiscard = null, onSave = null, actions = null } =
    $props()
</script>

<div
  class="sticky bottom-0 z-20 -mx-2 mt-auto flex items-center justify-between gap-2 bg-surface-1/95 px-2 py-3 backdrop-blur-sm"
>
  <div class="flex min-w-0 items-center gap-4">
    {@render actions?.()}
  </div>
  <div class="flex shrink-0 items-center gap-2">
    <button
      type="button"
      class="relative overflow-hidden group"
      onclick={() => onDiscard?.()}
      disabled={!dirty}
    >
      <div
        class="font-medium py-2 px-4 border transition-colors duration-200 {dirty
          ? 'bg-surface-2 group-hover:bg-surface-2/95 text-text-secondary border-border hover:border-gray-500/50 hover:text-text-primary dark:hover:text-white'
          : 'bg-white dark:bg-surface-1 text-text-secondary border-border/40'}"
      >
        {$t('prompts.buttons.discard')}
      </div>
      <span
        class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 {dirty
          ? 'border-border group-hover:border-gray-500'
          : 'border-border/40'}"
      ></span>
    </button>
    <button
      type="button"
      class="relative overflow-hidden group"
      onclick={() => onSave?.()}
      disabled={!dirty}
    >
      <div
        class="font-medium py-2 px-4 border transition-colors duration-200 {dirty
          ? 'bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white'
          : 'bg-white dark:bg-surface-1 text-text-secondary border-border/40'}"
      >
        {$t('prompts.buttons.save')}
      </div>
      <span
        class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 {dirty
          ? 'border-orange-400 group-hover:border-orange-300/75'
          : 'border-border/40'}"
      ></span>
    </button>
  </div>
</div>
