<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import {
    promptTemplates,
    customActionTemplates,
  } from '@/lib/prompts/index.js'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import Icon from '@iconify/svelte'
  import PlusIcon from '@/components/icons/PlusIcon.svelte'
  import TextScramble from '@/lib/ui/textScramble.js'
  import PromptMenu from './PromptMenu.svelte'
  import CustomToast from '@/components/feedback/CustomToast.svelte'
  import Logdev from '@/components/settings/Logdev.svelte'
  import { Toaster, toast } from 'svelte-sonner'
  import {
    settings,
    loadSettings,
    updateSettings,
    subscribeToSettingsChanges,
  } from '@/stores/settingsStore.svelte.js'
  import {
    initializeTheme,
    subscribeToSystemThemeChanges,
    themeSettings, // Import đối tượng themeSettings
  } from '@/stores/themeStore.svelte.js'
  import '@fontsource-variable/geist-mono'
  import { Dialog } from 'bits-ui'
  import { slideScaleFade, fadeOnly } from '@/lib/ui/slideScaleFade.js'
  import { enhancePrompt } from '@/lib/api/api.js'
  import aiPrompt from '@/lib/prompts/templates/promptEnhance.js'

  let isOpen = $state(false) // State for the dialog
  let enhancedUserPrompt = $state('')
  let dataget = $state('')
  let error = $state(null)

  let loading = $state(false)

  const showEnhanceButton = $derived(
    currentUserPrompt.trim().split(/\s+/).filter(Boolean).length > 2,
  )

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

  const options = {
    scrollbars: {
      autoHide: 'never',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  $effect(() => {
    // Initialize OverlayScrollbars only on non-touch devices
    if (!isTouchDevice()) {
      initialize(document.body)
    }

    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    return () => {
      unsubscribeTheme()
    }
  })

  // Apply reduce motion setting to DOM
  $effect(() => {
    const _reduceMotion = settings.reduceMotion
    import('@/services/animationService.js').then(
      ({ applyReduceMotionToDOM }) => {
        applyReduceMotionToDOM()
      },
    )
  })

  let promptKey = $state('')
  let currentSystemPrompt = $state('')
  let currentUserPrompt = $state('')
  let initialSystemPrompt = $state('')
  let initialUserPrompt = $state('')

  const isPromptModified = $derived(
    currentSystemPrompt !== initialSystemPrompt ||
      currentUserPrompt !== initialUserPrompt,
  )

  let scrambleInterval
  let displayTitle = $state('')
  let ts = null
  let settingsLog = $state('')

  $effect(() => {
    if (promptKey) {
      const title = getPromptTitle(promptKey)
      if (!ts) {
        ts = new TextScramble(document.querySelector('#scramble-title'))
      }
      ts.setText(title)
    }
  })

  let summarizePrompts = $state({})
  let customActionPrompts = $state({})

  $effect(() => {
    summarizePrompts = {
      youtubeCustomPromptContent: $t(
        'settings.summary.custom_prompts.youtube_summary',
      ),
      webCustomPromptContent: $t('settings.summary.custom_prompts.web_summary'),
      courseSummaryCustomPromptContent: $t(
        'settings.summary.custom_prompts.course_summary',
      ),
      selectedTextCustomPromptContent: $t(
        'settings.summary.custom_prompts.selected_text',
      ),
    }
    customActionPrompts = {
      analyzeCustomPromptContent: $t('settings.summary.custom_prompts.analyze'),
      explainCustomPromptContent: $t('settings.summary.custom_prompts.explain'),
      debateCustomPromptContent: $t('settings.summary.custom_prompts.debate'),
      chapterCustomPromptContent: $t(
        'settings.summary.custom_prompts.youtube_chapter',
      ),
      commentCustomPromptContent: $t(
        'settings.summary.custom_prompts.youtube_comment',
      ),
      courseConceptsCustomPromptContent: $t(
        'settings.summary.custom_prompts.course_concepts',
      ),
    }
  })

  function getPromptTitle(key) {
    return summarizePrompts[key] || customActionPrompts[key] || 'Unknown Prompt'
  }

  function getPromptKeyFromTitle(title) {
    for (const key in summarizePrompts) {
      if (summarizePrompts[key] === title) {
        return key
      }
    }
    for (const key in customActionPrompts) {
      if (customActionPrompts[key] === title) {
        return key
      }
    }
    return ''
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

  loadSettings().then(() => {
    subscribeToSettingsChanges()
    const urlParams = new URLSearchParams(window.location.search)
    const keyFromUrl = urlParams.get('promptKey')
    if (keyFromUrl) {
      promptKey = keyFromUrl
      loadPromptContent(promptKey)
    }
  })

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

  function handlePromptMenuClick(key) {
    promptKey = key
    window.history.pushState({}, '', `?promptKey=${key}`)
  }

  let selectedTemplate = $state(null)

  function handleTemplateChange(event) {
    selectedTemplate = event.target.value
  }

  // Combine all templates for import dropdown
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

  function handleImportTemplate() {
    if (selectedTemplate) {
      const template = allTemplates.find((t) => t.title === selectedTemplate)
      if (template) {
        currentSystemPrompt = template.systemInstruction
        currentUserPrompt = template.userPrompt
      }
    }
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

<Toaster
  position="top-right"
  toastOptions={{
    unstyled: true,
  }}
/>
<main
  class="flex font-mono text-xs 2xl:text-sm relative p-8 min-w-4xl min-h-dvh bg-background text-text-primary"
>
  <!-- <Logdev /> -->
  <span
    class="absolute z-10 h-full min-h-lvh w-px bg-border/70 top-0 -translate-x-px left-8"
  ></span>
  <span
    class="absolute z-10 h-full min-h-lvh w-px bg-border/70 top-0 translate-x-px right-8"
  ></span>
  <span
    class="absolute z-20 h-full min-h-lvh w-px bg-border/70 top-0 -translate-x-px left-64"
  ></span>
  <span
    class="absolute z-10 h-px w-full min-w-lvw bg-border/70 top-8 -translate-y-px left-0"
  ></span>
  <span
    class="absolute z-10 h-px w-full min-w-lvw bg-border/70 bottom-8 translate-y-px left-0"
  ></span>
  <!-- Left Column: Prompt Menu -->
  <PromptMenu
    {promptKey}
    {summarizePrompts}
    {customActionPrompts}
    {handlePromptMenuClick}
  />

  <!-- Right Column: Prompt Editor -->
  <div
    class="flex-1 relative z-20 bg-white dark:bg-surface-1 p-4 flex flex-col gap-2"
  >
    <PlusIcon />
    {#if promptKey}
      <h2 class="text-lg font-bold mb-4" id="scramble-title">
        {getPromptTitle(promptKey)}
      </h2>

      <div class="flex flex-col pt-6 2xl:pt-7 gap-2 min-h-40 relative">
        <label
          for="currentSystemPrompt"
          class="text-text-secondary bg-blackwhite/5 rounded-t-lg top-0 px-2 pt-1 pb-5 absolute w-fit"
          >{$t('prompts.system_instruction')}</label
        >
        <div class=" text-text-secondary absolute top-0 right-0">
          {$t('prompts.system_note')}
        </div>
        <textarea
          id="currentSystemPrompt"
          class="textarea relative z-10 bg-white dark:bg-surface-1 border border-border h-full w-full mb-2 p-2 rounded-lg outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] transition-shadow focus:border-muted/60"
          bind:value={currentSystemPrompt}
          placeholder=""
        ></textarea>
      </div>

      <div class="flex flex-col h-full pt-6 2xl:pt-7 gap-2 min-h-48 relative">
        <label
          for="currentUserPrompt"
          class="text-text-secondary bg-blackwhite/5 rounded-t-lg top-0 px-2 pt-1 pb-5 absolute w-fit"
          >{$t('prompts.user_prompt')}
        </label>
        <div class=" text-text-secondary absolute top-0 right-0">
          {$t('prompts.user_note')}
          <!-- !Use the
          <code class="bg-blackwhite/5 px-1 py-0.5 rounded">__CONTENT__</code>
          to insert the dynamic content -->
        </div>
        <textarea
          id="currentUserPrompt"
          class="textarea relative z-10 bg-white dark:bg-surface-1 border border-border h-full w-full mb-2 p-2 rounded-lg outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] transition-shadow focus:border-muted/60"
          bind:value={currentUserPrompt}
          placeholder=""
        ></textarea>
        {#if showEnhanceButton}
          <button
            onclick={() => {
              isOpen = true
              handlePromptEnhance()
            }}
            class="absolute bottom-6 right-4"
            title={$t('prompts.prompt_enhance')}
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
      <div class="flex justify-between gap-2 mt-auto">
        <div class="flex gap-2 items-center">
          <!-- add key re render when promptKey Changes -->
          <select
            id="templateSelect"
            class="dark:bg-surface-1"
            onchange={handleTemplateChange}
          >
            <option value="" disabled selected class="dark:bg-surface-1">
              {$t('prompts.select_template')}</option
            >
            {#each allTemplates as template}
              <option value={template.title}>{template.title}</option>
            {/each}
          </select>
          <button
            class="relative shrink-0 overflow-hidden group"
            onclick={handleImportTemplate}
          >
            <div
              class="font-medium py-2 px-4 border border-transparent group-hover:border-border/40 transition-colors duration-200 group-hover:bg-surface-2 dark:group-hover:surface-2/90 hover:text-blackwhite"
            >
              {$t('prompts.buttons.import')}
            </div>

            <span
              class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 border-border/0 group-hover:border-border/40"
            ></span>
          </button>
        </div>
        <div class="flex gap-2 items-center">
          <button
            class=" relative overflow-hidden group"
            onclick={handleDiscardChanges}
          >
            <div
              class=" font-medium py-2 px-4 border transition-colors duration-200 {isPromptModified
                ? 'bg-surface-2 group-hover:bg-surface-2/95 dark:group-hover:surface-2/90  text-text-secondary border-border hover:border-gray-500/50 hover:text-text-primary dark:hover:text-white'
                : ' bg-white dark:bg-surface-1 text-text-secondary border-border/40'}"
            >
              {$t('prompts.buttons.discard')}
            </div>

            <span
              class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 {isPromptModified
                ? ' border-border group-hover:border-gray-500'
                : ' border-border/40'}"
            ></span>
          </button>
          <button
            class=" flex relative overflow-hidden group"
            onclick={handleSavePrompt}
            disabled={!isPromptModified}
          >
            <div
              class=" font-medium py-2 px-4 border transition-colors duration-200 {isPromptModified
                ? 'bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white'
                : ' bg-white dark:bg-surface-1 text-text-secondary border-border/40'}"
            >
              {$t('prompts.buttons.save')}
            </div>
            <span
              class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 {isPromptModified
                ? ' border-orange-400 group-hover:border-orange-300/75'
                : ' border-border/40'}"
            ></span>
          </button>
        </div>
      </div>
    {:else}
      <p class="text-text-secondary">
        Please select a prompt from the menu on the left.
      </p>
    {/if}
  </div>
</main>

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
