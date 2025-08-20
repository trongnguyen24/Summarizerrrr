<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import { t } from 'svelte-i18n'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
</script>

<!-- FAB Section -->
<div class="setting-block flex flex-col pb-6 pt-5">
  <div class="flex h-6 items-center justify-between px-5">
    <label for="fab-settings-toggle" class="block font-bold text-text-primary"
      >{$t('settings.fab.title')}</label
    >
  </div>
  <div class="flex flex-col gap-2 px-5 pb-4">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-text-secondary"
      >{$t('settings.general.floatingButton')}</label
    >
    <div class="grid w-full grid-cols-2 gap-1">
      <ButtonSet
        title={$t('settings.general.floating_button.show')}
        class="setting-btn {settings.showFloatingButton ? 'active' : ''}"
        onclick={() => handleUpdateSetting('showFloatingButton', true)}
        Description={$t('settings.general.floating_button.show_desc')}
      >
        <Icon icon="heroicons:eye-20-solid" width="20" height="20" />
      </ButtonSet>
      <ButtonSet
        title={$t('settings.general.floating_button.hide')}
        class="setting-btn {!settings.showFloatingButton ? 'active' : ''}"
        onclick={() => handleUpdateSetting('showFloatingButton', false)}
        Description={$t('settings.general.floating_button.hide_desc')}
      >
        <Icon icon="heroicons:eye-slash-20-solid" width="20" height="20" />
      </ButtonSet>
    </div>
  </div>

  <!-- FAB Position Section -->
  <div class="flex flex-col gap-2 px-5 pb-4">
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
      >
        <Icon icon="heroicons:arrow-left-20-solid" width="20" height="20" />
      </ButtonSet>
      <ButtonSet
        title={$t('settings.fab.position_option.right')}
        class="setting-btn {!settings.floatButtonLeft ? 'active' : ''}"
        onclick={() => handleUpdateSetting('floatButtonLeft', false)}
        Description={$t('settings.fab.position_option.right_desc')}
      >
        <Icon icon="heroicons:arrow-right-20-solid" width="20" height="20" />
      </ButtonSet>
    </div>
  </div>

  <!-- Mobile Sheet Height Section -->
  <div class="flex flex-col gap-2 px-5 pb-4">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="text-text-secondary flex justify-between items-center">
      <span>Mobile Sheet Height</span>
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
      oninput={(e) =>
        handleUpdateSetting('mobileSheetHeight', parseInt(e.target.value))}
      class="range range-primary"
    />
  </div>
</div>
