<script>
  // @ts-nocheck
  import {
    settings,
    loadSettings,
    updateSettings,
    subscribeToSettingsChanges,
  } from '../../stores/settingsStore.svelte.js'

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

<main class="flex h-screen bg-background text-text-primary">
  <!-- Left Column: Prompt Menu -->
  <div class="w-1/4 border-r border-border p-4 flex flex-col gap-2">
    <h2 class="text-lg font-bold mb-4">Prompt Categories</h2>
    {#each Object.entries(promptTitles) as [key, title]}
      <button
        class="btn {promptKey === key
          ? 'variant-filled-primary'
          : 'variant-ghost'} w-full text-left"
        onclick={() => handlePromptMenuClick(key)}
      >
        {title}
      </button>
    {/each}
  </div>

  <!-- Right Column: Prompt Editor -->
  <div class="flex-1 p-6 flex flex-col">
    {#if promptKey}
      <h2 class="text-2xl font-bold mb-4">{getPromptTitle(promptKey)}</h2>
      <p class="text-text-secondary mb-4">
        Nhập System Instruction (lời nhắc hệ thống) của bạn:
      </p>
      <textarea
        class="textarea border border-border h-32 bg-surface-1 w-full mb-4 p-2 rounded-md"
        bind:value={currentSystemPrompt}
        placeholder="Ví dụ: Bạn là một trợ lý tóm tắt chuyên nghiệp..."
      ></textarea>

      <p class="text-text-secondary mb-4">
        Nhập User Prompt (lời nhắc người dùng) của bạn:
      </p>
      <textarea
        class="textarea border border-border h-full bg-surface-1 w-full mb-4 p-2 rounded-md"
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
