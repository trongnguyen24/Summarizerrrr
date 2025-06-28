<script>
  // @ts-nocheck
  import { promptTemplates } from '@/lib/promptTemplates.js'
  import PlusIcon from '@/components/PlusIcon.svelte'
  import TextScramble from '@/lib/textScramble.js'
  import CustomToast from '@/components/CustomToast.svelte'
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

  $effect(() => {
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
  let showSaveSuccessMessage = $state(false)
  let isPromptDirty = $state(false)

  let scrambleInterval
  let displayTitle = $state('')
  let ts = null
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
      initialSystemPrompt =
        settings[
          key.replace('CustomPromptContent', 'CustomSystemInstructionContent')
        ] || ''
      initialUserPrompt = settings[key] || ''
      currentSystemPrompt = initialSystemPrompt
      currentUserPrompt = initialUserPrompt
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
    showSaveSuccessMessage = true
    setTimeout(() => {
      showSaveSuccessMessage = false
    }, 3000) // Hide message after 3 seconds
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
  class="flex font-mono relative p-8 min-w-3xl min-h-screen bg-background text-text-primary"
>
  <span
    class="absolute z-10 h-lvh w-px bg-border/70 top-0 -translate-x-px left-8"
  ></span>
  <span
    class="absolute z-10 h-lvh w-px bg-border/70 top-0 translate-x-px right-8"
  ></span>
  <span
    class="absolute z-20 h-lvh w-px bg-border/70 top-0 -translate-x-px left-64"
  ></span>
  <span
    class="absolute z-10 h-px w-lvw bg-border/70 top-8 -translate-y-px left-0"
  ></span>
  <span
    class="absolute z-10 h-px w-lvw bg-border/70 bottom-8 translate-y-px left-0"
  ></span>
  <!-- Left Column: Prompt Menu -->
  <div
    class="w-56 relative z-20 bg-background overflow-hidden border-r border-border/70 flex flex-col"
  >
    <h2 class="text-lg p-4 font-bold">Prompt Categories</h2>
    <div class="flex flex-col px-2 text-muted gap-1">
      <button onclick={() => toast(CustomToast)}>Give me a toast</button>
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

  <!-- Right Column: Prompt Editor -->
  <div
    class="flex-1 relative z-20 bg-white dark:bg-surface-1 p-4 flex flex-col gap-2"
  >
    <PlusIcon />
    {#if promptKey}
      <h2 class="text-lg font-bold mb-4" id="scramble-title">
        {getPromptTitle(promptKey)}
      </h2>

      <label
        for="currentSystemPrompt"
        class="text-text-secondary inline-flex w-fit mb-1"
        >System Instruction</label
      >
      <textarea
        id="currentSystemPrompt"
        class="textarea outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] border min-h-48 transition-shadow border-border focus:border-muted/60 h-32 w-full mb-4 p-2 rounded-lg"
        bind:value={currentSystemPrompt}
        oninput={() => (isPromptDirty = true)}
        placeholder=""
      ></textarea>

      <label for="currentUserPrompt" class="text-text-secondary mb-1"
        >User Prompt - Use <code class="bg-blackwhite/5 px-1 py-0.5 rounded"
          >__CONTENT__</code
        > to insert the dynamic content (e.g., transcript, web page content...)</label
      >

      <textarea
        id="currentUserPrompt"
        class="textarea border border-border h-full w-full mb-2 p-2 rounded-lg outline-0 shadow-[0_0_0_0_var(--color-border)] min-h-48 focus:shadow-[0_0_0_3px_var(--color-border)] transition-shadow focus:border-muted/60"
        bind:value={currentUserPrompt}
        oninput={() => (isPromptDirty = true)}
        placeholder=""
      ></textarea>

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
          {#if showSaveSuccessMessage}
            <div class="text-green-500 flex items-center mr-4">Saved!</div>
          {/if}
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
