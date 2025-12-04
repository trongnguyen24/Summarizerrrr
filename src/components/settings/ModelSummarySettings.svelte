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
  import SwitchButton from '../inputs/Switch.svelte'
  import { Label, Switch } from 'bits-ui'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }

  // Đồng bộ logic: khi toggle switch, cập nhật cả isAdvancedMode và isSummaryAdvancedMode
  function handleAdvancedModeToggle(value) {
    handleUpdateSetting('isAdvancedMode', value)
    handleUpdateSetting('isSummaryAdvancedMode', value)
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

  const customPrompts = [
    {
      id: 'youtubep',
      name: $t('settings.summary.custom_prompts.youtube_summary'),
      settingKey: 'youtubePromptSelection',
      promptKey: 'youtubeCustomPromptContent',
    },
    {
      id: 'chapterp',
      name: $t('settings.summary.custom_prompts.youtube_chapter'),
      settingKey: 'chapterPromptSelection',
      promptKey: 'chapterCustomPromptContent',
    },
    {
      id: 'coursesummaryp',
      name: $t('settings.summary.custom_prompts.course_summary'),
      settingKey: 'courseSummaryPromptSelection',
      promptKey: 'courseSummaryCustomPromptContent',
    },
    {
      id: 'courseconceptsp',
      name: $t('settings.summary.custom_prompts.course_concepts'),
      settingKey: 'courseConceptsPromptSelection',
      promptKey: 'courseConceptsCustomPromptContent',
    },
    {
      id: 'webp',
      name: $t('settings.summary.custom_prompts.web_summary'),
      settingKey: 'webPromptSelection',
      promptKey: 'webCustomPromptContent',
    },
    {
      id: 'selectedtextp',
      name: $t('settings.summary.custom_prompts.selected_text'),
      settingKey: 'selectedTextPromptSelection',
      promptKey: 'selectedTextCustomPromptContent',
    },
    {
      id: 'analyzep',
      name: $t('settings.summary.custom_prompts.analyze'),
      settingKey: 'analyzePromptSelection',
      promptKey: 'analyzeCustomPromptContent',
    },
    {
      id: 'explainp',
      name: $t('settings.summary.custom_prompts.explain'),
      settingKey: 'explainPromptSelection',
      promptKey: 'explainCustomPromptContent',
    },
    {
      id: 'debatep',
      name: $t('settings.summary.custom_prompts.debate'),
      settingKey: 'debatePromptSelection',
      promptKey: 'debateCustomPromptContent',
    },
  ]
</script>

<!--AI & Summary Section -->
<div class="setting-block flex gap-5 pb-6 pt-5 flex-col">
  <div class="flex items-center h-6 justify-between px-5">
    <label for="advanced-mode-toggle" class="block font-bold text-text-primary"
      >Model AI</label
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
        onCheckedChange={handleAdvancedModeToggle}
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
      <!-- Advanced Mode Content -->
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
      <label
        for="advanced-mode-toggle"
        class="block mt-4 font-bold text-text-primary">Summary</label
      >

      <!-- Summary Settings - Advanced Mode -->
      <!-- Summary Length Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.summary.size')}</label
        >
        <div class="grid grid-cols-3 w-full gap-1">
          <ButtonSet
            title={$t('settings.summary.size_mode.short')}
            class="setting-btn {settings.summaryLength === 'short'
              ? 'active'
              : ''}"
            onclick={() => handleUpdateSetting('summaryLength', 'short')}
            Description={$t('settings.summary.size_mode.short_desc')}
          ></ButtonSet>
          <ButtonSet
            title={$t('settings.summary.size_mode.medium')}
            class="setting-btn {settings.summaryLength === 'medium'
              ? 'active'
              : ''}"
            onclick={() => handleUpdateSetting('summaryLength', 'medium')}
            Description={$t('settings.summary.size_mode.medium_desc')}
          ></ButtonSet>
          <ButtonSet
            title={$t('settings.summary.size_mode.deep')}
            class="setting-btn {settings.summaryLength === 'long'
              ? 'active'
              : ''}"
            onclick={() => handleUpdateSetting('summaryLength', 'long')}
            Description={$t('settings.summary.size_mode.deep_desc')}
          ></ButtonSet>
        </div>
      </div>

      <!-- Summary Tone Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.summary.tone')}</label
        >
        <div class="grid grid-cols-3 w-full gap-1">
          <ButtonSet
            title={$t('settings.summary.tone_mode.simple')}
            class="setting-btn {settings.summaryTone === 'simple'
              ? 'active'
              : ''}"
            onclick={() => handleUpdateSetting('summaryTone', 'simple')}
            Description={$t('settings.summary.tone_mode.simple_desc')}
          ></ButtonSet>
          <ButtonSet
            title={$t('settings.summary.tone_mode.expert')}
            class="setting-btn {settings.summaryTone === 'expert'
              ? 'active'
              : ''}"
            onclick={() => handleUpdateSetting('summaryTone', 'expert')}
            Description={$t('settings.summary.tone_mode.expert_desc')}
          ></ButtonSet>
          <ButtonSet
            title={$t('settings.summary.tone_mode.alien')}
            class="setting-btn {settings.summaryTone === 'alien'
              ? 'active'
              : ''}"
            onclick={() => handleUpdateSetting('summaryTone', 'alien')}
            Description={$t('settings.summary.tone_mode.alien_desc')}
          ></ButtonSet>
        </div>
      </div>

      <!-- Summary Language Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.summary.language_output')}</label
        >
        <LanguageSelect
          bind:value={settings.summaryLang}
          onchange={(event) => handleUpdateSetting('summaryLang', event.detail)}
        />
      </div>

      <!-- Comment Limit Section -->
      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.summary.comment_limit')}</label
        >
        <div class="grid grid-cols-3 w-full gap-1">
          <ButtonSet
            title="40"
            class="setting-btn {settings.commentLimit === 40 ? 'active' : ''}"
            onclick={() => handleUpdateSetting('commentLimit', 40)}
            Description=""
          ></ButtonSet>
          <ButtonSet
            title="60"
            class="setting-btn {settings.commentLimit === 60 ? 'active' : ''}"
            onclick={() => handleUpdateSetting('commentLimit', 60)}
            Description=""
          ></ButtonSet>
          <ButtonSet
            title="80"
            class="setting-btn {settings.commentLimit === 80 ? 'active' : ''}"
            onclick={() => handleUpdateSetting('commentLimit', 80)}
            Description=""
          ></ButtonSet>
        </div>
      </div>

      <!-- Custom Prompts Section - Advanced Mode Only -->
      <div class="@container setting-secsion flex flex-col mt-4 gap-4">
        <!-- Prompt settings -->
        <div class="flex items-center gap-1 text-text-primary justify-between">
          <span class=" font-bold">
            {$t('settings.summary.custom_prompts.title')}</span
          >
          <a
            href={browser.runtime.getURL(
              'prompt.html?promptKey=youtubeCustomPromptContent',
            )}
            target="_blank"
            class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
          >
            {$t('settings.summary.custom_prompts.editor_button')}
            <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
          </a>
        </div>

        <div class="grid @min-[23rem]:grid-cols-2 gap-2">
          {#each customPrompts as prompt}
            <SwitchButton
              id={prompt.id}
              name={prompt.name}
              checked={settings[prompt.settingKey]}
              onCheckedChange={(value) =>
                handleUpdateSetting(prompt.settingKey, value)}
              onEdit={() =>
                browser.tabs.create({
                  url: browser.runtime.getURL(
                    `prompt.html?promptKey=${prompt.promptKey}`,
                  ),
                })}
            />
          {/each}
        </div>
        <p>{$t('settings.summary.custom_prompts.override_note')}</p>
      </div>
    {:else}
      <!-- Basic Mode Content -->
      <div class="setting-block flex gap-5 pb-2 flex-col">
        <!-- Gemini Basic Config (Provider cố định) -->
        <GeminiBasicConfig
          bind:geminiApiKey={settings.geminiApiKey}
          bind:selectedGeminiModel={settings.selectedGeminiModel}
        />

        <!-- Summary Length Section -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-text-secondary"
            >{$t('settings.summary.size')}</label
          >
          <div class="grid grid-cols-3 w-full gap-1">
            <ButtonSet
              title={$t('settings.summary.size_mode.short')}
              class="setting-btn {settings.summaryLength === 'short'
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('summaryLength', 'short')}
              Description={$t('settings.summary.size_mode.short_desc')}
            ></ButtonSet>
            <ButtonSet
              title={$t('settings.summary.size_mode.medium')}
              class="setting-btn {settings.summaryLength === 'medium'
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('summaryLength', 'medium')}
              Description={$t('settings.summary.size_mode.medium_desc')}
            ></ButtonSet>
            <ButtonSet
              title={$t('settings.summary.size_mode.deep')}
              class="setting-btn {settings.summaryLength === 'long'
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('summaryLength', 'long')}
              Description={$t('settings.summary.size_mode.deep_desc')}
            ></ButtonSet>
          </div>
        </div>

        <!-- Summary Tone Section -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-text-secondary"
            >{$t('settings.summary.tone')}</label
          >
          <div class="grid grid-cols-3 w-full gap-1">
            <ButtonSet
              title={$t('settings.summary.tone_mode.simple')}
              class="setting-btn {settings.summaryTone === 'simple'
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('summaryTone', 'simple')}
              Description={$t('settings.summary.tone_mode.simple_desc')}
            ></ButtonSet>
            <ButtonSet
              title={$t('settings.summary.tone_mode.expert')}
              class="setting-btn {settings.summaryTone === 'expert'
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('summaryTone', 'expert')}
              Description={$t('settings.summary.tone_mode.expert_desc')}
            ></ButtonSet>
            <ButtonSet
              title={$t('settings.summary.tone_mode.alien')}
              class="setting-btn {settings.summaryTone === 'alien'
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('summaryTone', 'alien')}
              Description={$t('settings.summary.tone_mode.alien_desc')}
            ></ButtonSet>
          </div>
        </div>

        <!-- Summary Language Section -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-text-secondary"
            >{$t('settings.summary.language_output')}</label
          >
          <LanguageSelect
            bind:value={settings.summaryLang}
            onchange={(event) =>
              handleUpdateSetting('summaryLang', event.detail)}
          />
        </div>

        <!-- Comment Limit Section -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-text-secondary"
            >{$t('settings.summary.comment_limit')}</label
          >
          <div class="grid grid-cols-3 w-full gap-1">
            <ButtonSet
              title="40"
              class="setting-btn {settings.commentLimit === 40 ? 'active' : ''}"
              onclick={() => handleUpdateSetting('commentLimit', 40)}
              Description=""
            ></ButtonSet>
            <ButtonSet
              title="60"
              class="setting-btn {settings.commentLimit === 60 ? 'active' : ''}"
              onclick={() => handleUpdateSetting('commentLimit', 60)}
              Description=""
            ></ButtonSet>
            <ButtonSet
              title="80"
              class="setting-btn {settings.commentLimit === 80 ? 'active' : ''}"
              onclick={() => handleUpdateSetting('commentLimit', 80)}
              Description=""
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
