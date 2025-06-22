<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import LanguageSelect from '../inputs/LanguageSelect.svelte'
  import SwitchButton from '../inputs/Switch.svelte'
  import { Label, Switch } from 'bits-ui'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
</script>

<!-- Summmary Section -->
<div class="setting-block flex flex-col gap-5 pb-6 pt-5">
  <div class="flex items-center h-6 justify-between px-5">
    <label for="isSummaryAdvancedMode" class="block font-bold text-text-primary"
      >Summary settings</label
    >
    <div class="flex items-center">
      <Label.Root
        class="cursor-pointer pr-2 py-2 w-20 text-right font-bold select-none {settings.isSummaryAdvancedMode
          ? 'text-primary'
          : 'text-text-primary'}"
        for="isSummaryAdvancedMode-toggle"
      >
        {settings.isSummaryAdvancedMode ? 'Advanced' : 'Basic'}
      </Label.Root>
      <Switch.Root
        id="isSummaryAdvancedMode-toggle"
        bind:checked={settings.isSummaryAdvancedMode}
        name="Summary Advanced Mode"
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
      <LanguageSelect bind:value={settings.summaryLang} />
    </div>
  </div>

  {#if settings.isSummaryAdvancedMode}
    <div class="setting-secsion flex flex-col gap-6 px-5">
      <!-- Prompt settings -->
      <label for="aq" class="block mt-4 font-bold text-text-primary"
        >Custom prompt template</label
      >
      <div class="flex flex-col gap-4">
        <SwitchButton
          id="youtubep"
          name="Youtube Summary"
          bind:checked={settings.youtubePromptSelection}
        />
        {#if settings.youtubePromptSelection}
          <div class="flex gap-2">
            <ButtonSet
              title="Custom 1"
              class="setting-btn {settings.selectedYoutubeCustomPrompt ===
              'custom1'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting('selectedYoutubeCustomPrompt', 'custom1')}
              Description="Use Custom Prompt 1."
            ></ButtonSet>
            <ButtonSet
              title="Custom 2"
              class="setting-btn {settings.selectedYoutubeCustomPrompt ===
              'custom2'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting('selectedYoutubeCustomPrompt', 'custom2')}
              Description="Use Custom Prompt 2."
            ></ButtonSet>
            <ButtonSet
              title="Custom 3"
              class="setting-btn {settings.selectedYoutubeCustomPrompt ===
              'custom3'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting('selectedYoutubeCustomPrompt', 'custom3')}
              Description="Use Custom Prompt 3."
            ></ButtonSet>
          </div>
        {/if}
      </div>

      <div class="flex flex-col gap-2">
        <SwitchButton
          id="chapterp"
          name="Youtube Chapter"
          bind:checked={settings.chapterPromptSelection}
        />
        {#if settings.chapterPromptSelection}
          <div class="flex gap-2">
            <ButtonSet
              title="Custom 1"
              class="setting-btn {settings.selectedChapterCustomPrompt ===
              'custom1'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting('selectedChapterCustomPrompt', 'custom1')}
              Description="Use Custom Prompt 1."
            ></ButtonSet>
            <ButtonSet
              title="Custom 2"
              class="setting-btn {settings.selectedChapterCustomPrompt ===
              'custom2'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting('selectedChapterCustomPrompt', 'custom2')}
              Description="Use Custom Prompt 2."
            ></ButtonSet>
            <ButtonSet
              title="Custom 3"
              class="setting-btn {settings.selectedChapterCustomPrompt ===
              'custom3'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting('selectedChapterCustomPrompt', 'custom3')}
              Description="Use Custom Prompt 3."
            ></ButtonSet>
          </div>
        {/if}
      </div>

      <div class="flex flex-col gap-2">
        <SwitchButton
          id="webp"
          name="Web Summary"
          bind:checked={settings.webPromptSelection}
        />
        {#if settings.webPromptSelection}
          <div class="flex gap-2">
            <ButtonSet
              title="Custom 1"
              class="setting-btn {settings.selectedWebCustomPrompt === 'custom1'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting('selectedWebCustomPrompt', 'custom1')}
              Description="Use Custom Prompt 1."
            ></ButtonSet>
            <ButtonSet
              title="Custom 2"
              class="setting-btn {settings.selectedWebCustomPrompt === 'custom2'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting('selectedWebCustomPrompt', 'custom2')}
              Description="Use Custom Prompt 2."
            ></ButtonSet>
            <ButtonSet
              title="Custom 3"
              class="setting-btn {settings.selectedWebCustomPrompt === 'custom3'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting('selectedWebCustomPrompt', 'custom3')}
              Description="Use Custom Prompt 3."
            ></ButtonSet>
          </div>
        {/if}
      </div>

      <div class="flex flex-col gap-2">
        <SwitchButton
          id="udemysummaryp"
          name="Udemy Summary"
          bind:checked={settings.udemySummaryPromptSelection}
        />
        {#if settings.udemySummaryPromptSelection}
          <div class="flex gap-2">
            <ButtonSet
              title="Custom 1"
              class="setting-btn {settings.selectedUdemySummaryCustomPrompt ===
              'custom1'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting(
                  'selectedUdemySummaryCustomPrompt',
                  'custom1'
                )}
              Description="Use Custom Prompt 1."
            ></ButtonSet>
            <ButtonSet
              title="Custom 2"
              class="setting-btn {settings.selectedUdemySummaryCustomPrompt ===
              'custom2'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting(
                  'selectedUdemySummaryCustomPrompt',
                  'custom2'
                )}
              Description="Use Custom Prompt 2."
            ></ButtonSet>
            <ButtonSet
              title="Custom 3"
              class="setting-btn {settings.selectedUdemySummaryCustomPrompt ===
              'custom3'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting(
                  'selectedUdemySummaryCustomPrompt',
                  'custom3'
                )}
              Description="Use Custom Prompt 3."
            ></ButtonSet>
          </div>
        {/if}
      </div>

      <div class="flex flex-col gap-2">
        <SwitchButton
          id="udemyconceptsp"
          name="Udemy Concepts"
          bind:checked={settings.udemyConceptsPromptSelection}
        />
        {#if settings.udemyConceptsPromptSelection}
          <div class="flex gap-2">
            <ButtonSet
              title="Custom 1"
              class="setting-btn {settings.selectedUdemyConceptsCustomPrompt ===
              'custom1'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting(
                  'selectedUdemyConceptsCustomPrompt',
                  'custom1'
                )}
              Description="Use Custom Prompt 1."
            ></ButtonSet>
            <ButtonSet
              title="Custom 2"
              class="setting-btn {settings.selectedUdemyConceptsCustomPrompt ===
              'custom2'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting(
                  'selectedUdemyConceptsCustomPrompt',
                  'custom2'
                )}
              Description="Use Custom Prompt 2."
            ></ButtonSet>
            <ButtonSet
              title="Custom 3"
              class="setting-btn {settings.selectedUdemyConceptsCustomPrompt ===
              'custom3'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting(
                  'selectedUdemyConceptsCustomPrompt',
                  'custom3'
                )}
              Description="Use Custom Prompt 3."
            ></ButtonSet>
          </div>
        {/if}
      </div>

      <div class="flex flex-col gap-2">
        <SwitchButton
          id="selectedtextp"
          name="Selected Text"
          bind:checked={settings.selectedTextPromptSelection}
        />
        {#if settings.selectedTextPromptSelection}
          <div class="flex gap-2">
            <ButtonSet
              title="Custom 1"
              class="setting-btn {settings.selectedSelectedTextCustomPrompt ===
              'custom1'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting(
                  'selectedSelectedTextCustomPrompt',
                  'custom1'
                )}
              Description="Use Custom Prompt 1."
            ></ButtonSet>
            <ButtonSet
              title="Custom 2"
              class="setting-btn {settings.selectedSelectedTextCustomPrompt ===
              'custom2'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting(
                  'selectedSelectedTextCustomPrompt',
                  'custom2'
                )}
              Description="Use Custom Prompt 2."
            ></ButtonSet>
            <ButtonSet
              title="Custom 3"
              class="setting-btn {settings.selectedSelectedTextCustomPrompt ===
              'custom3'
                ? 'active'
                : ''}"
              onclick={() =>
                handleUpdateSetting(
                  'selectedSelectedTextCustomPrompt',
                  'custom3'
                )}
              Description="Use Custom Prompt 3."
            ></ButtonSet>
          </div>
        {/if}
      </div>

      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary">Custom Prompt 1</label>
        <textarea
          class="textarea textarea-bordered"
          bind:value={settings.customPrompt1Content}
        />
      </div>

      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary">Custom Prompt 2</label>
        <textarea
          class="textarea textarea-bordered"
          bind:value={settings.customPrompt2Content}
        />
      </div>

      <div class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary">Custom Prompt 3</label>
        <textarea
          class="textarea textarea-bordered"
          bind:value={settings.customPrompt3Content}
        />
      </div>
    </div>
  {/if}
</div>
