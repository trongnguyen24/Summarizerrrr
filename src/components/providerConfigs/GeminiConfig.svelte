<script>
  import { geminiModelsConfig } from '../../lib/geminiConfig.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js'

  let { geminiApiKey = $bindable(), selectedGeminiModel = $bindable() } =
    $props()

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedGeminiModel) {
    selectedGeminiModel = Object.keys(geminiModelsConfig)[0]
  }

  // Sử dụng $effect để lưu API key khi nó thay đổi
  $effect(() => {
    updateSettings({ geminiApiKey: geminiApiKey.trim() })
  })

  // Sử dụng $effect để lưu model khi nó thay đổi
  $effect(() => {
    updateSettings({ selectedGeminiModel })
  })
</script>

<div class="provider-config">
  <label for="gemini-api-key">Gemini API Key:</label>
  <input
    type="password"
    id="gemini-api-key"
    bind:value={geminiApiKey}
    placeholder="Enter your Gemini API Key"
  />

  <label for="gemini-model-select">Select Gemini Model:</label>
  <select id="gemini-model-select" bind:value={selectedGeminiModel}>
    {#each Object.entries(geminiModelsConfig) as [modelId, modelConfig]}
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
