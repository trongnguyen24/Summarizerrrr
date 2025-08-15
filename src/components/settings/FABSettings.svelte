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
</div>
