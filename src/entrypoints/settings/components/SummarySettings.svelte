<svelte:options runes={true} />

<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'
  import SwitchButton from '@/entrypoints/settings/components/inputs/Switch.svelte'
  import {
    settings,
    updateSettings,
    updateFeatureSettings,
  } from '@/stores/settingsStore.svelte.js'
  import { TASK_REASONING_CHOICES } from '@/lib/api/reasoningConfig.js'
  import FeatureModelPicker from '@/entrypoints/settings/components/inputs/FeatureModelPicker.svelte'
  import { browser } from 'wxt/browser'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }

  let wittyClickCount = $state(0)

  function handleWittyClick() {
    if (settings.summaryTone === 'witty') {
      wittyClickCount++
      if (wittyClickCount >= 3) {
        handleUpdateSetting('summaryTone', 'savage')
      }
    } else if (settings.summaryTone === 'savage') {
      // Do nothing, already savage
    } else {
      // Switching to witty
      handleUpdateSetting('summaryTone', 'witty')
      wittyClickCount = 0
    }
  }

  function handleStandardToneClick(tone) {
    handleUpdateSetting('summaryTone', tone)
    wittyClickCount = 0
  }

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
  ]
</script>

<!-- Summmary Section -->
<div class="setting-block flex flex-col gap-5 pb-6 pt-5">
  <div class="flex items-center h-6 justify-between px-5">
    <label class="block font-bold text-text-primary"
      >{$t('settings.summary.title')}</label
    >
  </div>

  <div class="setting-secsion flex flex-col gap-6 px-5">
    <!-- Summarize Model Picker -->
    <div class="flex flex-col gap-2">
      <FeatureModelPicker
        bind:provider={settings.summarize.provider}
        bind:model={settings.summarize.model}
        onchange={(p, m) => updateFeatureSettings('summarize', { provider: p, model: m })}
      />
    </div>

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
          onclick={() => handleStandardToneClick('simple')}
          Description={$t('settings.summary.tone_mode.simple_desc')}
        ></ButtonSet>
        <ButtonSet
          title={$t('settings.summary.tone_mode.expert')}
          class="setting-btn {settings.summaryTone === 'expert'
            ? 'active'
            : ''}"
          onclick={() => handleStandardToneClick('expert')}
          Description={$t('settings.summary.tone_mode.expert_desc')}
        ></ButtonSet>
        <ButtonSet
          title={settings.summaryTone === 'savage'
            ? $t('settings.summary.tone_mode.savage')
            : $t('settings.summary.tone_mode.witty')}
          class="setting-btn {settings.summaryTone === 'witty' ||
          settings.summaryTone === 'savage'
            ? 'active'
            : ''}"
          onclick={handleWittyClick}
          Description={settings.summaryTone === 'savage'
            ? $t('settings.summary.tone_mode.savage_desc')
            : $t('settings.summary.tone_mode.witty_desc')}
        ></ButtonSet>
      </div>
    </div>

    <!-- Summary Reasoning Section -->
    <div class="flex flex-col gap-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-text-secondary"
        >{$t('settings.summary.reasoning.title')}</label
      >
      <div class="grid grid-cols-3 w-full gap-1">
        {#each TASK_REASONING_CHOICES as option (option.value)}
          <ButtonSet
            title={$t(`settings.summary.reasoning.${option.value}`, { default: option.label })}
            Description={$t(`settings.summary.reasoning.${option.value}_desc`, { default: option.description })}
            class="setting-btn {settings.summarize?.reasoningLevel === option.value ? 'active' : ''}"
            onclick={() => updateFeatureSettings('summarize', { reasoningLevel: option.value })}
          ></ButtonSet>
        {/each}
      </div>
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

  <div class="@container setting-secsion flex flex-col gap-4 px-5">
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
</div>

