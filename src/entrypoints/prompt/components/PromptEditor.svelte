<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import {
    promptTemplates,
    customActionTemplates,
  } from '@/lib/prompts/index.js'
  import Icon from '@iconify/svelte'
  import { OverlayScrollbars } from 'overlayscrollbars'
  import PlusIcon from '@/components/icons/PlusIcon.svelte'
  import TextScramble from '@/lib/utils/textScramble.js'
  import CustomToast from '@/entrypoints/prompt/components/CustomToast.svelte'
  import { toast } from 'svelte-sonner'
  import {
    settings,
    updateSettings,
  } from '@/stores/settingsStore.svelte.js'
  import { Dialog, DropdownMenu } from 'bits-ui'
  import { slideScaleFade, fadeOnly } from '@/lib/utils/slideScaleFade.js'
  import { enhancePrompt } from '@/lib/api/api.js'
  import aiPrompt from '@/lib/prompts/templates/promptEnhance.js'
  import EditorActionBar from '@/entrypoints/prompt/components/EditorActionBar.svelte'

  // Thin overlay scrollbar for the preset menu (same setup as
  // settings/AIProviderSettings): floats over the items instead of taking a
  // bordered gutter. Touch devices keep the native scroll.
  function overlayScroll(node) {
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    if (isTouchDevice) return

    const instance = OverlayScrollbars(node, {
      scrollbars: {
        theme: 'os-theme-custom-app',
        autoHide: 'leave',
        autoHideDelay: 400,
      },
    })
    return { destroy: () => instance.destroy() }
  }

  // promptKey: `<x>CustomPromptContent` settings key. title: its display name.
  // dirty: bindable, true while the editor holds unsaved changes.
  let { promptKey, title, dirty = $bindable(false) } = $props()

  let isOpen = $state(false) // State for the enhance dialog
  let dataget = $state('')
  let error = $state(null)
  let loading = $state(false)

  let titleEl = $state(null)
  let ts = null

  let currentSystemPrompt = $state('')
  let currentUserPrompt = $state('')
  let initialSystemPrompt = $state('')
  let initialUserPrompt = $state('')

  const isPromptModified = $derived(
    currentSystemPrompt !== initialSystemPrompt ||
      currentUserPrompt !== initialUserPrompt,
  )

  $effect(() => {
    dirty = isPromptModified
  })

  const showEnhanceButton = $derived(
    currentUserPrompt.trim().split(/\s+/).filter(Boolean).length > 2,
  )

  // Scramble the title whenever the selected prompt changes
  $effect(() => {
    if (title && titleEl) {
      if (!ts) ts = new TextScramble(titleEl)
      ts.setText(title)
    }
  })

  const handlePromptEnhance = async () => {
    loading = true
    error = null
    const userPrompt = currentUserPrompt
    const prompt = aiPrompt.replace('{{userPrompt}}', userPrompt)

    try {
      const enhanced = await enhancePrompt(prompt)

      dataget = enhanced
    } catch (err) {
      error = err.message || 'An unknown error occurred.'
    } finally {
      loading = false
    }
  }

  const handleApplyPrompt = () => {
    currentUserPrompt = dataget
    isOpen = false
  }

  function loadPromptContent(key) {
    if (settings) {
      const systemPromptKey = key.replace(
        'CustomPromptContent',
        'CustomSystemInstructionContent',
      )
      initialSystemPrompt = settings[systemPromptKey] || ''
      initialUserPrompt = settings[key] || ''
      currentSystemPrompt = initialSystemPrompt
      currentUserPrompt = initialUserPrompt
    } else {
      console.log('Settings are not available yet.')
    }
  }

  $effect(() => {
    if (promptKey && settings) {
      loadPromptContent(promptKey)
    }
  })

  function handleSavePrompt() {
    updateSettings({
      [promptKey.replace(
        'CustomPromptContent',
        'CustomSystemInstructionContent',
      )]: currentSystemPrompt,
      [promptKey]: currentUserPrompt,
    })
    initialSystemPrompt = currentSystemPrompt
    initialUserPrompt = currentUserPrompt
    toast(CustomToast)
  }

  function handleDiscardChanges() {
    currentSystemPrompt = initialSystemPrompt
    currentUserPrompt = initialUserPrompt
  }

  // Combine all templates for the Load preset menu
  const allTemplates = [
    ...promptTemplates,
    {
      title: 'Analyze',
      systemInstruction: customActionTemplates.analyze.systemPrompt,
      userPrompt: customActionTemplates.analyze.userPrompt,
    },
    {
      title: 'Explain',
      systemInstruction: customActionTemplates.explain.systemPrompt,
      userPrompt: customActionTemplates.explain.userPrompt,
    },
    {
      title: 'Debate',
      systemInstruction: customActionTemplates.debate.systemPrompt,
      userPrompt: customActionTemplates.debate.userPrompt,
    },
    {
      title: 'YouTube Comment',
      systemInstruction: customActionTemplates.commentAnalysis.systemPrompt,
      userPrompt: customActionTemplates.commentAnalysis.userPrompt,
    },
    {
      title: 'Course Concepts',
      systemInstruction:
        customActionTemplates.courseConcepts?.systemPrompt || '',
      userPrompt: customActionTemplates.courseConcepts?.userPrompt || '',
    },
  ]

  // Loading a preset replaces both fields, so ask first when there are edits.
  function handleLoadPreset(template) {
    if (
      isPromptModified &&
      !confirm($t('prompts.confirm_discard'))
    ) {
      return
    }
    currentSystemPrompt = template.systemInstruction
    currentUserPrompt = template.userPrompt
  }

  $effect(() => {
    let fx
    if (isOpen) {
      let phrases = $t('prompts.tip')
      const el = document.querySelector('#scramble-info')
      if (el) {
        fx = new TextScramble(el)
        fx.play(phrases)
      }
    }
    return () => {
      fx?.stop()
    }
  })
</script>

<div
  class="relative mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 text-xs 2xl:text-sm text-text-primary"
>
  <h2 class="text-lg font-bold" bind:this={titleEl}>
    {title}
  </h2>

  <div class="flex flex-col pt-6 2xl:pt-7 gap-2 relative">
    <label
      for="currentSystemPrompt"
      class="text-text-secondary bg-blackwhite/5 rounded-t-lg top-0 px-2 pt-1 pb-5 absolute w-fit"
      >{$t('prompts.system_instruction')}</label
    >
    <div
      class="text-text-secondary absolute top-0 right-0 max-w-[55%] truncate"
    >
      {$t('prompts.system_note')}
    </div>
    <textarea
      id="currentSystemPrompt"
      class="textarea font-mono min-h-32 relative z-10 bg-white dark:bg-surface-1 border border-border w-full p-2 rounded-lg outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] transition-shadow focus:border-muted/60"
      bind:value={currentSystemPrompt}
      placeholder=""
    ></textarea>
  </div>

  <div
    class="flex flex-1 flex-col pt-6 2xl:pt-7 gap-2 relative min-h-[40vh] md:min-h-48"
  >
    <label
      for="currentUserPrompt"
      class="text-text-secondary bg-blackwhite/5 rounded-t-lg top-0 px-2 pt-1 pb-5 absolute w-fit"
      >{$t('prompts.user_prompt')}
    </label>
    <div
      class="text-text-secondary absolute top-0 right-0 max-w-[55%] truncate"
    >
      {$t('prompts.user_note')}
    </div>
    <textarea
      id="currentUserPrompt"
      class="textarea font-mono flex-1 min-h-40 relative z-10 bg-white dark:bg-surface-1 border border-border w-full p-2 rounded-lg outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] transition-shadow focus:border-muted/60"
      bind:value={currentUserPrompt}
      placeholder=""
    ></textarea>
    <!-- Floats over the textarea, so showing/hiding it never shifts layout -->
    {#if showEnhanceButton}
      <button
        onclick={() => {
          isOpen = true
          handlePromptEnhance()
        }}
        class="absolute bottom-4 right-4 z-20"
        title={$t('prompts.prompt_enhance')}
        aria-label={$t('prompts.buttons.improve')}
      >
        <div
          transition:slideScaleFade={{
            duration: 400,
            delay: 200,
            slideFrom: 'bottom',
            slideDistance: '0.5rem',
            startScale: 0.75,
          }}
          class="p-2 relative transition-colors overflow-hidden border border-primary/10 hover:border-primary/20 dark:border-border/70 dark:hover:border-gray-700 text-primary/90 hover:text-primary z-20 bg-radial from-orange-100 dark:from-gray-950 group to-orange-50 dark:to-surface-2 to-60% hover:bg-surface-2 rounded-full"
        >
          <div class="chip__filter overflow-hidden"></div>
          <Icon
            class="group-hover:rotate-12 group-hover:scale-150 ease-in-out transition-transform duration-300"
            icon="octicon:sparkle-fill-16"
            width="16"
            height="16"
          />
        </div>
      </button>
    {/if}
  </div>

  <EditorActionBar
    dirty={isPromptModified}
    onDiscard={handleDiscardChanges}
    onSave={handleSavePrompt}
  >
    {#snippet actions()}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <button
              type="button"
              class="relative shrink-0 overflow-hidden group"
              {...props}
            >
              <!-- Same look as the enabled Discard button next to it -->
              <div
                class="font-medium py-2 px-4 border transition-colors duration-200 bg-surface-2 group-hover:bg-surface-2/95 text-text-secondary border-border hover:border-gray-500/50 hover:text-text-primary dark:hover:text-white"
              >
                {$t('prompts.buttons.load_preset')}
              </div>
              <span
                class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 border-border group-hover:border-gray-500"
              ></span>
            </button>
          {/snippet}
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            class="bg-surface-1 dark:bg-surface-2 border border-border rounded-lg shadow-lg z-50 min-w-52 overflow-hidden"
            side="top"
            sideOffset={4}
            align="start"
            collisionPadding={8}
          >
            <div
              use:overlayScroll
              class="max-h-[min(18rem,var(--bits-floating-available-height,18rem))] overflow-y-auto py-1"
            >
            {#each allTemplates as template}
              <DropdownMenu.Item
                class="flex w-full items-center px-3 py-2 text-left text-sm text-text-primary whitespace-nowrap outline-hidden select-none cursor-pointer data-highlighted:bg-blackwhite/10 transition-colors"
                onSelect={() => handleLoadPreset(template)}
              >
                {template.title}
              </DropdownMenu.Item>
            {/each}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    {/snippet}
  </EditorActionBar>
</div>


<Dialog.Root bind:open={isOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fadeOnly></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      interactOutsideBehavior="ignore"
      class="outline-hidden fixed left-[50%] top-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-w-5xl z-50 translate-x-[-50%]"
    >
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:slideScaleFade>
            <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                onclick={() => (isOpen = false)}
                class="block size-3.5 bg-error rounded-full"
              >
                <Icon
                  class="text-red-800 transition-opacity duration-150"
                  width={14}
                  icon="heroicons:x-mark-16-solid"
                />
              </button>
            </div>
            <div
              class="relative font-mono rounded-lg text-text-primary dark:text-text-secondary text-xs bg-background dark:bg-surface-1 overflow-hidden border border-border w-full flex-shrink-0 flex flex-col"
            >
              <div
                class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
              >
                <p class="!text-center">{$t('prompts.prompt_enhance')}</p>
              </div>
              <div class="flex relative p-px gap-4 flex-col">
                <div class=" min-h-48 h-[calc(100vh-10rem)] max-h-[40rem]">
                  {#if loading}
                    <div
                      transition:slideScaleFade
                      class="flex absolute inset-0 items-center justify-center p-4"
                    >
                      <Icon
                        icon="svg-spinners:ring-resize"
                        class="text-4xl text-primary"
                      />
                    </div>
                  {/if}
                  {#if !loading}
                    {#if error}
                      <div
                        class="flex relative py-4 px-6 top-1/2 -translate-y-1/2 flex-co max-w-2xl mx-auto text-red-400 bg-red-500/10 border border-red-500/20"
                      >
                        <p class="text-sm">
                          <span class="font-bold block"
                            >Prompt enhancer error</span
                          >
                          {error}
                        </p>
                        <PlusIcon />
                      </div>
                    {:else}
                      <textarea
                        transition:fadeOnly
                        disabled
                        class="resize-none px-4 text-sm pt-6 pb-12 leading-normal outline-0 h-full overflow-auto w-full"
                        >{dataget}</textarea
                      >
                      <div
                        class="absolute bg-linear-to-t right-2 from-surface-1 to-surface-1/40 bottom-16 mask-t-from-50% h-8 backdrop-blur-[2px] w-full z-30 pointer-events-none"
                      ></div>
                    {/if}
                  {/if}
                </div>
                <div class="p-4 pt-0 flex justify-end gap-2">
                  <p
                    class="text-text-secondary mr-auto text-xs items-center flex"
                  >
                    <Icon
                      icon="heroicons-solid:light-bulb"
                      width="24"
                      height="24"
                      class="mr-1 -translate-y-0.5"
                    /><span id="scramble-info"></span>
                  </p>
                  <div class="flex gap-2 items-center">
                    <button
                      class=" relative overflow-hidden group"
                      onclick={() => (isOpen = false)}
                    >
                      <div
                        class=" font-medium py-2 px-4 border transition-colors duration-200 bg-surface-2 group-hover:bg-surface-2/95 dark:group-hover:surface-2/90 text-text-primary border-border hover:border-gray-500 dark:hover:text-white"
                      >
                        {$t('prompts.buttons.discard')}
                      </div>

                      <span
                        class="size-4 absolute z-10 -left-2 -bottom-2 border bg-background dark:bg-surface-1 rotate-45 transition-colors duration-200 border-border group-hover:border-gray-500"
                      ></span>
                    </button>
                    <button
                      class=" flex relative overflow-hidden group"
                      onclick={handleApplyPrompt}
                      disabled={loading}
                    >
                      <div
                        class=" font-medium py-2 px-4 border transition-colors duration-200 {!loading
                          ? 'bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white'
                          : ' bg-surface-2 dark:bg-surface-1 text-text-secondary border-border/40'}"
                      >
                        {$t('prompts.buttons.apply_prompt')}
                      </div>
                      <span
                        class="size-4 absolute z-10 -left-2 -bottom-2 border bg-background dark:bg-surface-1 rotate-45 transition-colors duration-200 {!loading
                          ? ' border-orange-400 group-hover:border-orange-300/75'
                          : ' border-border/40'}"
                      ></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
