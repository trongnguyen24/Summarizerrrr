<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import TextScramble from '@/lib/utils/textScramble.js'
  import EditorActionBar from '@/entrypoints/prompt/components/EditorActionBar.svelte'

  // editor: the object returned by createSkillEditorState() in App.svelte
  let { editor } = $props()

  const fieldClass =
    'relative z-10 bg-white dark:bg-surface-1 border border-border w-full p-2 rounded-lg outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] transition-shadow focus:border-muted/60 text-text-primary font-mono'

  // skillService validates in English; map its known messages to locale keys.
  const ERROR_KEYS = {
    'A skill name is required.': 'customize.skills.error_name_required',
    'An instruction is required.': 'customize.skills.error_instruction_required',
  }

  function errorLabel(error) {
    const key = ERROR_KEYS[error]
    return key ? $t(key, { default: error }) : error
  }

  // Scramble the skill title like the prompt editor.
  let titleEl = $state(null)
  let ts = null
  $effect(() => {
    const name = editor.draft?.name
    if (!titleEl) return
    if (!ts) ts = new TextScramble(titleEl)
    ts.setText(name || $t('customize.skills.new', { default: 'New skill' }))
  })
</script>

<div
  class="relative mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 text-xs 2xl:text-sm text-text-primary"
>
  {#if editor.draft}
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-lg font-bold" bind:this={titleEl}>
        {editor.draft.name || $t('customize.skills.new', { default: 'New skill' })}
      </h2>
      <div class="flex shrink-0 items-center gap-4">
        <label
          class="flex items-center gap-2 text-text-secondary cursor-pointer select-none"
        >
          <input type="checkbox" bind:checked={editor.draft.pinned} />
          {$t('customize.skills.pin', { default: 'Pin' })}
        </label>
      </div>
    </div>

    {#each editor.errors as error}
      <p
        class="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-error"
      >
        {errorLabel(error)}
      </p>
    {/each}

    <div class="flex flex-col pt-6 gap-2 relative">
      <label
        for="skill-name"
        class="text-text-secondary bg-blackwhite/5 rounded-t-lg top-0 px-2 pt-1 pb-5 absolute w-fit"
        >{$t('customize.skills.name', { default: 'Name' })}</label
      >
      <input
        id="skill-name"
        class={fieldClass}
        bind:value={editor.draft.name}
      />
    </div>

    <div
      class="flex flex-1 flex-col pt-6 gap-2 relative min-h-[40vh] md:min-h-48"
    >
      <label
        for="skill-instruction"
        class="text-text-secondary bg-blackwhite/5 rounded-t-lg top-0 px-2 pt-1 pb-5 absolute w-fit"
        >{$t('customize.skills.instruction', { default: 'One-shot instruction' })}</label
      >
      <div
        class="text-text-secondary absolute top-0 right-0 max-w-[55%] truncate"
      >
        {$t('customize.skills.instruction_hint', { default: 'Applied to a single turn only' })}
      </div>
      <textarea
        id="skill-instruction"
        class="{fieldClass} flex-1 min-h-40 leading-normal"
        bind:value={editor.draft.instruction}
        placeholder=""
      ></textarea>
    </div>

    <EditorActionBar
      dirty={editor.isModified}
      onDiscard={editor.discardChanges}
      onSave={editor.saveSkill}
    >
      {#snippet actions()}
        {#if editor.draft.builtIn}
          <button
            class="relative overflow-hidden group"
            onclick={editor.resetBuiltIn}
          >
            <div
              class="font-medium py-2 px-4 border transition-colors duration-200 bg-surface-2 group-hover:bg-surface-2/95 text-text-secondary border-border hover:border-gray-500/50 hover:text-text-primary dark:hover:text-white"
            >
              {$t('customize.skills.reset', { default: 'Reset built-in' })}
            </div>
            <span
              class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 border-border group-hover:border-gray-500"
            ></span>
          </button>
        {:else}
          <button
            class="relative overflow-hidden group"
            onclick={editor.deleteSkill}
          >
            <div
              class="font-medium py-2 px-4 border transition-colors duration-200 bg-white dark:bg-surface-1 text-error/90 border-error/30 hover:border-error/60 hover:text-error"
            >
              {$t('customize.skills.delete', { default: 'Delete' })}
            </div>
            <span
              class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 border-error/30 group-hover:border-error/60"
            ></span>
          </button>
        {/if}
      {/snippet}
    </EditorActionBar>
  {:else}
    <p class="text-text-secondary">
      {$t('customize.skills.select_prompt', { default: 'Select a skill from the menu on the left, or create a new one.' })}
    </p>
  {/if}
</div>
