<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import { Switch, Label } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import ToolProvidersSelect from '@/components/inputs/ToolProvidersSelect.svelte'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'

  // Provider configs (reuse existing components)
  import GeminiAdvancedConfig from '@/components/providerConfigs/GeminiAdvancedConfig.svelte'
  import OpenrouterConfig from '@/components/providerConfigs/OpenrouterConfig.svelte'
  import ChatGPTConfig from '@/components/providerConfigs/ChatGPTConfig.svelte'
  import DeepseekConfig from '@/components/providerConfigs/DeepseekConfig.svelte'
  import GroqConfig from '@/components/providerConfigs/GroqConfig.svelte'
  import OllamaConfig from '@/components/providerConfigs/OllamaConfig.svelte'
  import LMStudioConfig from '@/components/providerConfigs/LMStudioConfig.svelte'

  // ✅ Computed value cho tool settings
  let toolSettings = $derived.by(() => settings.tools?.deepDive ?? {})

  /**
   * Local state for custom model to handle bind: directives
   * Simplified from complex dual $effect pattern
   */
  let customModelProxy = $state(toolSettings.customModel || '')

  /**
   * Single effect to sync model changes in both directions
   * Prevents infinite loops by checking if values actually changed
   */
  $effect(() => {
    const settingsModel = toolSettings.customModel || ''
    const proxyModel = customModelProxy || ''

    // Sync FROM settings TO proxy (when settings change externally)
    if (settingsModel !== proxyModel && settingsModel !== '') {
      customModelProxy = settingsModel
    }
    // Sync FROM proxy TO settings (when user changes model in UI)
    else if (proxyModel !== settingsModel && proxyModel !== '') {
      updateToolSetting('customModel', proxyModel)
    }
  })

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
      updates.customModel = 'gemini-2.5-flash'
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
      gemini: 'gemini-2.5-flash',
      openrouter: 'deepseek/deepseek-r1-0528:free',
      chatgpt: 'gpt-5-mini',
      deepseek: 'deepseek-chat',
      groq: 'moonshotai/kimi-k2-instruct',
      ollama: 'deepseek-r1:8b',
      lmstudio: 'lmstudio-community/gemma-2b-it-GGUF',
    }

    updateSettings({
      tools: {
        ...settings.tools,
        deepDive: {
          ...settings.tools.deepDive,
          customProvider: newProvider,
          customModel: defaultModels[newProvider] || 'gemini-2.5-flash',
        },
      },
    })
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
        class="bg-primary rounded-full block size-7.5 transition-all duration-300 data-[state=checked]:scale-100 data-[state=unchecked]:scale-60"
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

        <!-- ✅ INFO: API keys được dùng từ global settings -->
        <div class="text-xs text-text-secondary flex items-center gap-1 -mt-2">
          <Icon icon="heroicons:information-circle" width="16" height="16" />
          <span>Using API key from Summary settings</span>
        </div>

        <!-- Dynamic Provider Config (reuse existing components) -->
        <!-- ✅ READONLY props cho API keys, chỉ bind model -->
        {#key toolSettings.customProvider}
          {#if toolSettings.customProvider === 'gemini'}
            <GeminiAdvancedConfig
              geminiAdvancedApiKey={settings.geminiAdvancedApiKey}
              bind:selectedGeminiAdvancedModel={customModelProxy}
            />
          {:else if toolSettings.customProvider === 'openrouter'}
            <OpenrouterConfig
              openrouterApiKey={settings.openrouterApiKey}
              bind:selectedOpenrouterModel={customModelProxy}
            />
          {:else if toolSettings.customProvider === 'chatgpt'}
            <ChatGPTConfig bind:selectedChatgptModel={customModelProxy} />
          {:else if toolSettings.customProvider === 'deepseek'}
            <DeepseekConfig
              deepseekApiKey={settings.deepseekApiKey}
              deepseekBaseUrl={settings.deepseekBaseUrl}
              bind:selectedDeepseekModel={customModelProxy}
            />
          {:else if toolSettings.customProvider === 'groq'}
            <GroqConfig />
          {:else if toolSettings.customProvider === 'ollama'}
            <OllamaConfig />
          {:else if toolSettings.customProvider === 'lmstudio'}
            <LMStudioConfig />
          {/if}
        {/key}
      </div>
    {/if}

    <!-- Auto Generate Toggle -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col">
        <Label.Root for="auto-generate" class="text-text-secondary">
          Auto Generate Questions
        </Label.Root>
        <span class="text-xs text-text-secondary/70">
          Automatically generate after summary completes
        </span>
      </div>
      <Switch.Root
        id="auto-generate"
        checked={toolSettings.autoGenerate}
        onCheckedChange={(value) => updateToolSetting('autoGenerate', value)}
        class="focus-visible:ring-primary border border-blackwhite/5 text-text-secondary flex justify-center items-center bg-blackwhite/5 hover:bg-blackwhite/10 transition-colors rounded-full size-7.5"
      >
        <Switch.Thumb
          class="bg-primary rounded-full block size-7.5 transition-all duration-300 data-[state=checked]:scale-100 data-[state=unchecked]:scale-60"
        />
      </Switch.Root>
    </div>

    <!-- Default Chat Provider -->
    <div class="flex flex-col gap-2">
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
