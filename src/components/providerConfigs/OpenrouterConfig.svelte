<!-- @ts-nocheck -->
<script>
  import { openrouterModelsConfig } from '../../lib/openrouterConfig.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js'

  let {
    openrouterApiKey = $bindable(),
    selectedOpenrouterModel = $bindable(),
  } = $props()

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
</script>

<div class="provider-config">
  <label for="openrouter-api-key">OpenRouter API Key:</label>
  <input
    type="password"
    id="openrouter-api-key"
    bind:value={openrouterApiKey}
    placeholder="Enter your OpenRouter API Key"
  />

  <label for="openrouter-model-select">Select OpenRouter Model:</label>
  <select id="openrouter-model-select" bind:value={selectedOpenrouterModel}>
    {#each Object.entries(openrouterModelsConfig) as [modelId, modelConfig]}
      <option value={modelId}>{modelConfig.name || modelId}</option>
    {/each}
  </select>
</div>

<style>
  .provider-config {
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 5px;
    background-color: #f9f9f9;
  }

  .provider-config label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .provider-config input[type='password'],
  .provider-config select {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid #ddd;
    border-radius: 3px;
  }
</style>
