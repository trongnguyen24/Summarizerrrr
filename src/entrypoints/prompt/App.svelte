<script>
  // @ts-nocheck
  import PlusIcon from '@/components/PlusIcon.svelte'
  import {
    settings,
    loadSettings,
    updateSettings,
    subscribeToSettingsChanges,
  } from '../../stores/settingsStore.svelte.js'
  import '@fontsource-variable/geist-mono'

  let promptKey = $state('')
  let currentSystemPrompt = $state('')
  let currentUserPrompt = $state('')
  let initialSystemPrompt = $state('')
  let initialUserPrompt = $state('')
  let showSaveSuccessMessage = $state(false)

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

  $effect(() => {
    loadSettings().then(() => {
      subscribeToSettingsChanges()
      const urlParams = new URLSearchParams(window.location.search)
      const keyFromUrl = urlParams.get('promptKey')
      if (keyFromUrl) {
        promptKey = keyFromUrl
        loadPromptContent(promptKey)
      }
    })
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
    showSaveSuccessMessage = true
    setTimeout(() => {
      showSaveSuccessMessage = false
    }, 3000) // Hide message after 3 seconds
  }

  function handleDiscardChanges() {
    currentSystemPrompt = initialSystemPrompt
    currentUserPrompt = initialUserPrompt
  }

  function handlePromptMenuClick(key) {
    promptKey = key
    window.history.pushState({}, '', `?promptKey=${key}`)
  }
</script>

<main
  class="flex font-mono relative p-8 h-screen bg-background text-text-primary"
>
  <span class="fixed h-lvh w-px bg-border top-0 left-8"></span>
  <span class="fixed h-lvh w-px bg-border top-0 right-8"></span>
  <span class="fixed h-lvh w-px bg-border top-0 left-64"></span>
  <span class="fixed h-px w-lvw bg-border top-8 left-0"></span>
  <span class="fixed h-px w-lvw bg-border bottom-8 left-0"></span>
  <!-- Left Column: Prompt Menu -->
  <div class="w-56 border border-gray-200 border-r-0 flex flex-col">
    <h2 class="text-lg p-4 font-bold">Prompt Categories</h2>
    <div class="flex flex-col text-muted gap-1">
      {#each Object.entries(promptTitles) as [key, title]}
        <button
          class=" py-1 px-4 {promptKey === key
            ? 'text-text-primary'
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
    class="flex-1 relative bg-white border border-gray-200 p-6 flex flex-col"
  >
    <PlusIcon />
    {#if promptKey}
      <h2 class="text-2xl font-bold mb-4">{getPromptTitle(promptKey)}</h2>
      <label
        for="currentSystemPrompt"
        class="text-text-secondary inline-flex w-fit mb-2"
        >System Instruction:</label
      >
      <textarea
        id="currentSystemPrompt"
        class="textarea outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] border min-h-16 transition-shadow border-border focus:border-muted/60 h-32 w-full mb-4 p-2 rounded-lg"
        bind:value={currentSystemPrompt}
        placeholder="Ví dụ: Bạn là một trợ lý tóm tắt chuyên nghiệp..."
      ></textarea>

      <label for="currentUserPrompt" class="text-text-secondary mb-2"
        >User Prompt:</label
      >
      <textarea
        id="currentUserPrompt"
        class="textarea border border-border h-full w-full mb-4 p-2 rounded-md outline-0 shadow-[0_0_0_0_var(--color-border)] focus:shadow-[0_0_0_3px_var(--color-border)] min-h-16 transition-shadow focus:border-muted/60"
        bind:value={currentUserPrompt}
        placeholder="Ví dụ: Tóm tắt nội dung sau đây: (sử dụng để chèn nội dung cần tóm tắt)"
      ></textarea>

      <div class="flex justify-end gap-2 mt-auto">
        {#if showSaveSuccessMessage}
          <div class="text-green-500 flex items-center mr-4">
            Đã lưu thành công!
          </div>
        {/if}
        <button class="btn variant-filled" onclick={handleDiscardChanges}>
          Discard Changes
        </button>
        <button class="btn variant-filled-primary" onclick={handleSavePrompt}>
          Save
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
</style>
