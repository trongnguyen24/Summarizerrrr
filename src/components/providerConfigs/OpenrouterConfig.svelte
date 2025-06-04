<!-- @ts-nocheck -->
<script>
  import { openrouterModelsConfig } from '../../lib/openrouterConfig.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js'
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte' // Giả định đường dẫn này, sẽ điều chỉnh nếu cần
  import ReusableSelect from '../ReusableSelect.svelte'

  let {
    openrouterApiKey = $bindable(),
    selectedOpenrouterModel = $bindable(),
  } = $props()

  let saveStatus = $state(false)
  let showApiKey = $state(false)
  let saveTimeoutId

  function scheduleOpenrouterApiKeySave() {
    clearTimeout(saveTimeoutId)
    saveTimeoutId = setTimeout(() => {
      updateSettings({ openrouterApiKey: openrouterApiKey.trim() })
      saveStatus = true
      setTimeout(() => (saveStatus = false), 2000) // Ẩn trạng thái lưu sau 2 giây
    }, 500) // Lưu sau 500ms không có đầu vào
  }

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedOpenrouterModel) {
    selectedOpenrouterModel = Object.keys(openrouterModelsConfig)[0]
  }

  // Sử dụng $effect để lưu API key khi nó thay đổi
  $effect(() => {
    updateSettings({ openrouterApiKey: openrouterApiKey.trim() })
  })

  // Sử dụng $effect để lưu model khi nó thay đổi
  $effect(() => {
    updateSettings({ selectedOpenrouterModel })
  })

  const openrouterModelItems = $derived(
    Object.entries(openrouterModelsConfig).map(([modelId, modelConfig]) => ({
      value: modelId,
      label: modelConfig.name || modelId,
    }))
  )
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center gap-1 justify-between">
    <label for="openrouter-api-key" class="block dark:text-muted"
      >OpenRouter API Key</label
    >
    {#if saveStatus}
      <p id="save-status" transition:fade class="text-success flex mr-auto">
        Auto saved!
      </p>
    {/if}
    <a
      href="https://openrouter.ai/keys"
      target="_blank"
      class="text-xs flex items-center gap-0.5 text-primary hover:underline"
      >Get a key <Icon width={12} icon="heroicons:arrow-up-right-16-solid" /></a
    >
  </div>

  <div class="relative">
    <input
      type={showApiKey ? 'text' : 'password'}
      id="openrouter-api-key"
      bind:value={openrouterApiKey}
      class="w-full pl-3 pr-9 py-1.5 h-10 bg-surface-1/50 border border-border focus:outline-none focus:ring-1 placeholder:text-muted"
      oninput={scheduleOpenrouterApiKeySave}
    />
    <button
      class="absolute size-8 text-muted right-0.5 top-1 grid place-items-center cursor-pointer"
      onclick={() => (showApiKey = !showApiKey)}
      tabindex="0"
      aria-label={showApiKey ? 'Hide API Key' : 'Show API Key'}
      onkeypress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          showApiKey = !showApiKey
        }
      }}
    >
      {#if !showApiKey}
        <Icon class="absolute" width={16} icon="heroicons:eye-slash-16-solid" />
      {:else}
        <Icon class="absolute" width={16} icon="heroicons:eye-16-solid" />
      {/if}
    </button>
  </div>
</div>
<div class="flex flex-col gap-2">
  <label for="Select OpenRouter Model" class="block text-text-primary font-bold"
    >OpenRouter Model</label
  >
  <ReusableSelect
    items={openrouterModelItems}
    bindValue={selectedOpenrouterModel}
    defaultLabel="Select OpenRouter Model"
    ariaLabel="Select OpenRouter Model"
    className="openrouter-model-select"
  />
</div>
