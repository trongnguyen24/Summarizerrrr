<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import LanguageSelect from '../inputs/LanguageSelect.svelte'
  import ProvidersSelect from '../inputs/ProvidersSelect.svelte'
  import TextScramble from '@/lib/textScramble.js'
  import GeminiBasicConfig from '../providerConfigs/GeminiBasicConfig.svelte'
  import GeminiAdvancedConfig from '../providerConfigs/GeminiAdvancedConfig.svelte'
  import OpenrouterConfig from '../providerConfigs/OpenrouterConfig.svelte'
  import OllamaConfig from '../providerConfigs/OllamaConfig.svelte'
  import { Label, Switch } from 'bits-ui'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import {
    advancedModeSettings,
    updateAdvancedModeSettings,
  } from '../../stores/advancedModeSettingsStore.svelte.js'
  import {
    basicModeSettings,
    updateBasicModeSettings,
  } from '../../stores/basicModeSettingsStore.svelte.js'

  function handleUpdateSetting(key, value) {
    if (key === 'temperature' || key === 'topP') {
      if (settings.isAdvancedMode) {
        updateAdvancedModeSettings({ [key]: value })
      } else {
        updateBasicModeSettings({ [key]: value })
      }
    } else {
      updateSettings({ [key]: value })
    }
  }
  let textElement
  let textScramble

  $effect(() => {
    textScramble = new TextScramble(textElement)
    textScramble.setText(settings.isAdvancedMode ? 'Advanced' : 'Basic')
  })
</script>

<!--AI Model Section -->
<div class="setting-block flex gap-5 pb-6 pt-5 flex-col">
  <div class="flex items-center h-6 justify-between px-5">
    <label for="advanced-mode-toggle" class="block font-bold text-text-primary"
      >Provider settings</label
    >
    <div class="flex items-center">
      <Label.Root
        class="cursor-pointer pr-2 py-2 w-20 text-right font-bold select-none transition-colors duration-1000 {settings.isAdvancedMode
          ? 'text-primary'
          : 'text-text-primary'}"
        for="provider-toggle"
      >
        <span bind:this={textElement}>
          {settings.isAdvancedMode ? 'Advanced' : 'Basic'}
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
        <label class="block text-text-secondary">Selected Provider</label>
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
      {/if}

      <div class="grid grid-cols-2 gap-4">
        <!-- Temperature Section -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class=" text-text-secondary flex justify-between items-center">
            <span>Temperature</span>
            <span class="text-text-primary font-bold"
              >{advancedModeSettings.temperature.toFixed(2)}</span
            >
          </label>
          <input
            type="range"
            id="temperature-range"
            min="0"
            max="1"
            step="0.05"
            bind:value={advancedModeSettings.temperature}
            onchange={() =>
              handleUpdateSetting(
                'temperature',
                advancedModeSettings.temperature
              )}
            class="range range-primary"
          />
        </div>

        <!-- Top P Section -->
        <div class="flex flex-col gap-2 relative">
          <!-- Added relative here -->
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class=" text-text-secondary flex justify-between items-center">
            <span>Top P</span>
            <span class="text-text-primary font-bold"
              >{advancedModeSettings.topP.toFixed(2)}</span
            >
          </label>
          <input
            type="range"
            id="topP-range"
            min="0"
            max="1"
            step="0.01"
            bind:value={advancedModeSettings.topP}
            onchange={() =>
              handleUpdateSetting('topP', advancedModeSettings.topP)}
            class="range range-primary"
          />
        </div>
      </div>
    {:else}
      <div class="setting-block flex gap-5 pb-2 flex-col">
        <GeminiBasicConfig
          bind:geminiApiKey={settings.geminiApiKey}
          bind:selectedGeminiModel={settings.selectedGeminiModel}
        />
        <!-- Temperature Section for Basic Mode -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class=" text-text-secondary flex justify-between items-center">
            <span>Temperature</span>
            <span class="text-text-primary block font-bold"
              >{basicModeSettings.temperature.toFixed(2)}</span
            >
          </label>
          <div class="grid grid-cols-3 w-full gap-1">
            <ButtonSet
              title="Precise"
              class="setting-btn {basicModeSettings.temperature === 0.3
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('temperature', 0.3)}
              Description="0.3 - Less creative."
            ></ButtonSet>
            <ButtonSet
              title="Balanced"
              class="setting-btn {basicModeSettings.temperature === 0.7
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('temperature', 0.7)}
              Description="0.7 - Balanced."
            ></ButtonSet>
            <ButtonSet
              title="Creative"
              class="setting-btn {basicModeSettings.temperature === 0.9
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('temperature', 0.9)}
              Description="0.9 - More creative."
            ></ButtonSet>
          </div>
        </div>

        <!-- Top P Section for Basic Mode -->
        <div class="flex flex-col gap-2">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class=" text-text-secondary flex justify-between items-center">
            <span>Top P</span>
            <span class="text-text-primary block font-bold"
              >{basicModeSettings.topP.toFixed(2)}</span
            >
          </label>
          <div class="grid grid-cols-3 w-full gap-1">
            <ButtonSet
              title="Narrow"
              class="setting-btn {basicModeSettings.topP === 0.9
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('topP', 0.9)}
              Description="0.9 - Focus on most likely tokens."
            ></ButtonSet>
            <ButtonSet
              title="Balanced"
              class="setting-btn {basicModeSettings.topP === 0.95
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('topP', 0.95)}
              Description="0.95 - Broader range of tokens."
            ></ButtonSet>
            <ButtonSet
              title="Wide"
              class="setting-btn {basicModeSettings.topP === 0.98
                ? 'active'
                : ''}"
              onclick={() => handleUpdateSetting('topP', 0.98)}
              Description="0.98 - Wider range of tokens."
            ></ButtonSet>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
