<script>
  // @ts-nocheck
  import { promptTemplates } from '@/lib/promptTemplates.js'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import Icon from '@iconify/svelte'
  import PlusIcon from '@/components/PlusIcon.svelte'
  import TextScramble from '@/lib/textScramble.js'
  import PromptMenu from './PromptMenu.svelte'
  import AIprompt from './AIprompt.svelte'
  import CustomToast from '@/components/CustomToast.svelte'
  import Logdev from '@/components/settings/Logdev.svelte'
  import { Toaster, toast } from 'svelte-sonner'
  import {
    settings,
    loadSettings,
    updateSettings,
    subscribeToSettingsChanges,
  } from '../../stores/settingsStore.svelte.js'
  import {
    initializeTheme,
    subscribeToSystemThemeChanges,
  } from '../../stores/themeStore.svelte.js'
  import '@fontsource-variable/geist-mono'

  const options = {
    scrollbars: {
      autoHide: 'never',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  $effect(() => {
    initialize(document.body)

    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    return () => {
      unsubscribeTheme()
    }
  })

  let promptKey = $state('')
  let currentSystemPrompt = $state('')
  let currentUserPrompt = $state('')
  let initialSystemPrompt = $state('')
  let initialUserPrompt = $state('')
  let isPromptDirty = $state(false)

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

  const promptTitles = {
    youtubeCustomPromptContent: 'Youtube Summary',
    chapterCustomPromptContent: 'Youtube Chapter',
    webCustomPromptContent: 'Web Summary',
    udemySummaryCustomPromptContent: 'Udemy Summary',
    udemyConceptsCustomPromptContent: 'Udemy Concepts',
    selectedTextCustomPromptContent: 'Selected Text',
  }

  function getPromptTitle(key) {
    return promptTitles[key] || 'Unknown Prompt'
  }

  function getPromptKeyFromTitle(title) {
    for (const key in promptTitles) {
      if (promptTitles[key] === title) {
        return key
      }
    }
    return ''
  }

  function loadPromptContent(key) {
    if (settings) {
      const systemPromptKey = key.replace(
        'CustomPromptContent',
        'CustomSystemInstructionContent'
      )
      initialSystemPrompt = settings[systemPromptKey] || ''
      initialUserPrompt = settings[key] || ''
      currentSystemPrompt = initialSystemPrompt
      currentUserPrompt = initialUserPrompt
    } else {
      console.log('Settings are not available yet.')
    }
  }

  function isPromptModified() {
    const modified =
      currentSystemPrompt !== initialSystemPrompt ||
      currentUserPrompt !== initialUserPrompt
    return modified
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
        'CustomSystemInstructionContent'
      )]: currentSystemPrompt,
      [promptKey]: currentUserPrompt,
    })
    initialSystemPrompt = currentSystemPrompt
    initialUserPrompt = currentUserPrompt
    isPromptDirty = false
    toast(CustomToast)
  }

  function handleDiscardChanges() {
    currentSystemPrompt = initialSystemPrompt
    currentUserPrompt = initialUserPrompt
    isPromptDirty = false
  }

  function handlePromptMenuClick(key) {
    promptKey = key
    window.history.pushState({}, '', `?promptKey=${key}`)
  }

  let selectedTemplate = $state(null)

  function handleTemplateChange(event) {
    selectedTemplate = event.target.value
  }

  function handleImportTemplate() {
    if (selectedTemplate) {
      const template = promptTemplates[promptKey].find(
        (t) => t.title === selectedTemplate
      )
      if (template) {
        currentSystemPrompt = template.systemInstruction
        currentUserPrompt = template.userPrompt
        isPromptDirty = true
      }
    }
  }
</script>

<Toaster
  position="top-right"
  toastOptions={{
    unstyled: true,
  }}
/>
<main
  class="flex font-mono relative p-8 min-w-4xl min-h-dvh bg-background text-text-primary"
>
  <Logdev />
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
  <PromptMenu {promptKey} {promptTitles} {handlePromptMenuClick} />

  <!-- Right Column: Prompt Editor -->
  <div
    class="flex-1 relative z-20 bg-white dark:bg-surface-1 p-4 flex flex-col gap-2"
  >
    <PlusIcon />
    {#if promptKey}
      <h2 class="text-lg font-bold mb-4" id="scramble-title">
        {getPromptTitle(promptKey)}
      </h2>

      <div class="flex flex-col pt-6 gap-2 min-h-40 relative">
        <label
          for="currentSystemPrompt"
          class="text-text-secondary bg-blackwhite/5 rounded-t-lg top-0 px-2 pt-1 pb-5 absolute w-fit"
          >System Instruction</label
        >
        <textarea
          id="currentSystemPrompt"
          class="textarea relative z-10 bg-white dark:bg-surface-1 border border-border h-full w-full mb-2 p-2 rounded-lg outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] transition-shadow focus:border-muted/60"
          bind:value={currentSystemPrompt}
          oninput={() => (isPromptDirty = true)}
          placeholder=""
        ></textarea>
      </div>

      <div class="flex flex-col h-full pt-6 gap-2 min-h-48 relative">
        <label
          for="currentUserPrompt"
          class="text-text-secondary bg-blackwhite/5 rounded-t-lg top-0 px-2 pt-1 pb-5 absolute w-fit"
          >User Prompt
        </label>
        <div class=" text-text-secondary absolute top-0 right-0">
          !Use the
          <code class="bg-blackwhite/5 px-1 py-0.5 rounded">__CONTENT__</code>
          to insert the dynamic content
        </div>
        <textarea
          id="currentUserPrompt"
          class="textarea relative z-10 bg-white dark:bg-surface-1 border border-border h-full w-full mb-2 p-2 rounded-lg outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] transition-shadow focus:border-muted/60"
          bind:value={currentUserPrompt}
          oninput={() => (isPromptDirty = true)}
          placeholder=""
        ></textarea>
        <AIprompt />
      </div>
      <div class="flex justify-between gap-2 mt-auto">
        <div class="flex gap-2 items-center">
          <!-- add key re render when promptKey Changes -->
          {#key promptKey}
            <select
              id="templateSelect"
              class="select select-bordered w-full p-1 outline-gray-500"
              onchange={handleTemplateChange}
            >
              <option value="" disabled selected>Select a template</option>
              {#each promptTemplates[promptKey] || [] as template}
                <option value={template.title}>{template.title}</option>
              {/each}
            </select>
          {/key}
          <button
            class="relative shrink-0 overflow-hidden group"
            onclick={handleImportTemplate}
          >
            <div
              class="font-medium py-2 px-4 border border-transparent group-hover:border-border/40 transition-colors duration-200 group-hover:bg-surface-2 dark:group-hover:surface-2/90 hover:text-white"
            >
              Import
            </div>

            <span
              class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 border-border/40"
            ></span>
          </button>
        </div>
        <div class="flex gap-2 items-center">
          <button
            class=" relative overflow-hidden group"
            onclick={handleDiscardChanges}
          >
            <div
              class=" font-medium py-2 px-4 border transition-colors duration-200 {isPromptModified()
                ? 'bg-surface-2 group-hover:bg-surface-2/95 dark:group-hover:surface-2/90 text-orange-50 dark:text-text-primary border-border hover:border-gray-500/50 hover:text-white'
                : ' bg-white dark:bg-surface-1 text-text-secondary border-border/40'}"
            >
              Discard
            </div>

            <span
              class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 {isPromptModified()
                ? ' border-border group-hover:border-gray-500'
                : ' border-border/40'}"
            ></span>
          </button>
          <button
            class=" flex relative overflow-hidden group"
            onclick={handleSavePrompt}
            disabled={!isPromptModified()}
          >
            <div
              class=" font-medium py-2 px-4 border transition-colors duration-200 {isPromptModified()
                ? 'bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white'
                : ' bg-white dark:bg-surface-1 text-text-secondary border-border/40'}"
            >
              Save
            </div>
            <span
              class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 {isPromptModified()
                ? ' border-orange-400 group-hover:border-orange-300/75'
                : ' border-border/40'}"
            ></span>
          </button>
        </div>
      </div>
    {:else}
      <p class="text-text-secondary">
        Vui lòng chọn một loại prompt từ menu bên trái để chỉnh sửa.
      </p>
    {/if}
  </div>
</main>

<style>
  textarea {
    resize: none;
  }
  textarea::-webkit-scrollbar {
    background-color: transparent;
    width: 6px;
    padding: 1px;
  }

  textarea::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: oklch(0.77 0.003 106.6 / 40%);
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background-color: oklch(0.77 0.003 106.6 / 60%);
  }
</style>
