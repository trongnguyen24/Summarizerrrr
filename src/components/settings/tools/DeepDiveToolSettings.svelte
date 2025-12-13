<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import Icon from '@iconify/svelte'
  import ToolProvidersSelect from '@/components/inputs/ToolProvidersSelect.svelte'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'
  import ToolIcon96 from '@/components/ui/ToolIcon96.svelte'
  import ToolEnableToggle from '@/components/inputs/ToolEnableToggle.svelte'

  // Tool-specific provider configs
  import ToolGeminiAdvancedConfig from '@/components/providerConfigs/tools/ToolGeminiAdvancedConfig.svelte'
  import ToolChatGPTConfig from '@/components/providerConfigs/tools/ToolChatGPTConfig.svelte'
  import ToolDeepseekConfig from '@/components/providerConfigs/tools/ToolDeepseekConfig.svelte'
  import ToolGroqConfig from '@/components/providerConfigs/tools/ToolGroqConfig.svelte'
  import ToolOllamaConfig from '@/components/providerConfigs/tools/ToolOllamaConfig.svelte'
  import ToolLMStudioConfig from '@/components/providerConfigs/tools/ToolLMStudioConfig.svelte'
  import ToolOpenrouterConfig from '@/components/providerConfigs/tools/ToolOpenrouterConfig.svelte'
  import ToolOpenAICompatibleConfig from '@/components/providerConfigs/tools/ToolOpenAICompatibleConfig.svelte'
  import ToolCerebrasConfig from '@/components/providerConfigs/tools/ToolCerebrasConfig.svelte'

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
      updates.customModel = 'gemma-3-27b-it'
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
      gemini: 'gemma-3-27b-it',
      chatgpt: 'gpt-5-mini',
      deepseek: 'deepseek-chat',
      groq: 'moonshotai/kimi-k2-instruct',
      ollama: 'deepseek-r1:8b',
      lmstudio: 'google/gemma-3-12b',
      openrouter: 'google/gemma-3-27b-it:free',
      openaiCompatible: '',
      cerebras: 'llama-3.3-70b',
    }

    updateSettings({
      tools: {
        ...settings.tools,
        deepDive: {
          ...settings.tools.deepDive,
          customProvider: newProvider,
          customModel: defaultModels[newProvider] || 'gemma-3-27b-it',
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

<div class="flex flex-col gap-8 p-6">
  <!-- Tool Header/Introduction -->
  <div class="flex gap-4">
    <div class="size-24 bg-background shrink-0 overflow-hidden relative">
      <ToolIcon96 animated={toolSettings.enabled} />
      <Icon
        icon="heroicons:sparkles-solid"
        class="size-8 center-abs text-muted dark:text-text-primary dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
      />
    </div>

    <div class="text-left">
      <div class="font-bold text-text-primary text-xs">
        {$t('settings.tools.deepdive.title')}
      </div>
      <div class="text-xs mt-2 pb-3 text-text-secondary text-pretty">
        {$t('settings.tools.deepdive.description')}
      </div>
      <!-- Enable Tool Toggle -->
      <ToolEnableToggle
        id="deepdive-enabled"
        bind:checked={toolSettings.enabled}
        onCheckedChange={(value) => updateToolSetting('enabled', value)}
        icon="heroicons:cpu-chip-20-solid"
        enabledText={$t('settings.tools.deepdive.enabled')}
        disabledText={$t('settings.tools.deepdive.disabled')}
      />
    </div>
  </div>

  {#if toolSettings.enabled}
    <!-- Provider Mode Selection -->
    <div>
      <label class="text-text-primary"
        >{$t('settings.tools.deepdive.provider_label')}</label
      >
      <p class="mt-2 text-muted">
        {$t('settings.tools.deepdive.provider_description')}
      </p>
      <div class="grid mt-3 grid-cols-2 gap-2">
        <ButtonSet
          title={$t('settings.tools.deepdive.gemini_basic')}
          class="setting-btn {toolSettings.useGeminiBasic ? 'active' : ''}"
          onclick={() => toggleProviderMode(true)}
          Description={$t('settings.tools.deepdive.gemini_basic_description')}
        >
          <Icon icon="heroicons:sparkles" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title={$t('settings.tools.deepdive.custom_provider')}
          class="setting-btn {!toolSettings.useGeminiBasic ? 'active' : ''}"
          onclick={() => toggleProviderMode(false)}
          Description={$t(
            'settings.tools.deepdive.custom_provider_description',
          )}
        >
          <Icon icon="heroicons:cog-6-tooth" width="16" height="16" />
        </ButtonSet>
      </div>
    </div>

    {#if !toolSettings.useGeminiBasic}
      <!-- Custom Provider Configuration -->
      <div class="flex flex-col gap-4">
        <!-- Provider Select -->
        <div class="flex flex-col gap-2">
          <label class="text-text-secondary"
            >{$t('settings.tools.deepdive.select_provider_label')}</label
          >
          <ToolProvidersSelect
            bind:value={toolSettings.customProvider}
            onchange={handleProviderChange}
          />
        </div>

        <!-- ✅ INFO: API keys editable and update global settings -->
        <div class="text-xs text-muted flex gap-1 -mt-2">
          <Icon
            class=" shrink-0"
            icon="heroicons:information-circle"
            width="16"
            height="16"
          />
          <span>{$t('settings.tools.deepdive.api_keys_info')}</span>
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
          {:else if toolSettings.customProvider === 'cerebras'}
            <ToolCerebrasConfig
              bind:apiKey={settings.cerebrasApiKey}
              selectedModel={toolSettings.customModel || ''}
              onModelChange={handleModelChange}
            />
          {/if}
        {/key}
      </div>
    {/if}

    <!-- Auto Generate Mode -->
    <div>
      <label class=" text-text-primary"
        >{$t('settings.tools.deepdive.generation_mode_label')}</label
      >
      <p class="mt-2 text-muted">
        {$t('settings.tools.deepdive.generation_mode_description')}
      </p>
      <div class="grid mt-3 grid-cols-2 gap-2">
        <ButtonSet
          title={$t('settings.tools.deepdive.manual_mode')}
          class="setting-btn {!toolSettings.autoGenerate ? 'active' : ''}"
          onclick={() => toggleAutoGenerate(false)}
          Description={$t('settings.tools.deepdive.manual_mode_description')}
        >
          <Icon icon="heroicons:hand-raised" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title={$t('settings.tools.deepdive.auto_mode')}
          class="setting-btn {toolSettings.autoGenerate ? 'active' : ''}"
          onclick={() => toggleAutoGenerate(true)}
          Description={$t('settings.tools.deepdive.auto_mode_description')}
        >
          <Icon icon="heroicons:bolt" width="16" height="16" />
        </ButtonSet>
      </div>
    </div>
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
