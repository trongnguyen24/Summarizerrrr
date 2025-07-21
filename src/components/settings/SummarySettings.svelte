<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import LanguageSelect from '../inputs/LanguageSelect.svelte'
  import TextScramble from '@/lib/textScramble.js'
  import SwitchButton from '../inputs/Switch.svelte'
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
    if (!textScramble && textElement) {
      textScramble = new TextScramble(textElement)
    }
    if (textScramble) {
      textScramble.setText(
        settings.isSummaryAdvancedMode ? 'Advanced' : 'Basic'
      )
    }
  })

  const customPrompts = [
    {
      id: 'youtubep',
      name: 'Youtube Summary',
      settingKey: 'youtubePromptSelection',
      promptKey: 'youtubeCustomPromptContent',
    },
    {
      id: 'chapterp',
      name: 'Youtube Chapter',
      settingKey: 'chapterPromptSelection',
      promptKey: 'chapterCustomPromptContent',
    },

    {
      id: 'coursesummaryp',
      name: 'Course Summary',
      settingKey: 'courseSummaryPromptSelection',
      promptKey: 'courseSummaryCustomPromptContent',
    },
    {
      id: 'courseconceptsp',
      name: 'Course Concepts',
      settingKey: 'courseConceptsPromptSelection',
      promptKey: 'courseConceptsCustomPromptContent',
    },
    {
      id: 'webp',
      name: 'Web Summary',
      settingKey: 'webPromptSelection',
      promptKey: 'webCustomPromptContent',
    },
    {
      id: 'selectedtextp',
      name: 'Selected Text',
      settingKey: 'selectedTextPromptSelection',
      promptKey: 'selectedTextCustomPromptContent',
    },
  ]
</script>

<!-- Summmary Section -->
<div class="setting-block flex flex-col gap-5 pb-6 pt-5">
  <div class="flex items-center h-6 justify-between px-5">
    <label for="isSummaryAdvancedMode" class="block font-bold text-text-primary"
      >Summary settings</label
    >
    <div class="flex items-center">
      <Label.Root
        class="cursor-pointer pr-2 py-2 w-20 !text-right font-bold select-none transition-colors duration-1000 {settings.isSummaryAdvancedMode
          ? 'text-primary'
          : 'text-text-primary'}"
        for="isSummaryAdvancedMode-toggle"
      >
        <span bind:this={textElement}>
          {settings.isSummaryAdvancedMode ? 'Advanced' : 'Basic'}
        </span>
      </Label.Root>

      <Switch.Root
        id="isSummaryAdvancedMode-toggle"
        name="Summary Advanced Mode"
        checked={settings.isSummaryAdvancedMode}
        onCheckedChange={(value) =>
          handleUpdateSetting('isSummaryAdvancedMode', value)}
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
    <!-- Summary Length Section -->
    <div class="flex flex-col gap-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-text-secondary">Summary Size</label>
      <div class="grid grid-cols-3 w-full gap-1">
        <ButtonSet
          title="Short"
          class="setting-btn {settings.summaryLength === 'short'
            ? 'active'
            : ''}"
          onclick={() => handleUpdateSetting('summaryLength', 'short')}
          Description="Short summary."
        ></ButtonSet>
        <ButtonSet
          title="Medium"
          class="setting-btn {settings.summaryLength === 'medium'
            ? 'active'
            : ''}"
          onclick={() => handleUpdateSetting('summaryLength', 'medium')}
          Description="Medium length summary."
        ></ButtonSet>
        <ButtonSet
          title="Deep"
          class="setting-btn {settings.summaryLength === 'long'
            ? 'active'
            : ''}"
          onclick={() => handleUpdateSetting('summaryLength', 'long')}
          Description="Detailed summary."
        ></ButtonSet>
      </div>
    </div>

    <!-- Summary Tone Section -->
    <div class="flex flex-col gap-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-text-secondary">Tone</label>
      <div class="grid grid-cols-3 w-full gap-1">
        <ButtonSet
          title="Simple"
          class="setting-btn {settings.summaryTone === 'simple'
            ? 'active'
            : ''}"
          onclick={() => handleUpdateSetting('summaryTone', 'simple')}
          Description="Easy to understand, friendly."
        ></ButtonSet>
        <ButtonSet
          title="Expert"
          class="setting-btn {settings.summaryTone === 'expert'
            ? 'active'
            : ''}"
          onclick={() => handleUpdateSetting('summaryTone', 'expert')}
          Description="Professional, technical, authoritative."
        ></ButtonSet>
        <ButtonSet
          title="Alien"
          class="setting-btn {settings.summaryTone === 'alien' ? 'active' : ''}"
          onclick={() => handleUpdateSetting('summaryTone', 'alien')}
          Description="Curious, analytical, detached."
        ></ButtonSet>
      </div>
    </div>

    <!-- Summary Language Section -->
    <div class="flex flex-col gap-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-text-secondary">Language output</label>
      <LanguageSelect
        bind:value={settings.summaryLang}
        onchange={(event) => handleUpdateSetting('summaryLang', event.detail)}
      />
    </div>
  </div>

  {#if settings.isSummaryAdvancedMode}
    <div class="@container setting-secsion flex flex-col gap-4 px-5">
      <!-- Prompt settings -->
      <div class="flex items-center gap-1 text-text-primary justify-between">
        Active custom prompts
        <a
          href={browser.runtime.getURL(
            'prompt.html?promptKey=youtubeCustomPromptContent'
          )}
          target="_blank"
          class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
        >
          Prompt Editer
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
                  `prompt.html?promptKey=${prompt.promptKey}`
                ),
              })}
          />
        {/each}
      </div>
      <p>* Basic settings are overridden by active custom prompts.</p>
    </div>
  {/if}
</div>
