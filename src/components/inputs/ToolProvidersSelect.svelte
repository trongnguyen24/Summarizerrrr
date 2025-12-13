<script>
  // @ts-nocheck
  import ReusableSelect from '../inputs/ReusableSelect.svelte'

  // ✅ Component riêng cho tool settings - KHÔNG modify global settings
  const providers = [
    { value: 'cerebras', label: 'Cerebras' },
    { value: 'chatgpt', label: 'ChatGPT' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'groq', label: 'Groq' },
    { value: 'lmstudio', label: 'LM Studio' },
    { value: 'ollama', label: 'Ollama' },
    { value: 'openaiCompatible', label: 'OpenAI Compatible' },
    { value: 'openrouter', label: 'OpenRouter' },
  ]

  let { value = $bindable(), onchange } = $props()

  function handleChange(newValue) {
    value = newValue

    // ✅ Dispatch event thay vì update global settings
    if (onchange) {
      const event = new CustomEvent('change', { detail: newValue })
      onchange(event)
    }
  }
</script>

<ReusableSelect
  items={providers}
  bindValue={value}
  defaultLabel="Google Gemini"
  ariaLabel="Select a provider for this tool"
  className="provider"
  onValueChangeCallback={handleChange}
/>
