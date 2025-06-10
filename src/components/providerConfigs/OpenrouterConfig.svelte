<!-- @ts-nocheck -->
<script>
  import { openrouterModelsConfig } from '../../lib/openrouterConfig.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js' // Chỉ import updateSettings
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import ReusableSelect from '../ReusableSelect.svelte'
  import ApiKeyInput from '../ApiKeyInput.svelte'

  let {
    openrouterApiKey = $bindable(),
    selectedOpenrouterModel = $bindable(), // Thêm lại selectedOpenrouterModel là bindable prop
  } = $props()

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedOpenrouterModel) {
    selectedOpenrouterModel =
      openrouterModelsConfig[Object.keys(openrouterModelsConfig)[0]].value
  }

  // Hàm onSave cho ApiKeyInput
  function handleOpenrouterApiKeySave(apiKey) {
    updateSettings({ openrouterApiKey: apiKey })
  }

  function handleOpenrouterModelChange(newValue) {
    selectedOpenrouterModel = newValue
  }

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
  <ApiKeyInput
    apiKey={openrouterApiKey}
    label="OpenRouter API Key"
    onSave={handleOpenrouterApiKeySave}
    linkHref="https://openrouter.ai/keys"
    linkText="Get a key"
  />
</div>
<div class="flex flex-col gap-2">
  <label for="Select OpenRouter Model" class="block">OpenRouter Model</label>
  <ReusableSelect
    items={openrouterModelItems}
    bindValue={selectedOpenrouterModel}
    ariaLabel="Select OpenRouter Model"
    onValueChangeCallback={handleOpenrouterModelChange}
  />
</div>
