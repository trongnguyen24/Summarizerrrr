<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import LanguageSelect from '../inputs/LanguageSelect.svelte'
  import ProvidersSelect from '../inputs/ProvidersSelect.svelte'
  import TextScramble from '../../lib/ui/textScramble.js'
  import GeminiBasicConfig from '../providerConfigs/GeminiBasicConfig.svelte'
  import GeminiAdvancedConfig from '../providerConfigs/GeminiAdvancedConfig.svelte'
  import OpenrouterConfig from '../providerConfigs/OpenrouterConfig.svelte'
  import OllamaConfig from '../providerConfigs/OllamaConfig.svelte'
  import OpenAICompatibleConfig from '../providerConfigs/OpenAICompatibleConfig.svelte'
  import ChatGPTConfig from '../providerConfigs/ChatGPTConfig.svelte'
  import DeepseekConfig from '../providerConfigs/DeepseekConfig.svelte'
  import LMStudioConfig from '../providerConfigs/LMStudioConfig.svelte'
  import GroqConfig from '../providerConfigs/GroqConfig.svelte'
  import { Label, Switch } from 'bits-ui'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
  let textElement
  let textScramble

  $effect(() => {
    textScramble = new TextScramble(textElement)
    textScramble.setText(
      settings.isAdvancedMode
        ? $t('settings.ai_model.mode.advanced')
        : $t('settings.ai_model.mode.basic'),
    )
  })
</script>

<!--AI Model Section -->
<div class="setting-block flex gap-5 pb-6 pt-5 flex-col">
  <div class="flex items-center h-6 justify-between px-5">
    <label for="advanced-mode-toggle" class="block font-bold text-text-primary"
      >{$t('settings.ai_model.title')}</label
    >
    <div class="flex items-center">
      <Label.Root
        class="cursor-pointer  pr-2 py-2 w-20 !text-right font-bold select-none transition-colors duration-1000 {settings.isAdvancedMode
          ? 'text-primary'
          : 'text-text-primary'}"
        for="provider-toggle"
      >
        <span bind:this={textElement}>
          {settings.isAdvancedMode
            ? $t('settings.ai_model.mode.advanced')
            : $t('settings.ai_model.mode.basic')}
        </span>
      </Label.Root>
      <Switch.Root
        id="provider-toggle"
        name="Advanced Mode"
        checked={settings.isAdvancedMode}
        onCheckedChange={(value) =>
          handleUpdateSetting('isAdvancedMode', value)}
        class="focus-visible:ring-primary border border-blackwhite/5 text-text-secondary flex justify-center items-center focus-visible:ring-offset-background  bg-blackwhite/5 hover:bg-blackwhite/10 transition-colors rounded-full  focus-visible:outline-hidden  size-7.5  shrink-0 cursor-pointer  focus-visible:ring-1 focus-visible:ring-offset-1 disabled:cursor-not-allowed data-[state=checked]:text-white disabled:opacity50"
      >
        <Switch.Thumb
          class="bg-primary rounded-full pointer-events-none block shrink-0 size-7.5 transition-all duration-300 data-[state=checked]:scale-100 data-[state=unchecked]:scale-60  data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-0"
        />
        <Icon
          icon="heroicons:wrench-16-solid"
          width="20"
          height="20"
          class="origin-[75%_25%] animate-wiggle absolute z-10"
        />
      </Switch.Root>
    </div>
  </div>

  <div class="setting-secsion flex flex-col gap-6 px-5">
    {#if settings.isAdvancedMode}
      <!-- Providers Select Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.ai_model.selected_provider')}</label
        >
        <ProvidersSelect bind:value={settings.selectedProvider} />
      </div>

      <!-- Dynamic Provider Config Section -->
      {#if settings.selectedProvider === 'gemini'}
        <GeminiAdvancedConfig
          bind:geminiAdvancedApiKey={settings.geminiAdvancedApiKey}
          bind:selectedGeminiAdvancedModel={
            settings.selectedGeminiAdvancedModel
          }
        />
      {:else if settings.selectedProvider === 'openrouter'}
        <OpenrouterConfig
          bind:openrouterApiKey={settings.openrouterApiKey}
          bind:selectedOpenrouterModel={settings.selectedOpenrouterModel}
        />
      {:else if settings.selectedProvider === 'ollama'}
        <OllamaConfig />
      {:else if settings.selectedProvider === 'openaiCompatible'}
        <OpenAICompatibleConfig
          bind:openaiCompatibleApiKey={settings.openaiCompatibleApiKey}
          bind:openaiCompatibleBaseUrl={settings.openaiCompatibleBaseUrl}
          bind:selectedOpenAICompatibleModel={
            settings.selectedOpenAICompatibleModel
          }
        />
      {:else if settings.selectedProvider === 'chatgpt'}
        <ChatGPTConfig
          bind:chatgptApiKey={settings.chatgptApiKey}
          bind:chatgptBaseUrl={settings.chatgptBaseUrl}
          bind:selectedChatgptModel={settings.selectedChatgptModel}
        />
      {:else if settings.selectedProvider === 'deepseek'}
        <DeepseekConfig
          bind:deepseekApiKey={settings.deepseekApiKey}
          bind:deepseekBaseUrl={settings.deepseekBaseUrl}
          bind:selectedDeepseekModel={settings.selectedDeepseekModel}
        />
      {:else if settings.selectedProvider === 'lmstudio'}
        <LMStudioConfig />
      {:else if settings.selectedProvider === 'groq'}
        <GroqConfig />
      {/if}

      <!-- Response Mode Section for Advanced Mode -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.general.responseMode')}</label
        >
        <div class="grid grid-cols-2 w-full gap-1">
          <ButtonSet
            title={$t('settings.general.response_mode.streaming')}
            class="setting-btn {settings.enableStreaming ? 'active' : ''}"
            onclick={() => handleUpdateSetting('enableStreaming', true)}
            Description={$t('settings.general.response_mode.streaming_desc')}
          >
            <Icon icon="heroicons:bolt-20-solid" width="20" height="20" />
          </ButtonSet>
          <ButtonSet
            title={$t('settings.general.response_mode.non_streaming')}
            class="setting-btn {!settings.enableStreaming ? 'active' : ''}"
            onclick={() => handleUpdateSetting('enableStreaming', false)}
            Description={$t(
              'settings.general.response_mode.non_streaming_desc',
            )}
          >
            <Icon
              icon="heroicons:device-phone-mobile-20-solid"
              width="20"
              height="20"
            />
          </ButtonSet>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Temperature Section -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class=" text-text-secondary flex justify-between items-center">
            <span>{$t('settings.ai_model.temperature')}</span>
            <span class="text-text-primary font-bold"
              >{settings.temperature.toFixed(2)}</span
            >
          </label>
          <input
            type="range"
            id="temperature-range"
            min="0"
            max="1"
            step="0.05"
            bind:value={settings.temperature}
            onchange={() =>
              handleUpdateSetting('temperature', settings.temperature)}
            class="range range-primary"
          />
        </div>

        <!-- Top P Section -->
        <div class="flex flex-col gap-2 relative">
          <!-- Added relative here -->
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class=" text-text-secondary flex justify-between items-center">
            <span>{$t('settings.ai_model.top_p')}</span>
            <span class="text-text-primary font-bold"
              >{settings.topP.toFixed(2)}</span
            >
          </label>
          <input
            type="range"
            id="topP-range"
            min="0"
            max="1"
            step="0.01"
            bind:value={settings.topP}
            onchange={() => handleUpdateSetting('topP', settings.topP)}
            class="range range-primary"
          />
        </div>
      </div>
    {:else}
      <div class="setting-block flex gap-5 pb-2 flex-col">
        <GeminiBasicConfig
          bind:geminiApiKey={settings.geminiApiKey}
          bind:geminiAdditionalApiKeys={settings.geminiAdditionalApiKeys}
          bind:selectedGeminiModel={settings.selectedGeminiModel}
        />
        <!-- Response Mode Section for Basic Mode -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-text-secondary"
            >{$t('settings.general.responseMode')}</label
          >
          <div class="grid grid-cols-2 w-full gap-1">
            <ButtonSet
              title={$t('settings.general.response_mode.streaming')}
              class="setting-btn {settings.enableStreaming ? 'active' : ''}"
              onclick={() => handleUpdateSetting('enableStreaming', true)}
              Description={$t('settings.general.response_mode.streaming_desc')}
            >
              <Icon icon="heroicons:bolt-20-solid" width="20" height="20" />
            </ButtonSet>
            <ButtonSet
              title={$t('settings.general.response_mode.non_streaming')}
              class="setting-btn {!settings.enableStreaming ? 'active' : ''}"
              onclick={() => handleUpdateSetting('enableStreaming', false)}
              Description={$t(
                'settings.general.response_mode.non_streaming_desc',
              )}
            >
              <Icon
                icon="heroicons:device-phone-mobile-20-solid"
                width="20"
                height="20"
              />
            </ButtonSet>
          </div>
        </div>

        <!-- Temperature Section for Basic Mode -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class=" text-text-secondary flex justify-between items-center">
            <span>{$t('settings.ai_model.temperature')}</span>
            <span class="text-text-primary block font-bold"
              >{settings.temperature.toFixed(2)}</span
            >
          </label>
          <div class="grid grid-cols-3 w-full gap-1">
            <ButtonSet
              title={$t('settings.ai_model.temperature_basic.precise')}
              class="setting-btn {settings.temperature === 0.3 ? 'active' : ''}"
              onclick={() => handleUpdateSetting('temperature', 0.3)}
              Description={$t(
                'settings.ai_model.temperature_basic.precise_desc',
              )}
            ></ButtonSet>
            <ButtonSet
              title={$t('settings.ai_model.temperature_basic.balanced')}
              class="setting-btn {settings.temperature === 0.7 ? 'active' : ''}"
              onclick={() => handleUpdateSetting('temperature', 0.7)}
              Description={$t(
                'settings.ai_model.temperature_basic.balanced_desc',
              )}
            ></ButtonSet>
            <ButtonSet
              title={$t('settings.ai_model.temperature_basic.creative')}
              class="setting-btn {settings.temperature === 0.9 ? 'active' : ''}"
              onclick={() => handleUpdateSetting('temperature', 0.9)}
              Description={$t(
                'settings.ai_model.temperature_basic.creative_desc',
              )}
            ></ButtonSet>
          </div>
        </div>

        <!-- Top P Section for Basic Mode -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class=" text-text-secondary flex justify-between items-center">
            <span>{$t('settings.ai_model.top_p')}</span>
            <span class="text-text-primary block font-bold"
              >{settings.topP.toFixed(2)}</span
            >
          </label>
          <div class="grid grid-cols-3 w-full gap-1">
            <ButtonSet
              title={$t('settings.ai_model.top_p_basic.narrow')}
              class="setting-btn {settings.topP === 0.9 ? 'active' : ''}"
              onclick={() => handleUpdateSetting('topP', 0.9)}
              Description={$t('settings.ai_model.top_p_basic.narrow_desc')}
            ></ButtonSet>
            <ButtonSet
              title={$t('settings.ai_model.top_p_basic.balanced')}
              class="setting-btn {settings.topP === 0.95 ? 'active' : ''}"
              onclick={() => handleUpdateSetting('topP', 0.95)}
              Description={$t('settings.ai_model.top_p_basic.balanced_desc')}
            ></ButtonSet>
            <ButtonSet
              title={$t('settings.ai_model.top_p_basic.wide')}
              class="setting-btn {settings.topP === 0.98 ? 'active' : ''}"
              onclick={() => handleUpdateSetting('topP', 0.98)}
              Description={$t('settings.ai_model.top_p_basic.wide_desc')}
            ></ButtonSet>
          </div>
        </div>
      </div>
    {/if}

    <a
      href="https://www.youtube.com/watch?v=BRlHzxy3QqY"
      target="_blank"
      class="text-xs flex gap-1 items-center mt-auto self-center text-text-secondary hover:text-primary underline underline-offset-2 transition-colors"
    >
      {$t('apiKeyPrompt.setupGuide')}<Icon
        width={12}
        icon="heroicons:arrow-up-right-16-solid"
      />
    </a>
  </div>
</div>
