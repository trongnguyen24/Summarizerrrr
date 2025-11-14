<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import { Switch, Label } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import ToolProvidersSelect from '@/components/inputs/ToolProvidersSelect.svelte'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'

  // Tool-specific provider configs
  import ToolGeminiAdvancedConfig from '@/components/providerConfigs/tools/ToolGeminiAdvancedConfig.svelte'
  import ToolChatGPTConfig from '@/components/providerConfigs/tools/ToolChatGPTConfig.svelte'
  import ToolDeepseekConfig from '@/components/providerConfigs/tools/ToolDeepseekConfig.svelte'
  import ToolGroqConfig from '@/components/providerConfigs/tools/ToolGroqConfig.svelte'
  import ToolOllamaConfig from '@/components/providerConfigs/tools/ToolOllamaConfig.svelte'
  import ToolLMStudioConfig from '@/components/providerConfigs/tools/ToolLMStudioConfig.svelte'
  import ToolOpenrouterConfig from '@/components/providerConfigs/tools/ToolOpenrouterConfig.svelte'
  import ToolOpenAICompatibleConfig from '@/components/providerConfigs/tools/ToolOpenAICompatibleConfig.svelte'

  // ✅ Computed value cho tool settings
  let toolSettings = $derived.by(() => settings.tools?.deepDive ?? {})

  /**
   * Helper function để update tool setting
   */
  function updateToolSetting(key, value) {
    updateSettings({
      tools: {
        ...settings.tools,
        deepDive: {
          ...settings.tools.deepDive,
          [key]: value,
        },
      },
    })
  }

  /**
   * Toggle provider mode với proper initialization
   */
  function toggleProviderMode(useBasic) {
    const updates = { useGeminiBasic: useBasic }

    // Initialize custom provider if switching to custom mode
    if (!useBasic && !settings.tools.deepDive.customProvider) {
      updates.customProvider = settings.selectedProvider || 'gemini'
      updates.customModel = 'gemini-2.5-flash-lite'
    }

    updateSettings({
      tools: {
        ...settings.tools,
        deepDive: {
          ...settings.tools.deepDive,
          ...updates,
        },
      },
    })
  }

  /**
   * Handle provider change - reset model khi đổi provider
   */
  function handleProviderChange(event) {
    const newProvider = event.detail

    // Reset model về default của provider mới
    const defaultModels = {
      gemini: 'gemini-2.5-flash-lite-preview-06-17',
      chatgpt: 'gpt-5-mini',
      deepseek: 'deepseek-chat',
      groq: 'moonshotai/kimi-k2-instruct',
      ollama: 'deepseek-r1:8b',
      lmstudio: 'google/gemma-3-12b',
      openrouter: 'google/gemma-3-27b-it:free',
      openaiCompatible: '',
    }

    updateSettings({
      tools: {
        ...settings.tools,
        deepDive: {
          ...settings.tools.deepDive,
          customProvider: newProvider,
          customModel:
            defaultModels[newProvider] || 'gemini-2.5-flash-lite-preview-06-17',
        },
      },
    })
  }

  /**
   * Handle model change - update tool settings only
   */
  function handleModelChange(newModel) {
    updateToolSetting('customModel', newModel)
  }

  /**
   * Toggle auto generate mode
   */
  function toggleAutoGenerate(value) {
    updateToolSetting('autoGenerate', value)
  }
</script>

<div class="flex flex-col gap-4">
  <!-- Enable Tool Toggle -->
  <div class="flex items-center justify-between">
    <Label.Root for="deepdive-enabled" class="text-text-secondary">
      Enable Deep Dive
    </Label.Root>
    <Switch.Root
      id="deepdive-enabled"
      checked={toolSettings.enabled}
      onCheckedChange={(value) => updateToolSetting('enabled', value)}
      class="focus-visible:ring-primary border border-blackwhite/5 text-text-secondary flex justify-center items-center bg-blackwhite/5 hover:bg-blackwhite/10 transition-colors rounded-full size-7.5"
    >
      <Switch.Thumb
        class="bg-primary rounded-full block size-7.5 transition-all duration-300 data-[state=checked]:scale-100 data-[state=unchecked]:scale-0"
      />
    </Switch.Root>
  </div>

  {#if toolSettings.enabled}
    <!-- Provider Mode Selection -->
    <div class="flex flex-col gap-2">
      <label class="text-text-secondary">Provider Mode</label>
      <div class="grid grid-cols-2 gap-2">
        <ButtonSet
          title="Use Gemini Basic"
          class="setting-btn {toolSettings.useGeminiBasic ? 'active' : ''}"
          onclick={() => toggleProviderMode(true)}
          Description="Fast and efficient for question generation"
        >
          <Icon icon="heroicons:sparkles" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title="Custom Provider"
          class="setting-btn {!toolSettings.useGeminiBasic ? 'active' : ''}"
          onclick={() => toggleProviderMode(false)}
          Description="Use your configured AI provider"
        >
          <Icon icon="heroicons:cog-6-tooth" width="16" height="16" />
        </ButtonSet>
      </div>
    </div>

    {#if !toolSettings.useGeminiBasic}
      <!-- Custom Provider Configuration -->
      <div class="flex flex-col gap-4 p-4 bg-surface-2 rounded-md">
        <!-- Provider Select -->
        <div class="flex flex-col gap-2">
          <label class="text-text-secondary">Select Provider</label>
          <ToolProvidersSelect
            bind:value={toolSettings.customProvider}
            onchange={handleProviderChange}
          />
        </div>

        <!-- ✅ INFO: API keys editable and update global settings -->
        <div class="text-xs text-text-secondary flex items-center gap-1 -mt-2">
          <Icon icon="heroicons:information-circle" width="16" height="16" />
          <span
            >API keys are shared with Summary settings. Models are
            tool-specific.</span
          >
        </div>

        <!-- Dynamic Provider Config (tool-specific components) -->
        <!-- ✅ API keys editable → update global, Models → update tool settings -->
        {#key toolSettings.customProvider}
          {#if toolSettings.customProvider === 'gemini'}
            <ToolGeminiAdvancedConfig
              bind:apiKey={settings.geminiAdvancedApiKey}
              selectedModel={toolSettings.customModel || ''}
              onModelChange={handleModelChange}
            />
          {:else if toolSettings.customProvider === 'chatgpt'}
            <ToolChatGPTConfig
              bind:apiKey={settings.chatgptApiKey}
              selectedModel={toolSettings.customModel || ''}
              onModelChange={handleModelChange}
            />
          {:else if toolSettings.customProvider === 'deepseek'}
            <ToolDeepseekConfig
              bind:apiKey={settings.deepseekApiKey}
              selectedModel={toolSettings.customModel || ''}
              onModelChange={handleModelChange}
            />
          {:else if toolSettings.customProvider === 'groq'}
            <ToolGroqConfig
              bind:apiKey={settings.groqApiKey}
              selectedModel={toolSettings.customModel || ''}
              onModelChange={handleModelChange}
            />
          {:else if toolSettings.customProvider === 'ollama'}
            <ToolOllamaConfig
              selectedModel={toolSettings.customModel || ''}
              onModelChange={handleModelChange}
            />
          {:else if toolSettings.customProvider === 'lmstudio'}
            <ToolLMStudioConfig
              selectedModel={toolSettings.customModel || ''}
              onModelChange={handleModelChange}
            />
          {:else if toolSettings.customProvider === 'openrouter'}
            <ToolOpenrouterConfig
              bind:apiKey={settings.openrouterApiKey}
              selectedModel={toolSettings.customModel || ''}
              onModelChange={handleModelChange}
            />
          {:else if toolSettings.customProvider === 'openaiCompatible'}
            <ToolOpenAICompatibleConfig
              bind:apiKey={settings.openaiCompatibleApiKey}
              selectedModel={toolSettings.customModel || ''}
              onModelChange={handleModelChange}
            />
          {/if}
        {/key}
      </div>
    {/if}

    <!-- Auto Generate Mode -->
    <div class="flex flex-col gap-2">
      <label class="text-text-secondary">Question Generation Mode</label>
      <div class="grid grid-cols-2 gap-2">
        <ButtonSet
          title="Manual"
          class="setting-btn {!toolSettings.autoGenerate ? 'active' : ''}"
          onclick={() => toggleAutoGenerate(false)}
          Description="Generate questions manually when needed"
        >
          <Icon icon="heroicons:hand-raised" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title="Auto"
          class="setting-btn {toolSettings.autoGenerate ? 'active' : ''}"
          onclick={() => toggleAutoGenerate(true)}
          Description="Automatically generate after summary completes"
        >
          <Icon icon="heroicons:bolt" width="16" height="16" />
        </ButtonSet>
      </div>
    </div>

    <!-- Default Chat Provider -->
    <!-- <div class="flex flex-col gap-2">
      <label class="text-text-secondary">Default Chat Provider</label>
      <div class="grid grid-cols-2 gap-2">
        <ButtonSet
          title="Gemini"
          class="setting-btn {toolSettings.defaultChatProvider === 'gemini'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('defaultChatProvider', 'gemini')}
        />
        <ButtonSet
          title="ChatGPT"
          class="setting-btn {toolSettings.defaultChatProvider === 'chatgpt'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('defaultChatProvider', 'chatgpt')}
        />
        <ButtonSet
          title="Perplexity"
          class="setting-btn {toolSettings.defaultChatProvider === 'perplexity'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('defaultChatProvider', 'perplexity')}
        />
        <ButtonSet
          title="Grok"
          class="setting-btn {toolSettings.defaultChatProvider === 'grok'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('defaultChatProvider', 'grok')}
        />
      </div>
    </div> -->
  {/if}
</div>

<style>
  .setting-btn {
    transition: all 0.2s ease;
  }

  .setting-btn.active {
    background-color: var(--color-surface-2);
    border-color: var(--color-border);
  }
</style>
