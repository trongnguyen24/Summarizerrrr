<script>
  // @ts-nocheck
  import PlusIcon from '@/components/PlusIcon.svelte'
  import TextScramble from '@/lib/textScramble.js'
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
</script>

<main
  class="flex font-mono relative p-8 h-screen bg-background text-text-primary"
>
  <span class="fixed z-10 h-lvh w-px bg-border/70 top-0 left-8"></span>
  <span class="fixed z-10 h-lvh w-px bg-border/70 top-0 translate-x-px right-8"
  ></span>
  <span class="fixed z-10 h-lvh w-px bg-border/70 top-0 -translate-x-px left-64"
  ></span>
  <span class="fixed z-10 h-px w-lvw bg-border/70 top-8 -translate-y-px left-0"
  ></span>
  <span
    class="fixed z-10 h-px w-lvw bg-border/70 bottom-8 translate-y-px left-0"
  ></span>
  <!-- Left Column: Prompt Menu -->
  <div class="w-56 overflow-hidden flex flex-col">
    <h2 class="text-lg p-4 font-bold">Prompt Categories</h2>
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

  <!-- Right Column: Prompt Editor -->
  <div class="flex-1 relative bg-white dark:bg-surface-1 p-6 flex flex-col">
    <PlusIcon />
    {#if promptKey}
      <h2 class="text-2xl font-bold mb-4" id="scramble-title">
        {getPromptTitle(promptKey)}
      </h2>
      <label
        for="currentSystemPrompt"
        class="text-text-secondary inline-flex w-fit mb-2"
        >System Instruction</label
      >
      <textarea
        id="currentSystemPrompt"
        class="textarea outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] border min-h-16 transition-shadow border-border focus:border-muted/60 h-32 w-full mb-4 p-2 rounded-lg"
        bind:value={currentSystemPrompt}
        oninput={() => (isPromptDirty = true)}
        placeholder=""
      ></textarea>

      <label for="currentUserPrompt" class="text-text-secondary mb-2"
        >User Prompt - Use <code class="bg-blackwhite/5 px-1 py-0.5 rounded"
          >__CONTENT__</code
        > to insert the dynamic content (e.g., transcript, web page content...)</label
      >

      <textarea
        id="currentUserPrompt"
        class="textarea border border-border h-full w-full mb-4 p-2 rounded-lg outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] min-h-16 transition-shadow focus:border-muted/60"
        bind:value={currentUserPrompt}
        oninput={() => (isPromptDirty = true)}
        placeholder=""
      ></textarea>

      <div class="flex justify-end gap-2 mt-auto">
        {#if showSaveSuccessMessage}
          <div class="text-green-500 flex items-center mr-4">
            Đã lưu thành công!
          </div>
        {/if}
        <button
          class="py-2 px-4 bg-surface-1 dark:bg-surface-2"
          onclick={handleDiscardChanges}
        >
          Discard Changes
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
            Save Prompt
          </div>
          <span
            class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 {isPromptModified()
              ? ' border-orange-400 group-hover:border-orange-300/75'
              : ' border-border/40'}"
          ></span>
        </button>
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
</style>
