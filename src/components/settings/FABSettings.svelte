<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import { t } from 'svelte-i18n'
  import Preview from '../ui/Preview.svelte'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
</script>

<!-- FAB Section -->
<div class="setting-block flex flex-col pb-6 pt-5">
  <div class="flex flex-col gap-1 px-5">
    <label for="fab-settings-toggle" class="block font-bold text-text-primary"
      >{$t('settings.fab.title')}</label
    >
    <p class="flex text-muted">
      FAB help take open/close sidepanel and mobile drawer
    </p>
  </div>
  <div class="px-5 py-4 flex gap-4">
    <Preview title="Preview" class="w-60 h-40 shrink-0">
      <div
        class="absolute top-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10 text-gray-500/50 overflow-hidden rounded-4xl ease-in-out duration-800 transition-all
        {settings.floatButtonLeft
          ? 'rounded-l-none left-0 origin-left'
          : 'rounded-r-none left-[calc(100%-2.5rem)] origin-right'}
        {settings.showFloatingButton
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-85'}"
      >
        <div
          class=" bg-[hsl(224,35%,96%)] dark:bg-[#2D303E] flex justify-center items-center size-16"
        >
          <div
            class="rounded-4xl size-9 flex justify-center items-center border border-slate-500/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 16 16"
            >
              <path
                fill="currentColor"
                d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.5 7.5 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.5 7.5 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.5 7.5 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.5 7.5 0 0 0 4.464-4.464Z"
              />
            </svg>
          </div>
        </div>
      </div>
    </Preview>
    <div class="flex-auto">
      <div class="flex flex-col gap-2 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.general.floatingButton')}</label
        >
        <div class="grid w-full grid-cols-2 gap-1">
          <ButtonSet
            title={$t('settings.general.floating_button.hide')}
            class="setting-btn {!settings.showFloatingButton ? 'active' : ''}"
            onclick={() => handleUpdateSetting('showFloatingButton', false)}
            Description={$t('settings.general.floating_button.hide_desc')}
          >
            <Icon icon="heroicons:eye-slash-20-solid" width="20" height="20" />
          </ButtonSet>
          <ButtonSet
            title={$t('settings.general.floating_button.show')}
            class="setting-btn {settings.showFloatingButton ? 'active' : ''}"
            onclick={() => handleUpdateSetting('showFloatingButton', true)}
            Description={$t('settings.general.floating_button.show_desc')}
          >
            <Icon icon="heroicons:eye-20-solid" width="20" height="20" />
          </ButtonSet>
        </div>
      </div>

      <!-- FAB Position Section -->
      <div class="flex col-span-2 flex-col gap-2 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.fab.position')}</label
        >
        <div class="grid w-full grid-cols-2 gap-1">
          <ButtonSet
            title={$t('settings.fab.position_option.left')}
            class="setting-btn {settings.floatButtonLeft ? 'active' : ''}"
            onclick={() => handleUpdateSetting('floatButtonLeft', true)}
            Description={$t('settings.fab.position_option.left_desc')}
          ></ButtonSet>
          <ButtonSet
            title={$t('settings.fab.position_option.right')}
            class="setting-btn {!settings.floatButtonLeft ? 'active' : ''}"
            onclick={() => handleUpdateSetting('floatButtonLeft', false)}
            Description={$t('settings.fab.position_option.right_desc')}
          ></ButtonSet>
        </div>
      </div>
    </div>
  </div>
  <div class="flex flex-col gap-1 mt-2 px-5">
    <label for="fab-settings-toggle" class="block font-bold text-text-primary"
      >Bottom sheets</label
    >
    <p class="flex text-muted">
      A slide-up panel that emerges from the bottom of the mobile screen
    </p>
  </div>
  <div class="px-5 py-4 flex gap-4">
    <Preview title="Preview" class="w-60 h-40 shrink-0">
      <div
        class="w-40 z-30 border border-surface-2 absolute bottom-0 left-1/2 rounded-t-lg -translate-x-1/2 bg-surface-1 flex justify-center"
        style=" height:{settings.mobileSheetHeight}%"
      >
        <span class=" block w-6 h-1 rounded-2xl mt-1.5 bg-blackwhite/10"></span>

        <div></div>
      </div>
      <div
        class="absolute z-20 transition-opacity inset-0 bg-black/40 {settings.mobileSheetBackdropOpacity
          ? 'opacity-100'
          : 'opacity-0'}"
      ></div>
    </Preview>
    <div class="flex-auto">
      <!-- Mobile Sheet Height Section -->
      <div class="flex flex-col gap-2 px-5 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="text-text-secondary flex justify-between items-center">
          <span>Sheet Height</span>
          <span class="text-text-primary font-bold"
            >{settings.mobileSheetHeight}%</span
          >
        </label>
        <input
          type="range"
          min="40"
          max="100"
          step="1"
          bind:value={settings.mobileSheetHeight}
          onchange={(e) =>
            handleUpdateSetting('mobileSheetHeight', parseInt(e.target.value))}
          class="range range-primary"
        />
      </div>

      <!-- Mobile Sheet Backdrop Opacity Section -->
      <div class="flex flex-col gap-2 px-5 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary">Sheet Black Backdrop</label>
        <div class="grid w-full grid-cols-2 gap-1">
          <ButtonSet
            title="Hide"
            class="setting-btn {!settings.mobileSheetBackdropOpacity
              ? 'active'
              : ''}"
            onclick={() =>
              handleUpdateSetting('mobileSheetBackdropOpacity', false)}
            Description="No background overlay when opening mobile sheet"
          ></ButtonSet>
          <ButtonSet
            title="Show"
            class="setting-btn {settings.mobileSheetBackdropOpacity
              ? 'active'
              : ''}"
            onclick={() =>
              handleUpdateSetting('mobileSheetBackdropOpacity', true)}
            Description="Show background overlay when opening mobile sheet"
          ></ButtonSet>
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-1 mt-2 px-5">
    <label for="fab-settings-toggle" class="block font-bold text-text-primary"
      >Float Sidepanel</label
    >
    <p class="flex text-muted">
      A slide-up panel that emerges from the bottom of the mobile screen
    </p>
  </div>
  <div class="px-5 py-4 flex gap-4">
    <Preview title="Preview" class="w-60 h-40 shrink-0">
      <div
        class="top-0 z-30 border border-surface-2 absolute bottom-0 bg-surface-1 flex justify-center
        {settings.floatingPanelLeft ? 'left-0' : 'right-0'}"
        style="width: {settings.sidePanelDefaultWidth * 3}px"
      >
        <span
          class=" absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-1.5 border border-border rounded-2xl bg-surface-2 {settings.floatingPanelLeft
            ? 'left-full'
            : 'left-0'}"
        ></span>

        <div></div>
      </div>
    </Preview>
    <div class="flex-auto">
      <!-- Float Sidepanel Width Section -->
      <div class="flex flex-col gap-2 px-5 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="text-text-secondary flex justify-between items-center">
          <span>Panel Default Width</span>
          <span class="text-text-primary font-bold"
            >{settings.sidePanelDefaultWidth * 16}</span
          >
        </label>
        <input
          type="range"
          min="23.75"
          max="53.75"
          step="0.25"
          bind:value={settings.sidePanelDefaultWidth}
          onchange={(e) =>
            handleUpdateSetting(
              'sidePanelDefaultWidth',
              parseFloat(e.target.value)
            )}
          class="range range-primary"
        />
      </div>

      <div class="flex col-span-2 flex-col gap-2 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"></label>
        <div class="grid w-full grid-cols-2 gap-1">
          <ButtonSet
            title="Left"
            class="setting-btn {settings.floatingPanelLeft ? 'active' : ''}"
            onclick={() => handleUpdateSetting('floatingPanelLeft', true)}
            Description="Left"
          ></ButtonSet>
          <ButtonSet
            title="Right"
            class="setting-btn {!settings.floatingPanelLeft ? 'active' : ''}"
            onclick={() => handleUpdateSetting('floatingPanelLeft', false)}
            Description="Right"
          ></ButtonSet>
        </div>
      </div>
    </div>
  </div>
</div>
