<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import ReusableSelect from '../inputs/ReusableSelect.svelte'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import { t } from 'svelte-i18n'
  import Preview from '../ui/Preview.svelte'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }

  let newWhitelistedDomain = $state()
  let newBlacklistedDomain = $state()

  // Simple helper to get current whitelist as array
  function getCurrentWhitelist() {
    return Array.isArray(settings.fabDomainControl?.whitelist)
      ? settings.fabDomainControl.whitelist
      : []
  }

  // Simple helper to get current blacklist as array
  function getCurrentBlacklist() {
    return Array.isArray(settings.fabDomainControl?.blacklist)
      ? settings.fabDomainControl.blacklist
      : []
  }

  // Helper to get current control mode
  function getCurrentMode() {
    return settings.fabDomainControl?.mode || 'all'
  }

  // Simple validation for domain patterns
  function isValidDomainPattern(pattern) {
    if (!pattern || typeof pattern !== 'string') return false

    // Allow letters, numbers, dots, hyphens, and asterisks
    const validChars = /^[a-zA-Z0-9.*-]+$/
    if (!validChars.test(pattern)) return false

    // Don't allow consecutive dots or starting/ending with dot (except wildcards)
    if (
      /\.{2,}/.test(pattern) ||
      (pattern.startsWith('.') && !pattern.startsWith('*.'))
    )
      return false
    if (pattern.endsWith('.') && !pattern.endsWith('.*')) return false

    return true
  }

  function addDomain(listType = 'whitelist') {
    const domain =
      listType === 'whitelist'
        ? newWhitelistedDomain.trim()
        : newBlacklistedDomain.trim()
    if (!domain) return

    // Validate domain pattern
    if (!isValidDomainPattern(domain)) {
      // Could show toast notification here
      console.warn('Invalid domain pattern:', domain)
      return
    }

    const currentList =
      listType === 'whitelist' ? getCurrentWhitelist() : getCurrentBlacklist()

    if (!currentList.includes(domain)) {
      const newList = [...currentList, domain]
      const updatedControl = {
        ...settings.fabDomainControl,
        [listType]: newList,
      }
      handleUpdateSetting('fabDomainControl', updatedControl)
    }

    // Always reset the input field after attempting to add
    if (listType === 'whitelist') {
      newWhitelistedDomain = ''
    } else {
      newBlacklistedDomain = ''
    }
  }

  function removeDomain(domainToRemove, listType = 'whitelist') {
    const currentList =
      listType === 'whitelist' ? getCurrentWhitelist() : getCurrentBlacklist()
    const newList = currentList.filter((d) => d !== domainToRemove)
    const updatedControl = {
      ...settings.fabDomainControl,
      [listType]: newList,
    }
    handleUpdateSetting('fabDomainControl', updatedControl)
  }

  function updateControlMode(mode) {
    const updatedControl = {
      ...settings.fabDomainControl,
      mode,
    }
    handleUpdateSetting('fabDomainControl', updatedControl)
  }

  // Items for ReusableSelect
  const controlModeItems = $derived([
    {
      value: 'all',
      label: $t('settings.fab.domain_control.all_sites'),
    },
    {
      value: 'whitelist',
      label: $t('settings.fab.domain_control.allowed_sites_only'),
    },
    {
      value: 'blacklist',
      label: $t('settings.fab.domain_control.blocked_sites'),
    },
  ])

  // Reactive variable for current mode
  let currentControlMode = $derived(getCurrentMode())

  function handleControlModeChange(newMode) {
    updateControlMode(newMode)
  }
</script>

<!-- FAB Section -->
<div class="setting-block flex flex-col pb-6 pt-6">
  <div class="flex flex-col gap-1 px-5">
    <label for="fab-settings-toggle" class="block font-bold text-text-primary"
      >{$t('settings.fab.title')}</label
    >
    <p class="flex text-muted">
      {$t('settings.fab.fab_note')}
    </p>
  </div>
  <div class="px-5 py-4 flex flex-col sm:flex-row gap-4">
    <Preview
      title={$t('settings.fab.preview')}
      class=" w-full sm:w-60 h-40 shrink-0 mx-auto"
    >
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

      <!-- One Click Summarize Section -->
      <div class="flex flex-col gap-2 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.fab.one_click_mode')}</label
        >
        <div class="grid w-full grid-cols-2 gap-1">
          <div class="flex col-span-2 flex-col gap-2 pb-4">
            <!-- svelte-ignore a11y_label_has_associated_control -->

            <div class="grid w-full grid-cols-2 gap-1">
              <ButtonSet
                title={$t('settings.fab.one_click_disabled_title')}
                class="setting-btn {!settings.oneClickSummarize
                  ? 'active'
                  : ''}"
                onclick={() => handleUpdateSetting('oneClickSummarize', false)}
                Description={$t('settings.fab.one_click_disabled_desc')}
              >
                <Icon
                  icon="heroicons:cursor-arrow-rays-20-solid"
                  width="20"
                  height="20"
                />
              </ButtonSet>
              <ButtonSet
                title={$t('settings.fab.one_click_enabled_title')}
                class="setting-btn {settings.oneClickSummarize ? 'active' : ''}"
                onclick={() => handleUpdateSetting('oneClickSummarize', true)}
                Description={$t('settings.fab.one_click_enabled_desc')}
              >
                <Icon icon="heroicons:bolt-20-solid" width="20" height="20" />
              </ButtonSet>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-1 mt-2 px-5">
    <label for="fab-settings-toggle" class="block font-bold text-text-primary"
      >{$t('settings.fab.mobile_sheets.title')}</label
    >
    <p class="flex text-muted">
      {$t('settings.fab.mobile_sheets.description')}
    </p>
  </div>
  <div class="px-5 py-4 flex flex-col sm:flex-row gap-4">
    <Preview
      title={$t('settings.fab.preview')}
      class=" w-full sm:w-60 h-40 shrink-0 mx-auto"
    >
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
      <div class="flex flex-col gap-2 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="text-text-secondary flex justify-between items-center">
          <span>{$t('settings.fab.mobile_sheets.sheet_height')}</span>
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
      <div class="flex flex-col gap-2 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('settings.fab.mobile_sheets.sheet_black_backdrop')}</label
        >
        <div class="grid w-full grid-cols-2 gap-1">
          <ButtonSet
            title={$t('settings.fab.mobile_sheets.hide_backdrop')}
            class="setting-btn {!settings.mobileSheetBackdropOpacity
              ? 'active'
              : ''}"
            onclick={() =>
              handleUpdateSetting('mobileSheetBackdropOpacity', false)}
            Description={$t('settings.fab.mobile_sheets.hide_backdrop_desc')}
          ></ButtonSet>
          <ButtonSet
            title={$t('settings.fab.mobile_sheets.show_backdrop')}
            class="setting-btn {settings.mobileSheetBackdropOpacity
              ? 'active'
              : ''}"
            onclick={() =>
              handleUpdateSetting('mobileSheetBackdropOpacity', true)}
            Description={$t('settings.fab.mobile_sheets.show_backdrop_desc')}
          ></ButtonSet>
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-1 mt-2 px-5">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label for="fab-settings-toggle" class="block font-bold text-text-primary"
      >{$t('settings.fab.float_sidepanel.title')}</label
    >
    <p class="flex text-muted">
      {$t('settings.fab.float_sidepanel.description')}
    </p>
  </div>
  <div class=" py-4 flex flex-col sm:flex-row gap-4 px-5">
    <Preview
      title={$t('settings.fab.preview')}
      class=" w-full sm:w-60 h-40 shrink-0 mx-auto"
    >
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
      <div class="flex flex-col gap-2 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="text-text-secondary flex justify-between items-center">
          <span>{$t('settings.fab.float_sidepanel.panel_default_width')}</span>
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
        <label class="block text-text-secondary"
          >{$t('settings.fab.auto_hide_outside_click')}</label
        >
        <div class="grid w-full grid-cols-2 gap-1">
          <ButtonSet
            title={$t('settings.fab.auto_hide_disabled_title')}
            class="setting-btn {!settings.closePanelOnOutsideClick
              ? 'active'
              : ''}"
            onclick={() =>
              handleUpdateSetting('closePanelOnOutsideClick', false)}
            Description={$t('settings.fab.auto_hide_disabled_desc')}
          ></ButtonSet>
          <ButtonSet
            title={$t('settings.fab.auto_hide_enabled_title')}
            class="setting-btn {settings.closePanelOnOutsideClick
              ? 'active'
              : ''}"
            onclick={() =>
              handleUpdateSetting('closePanelOnOutsideClick', true)}
            Description={$t('settings.fab.auto_hide_enabled_desc')}
          ></ButtonSet>
        </div>
      </div>
    </div>
  </div>
  <div class="flex flex-col gap-1 mt-2 px-5">
    <label for="fab-settings-toggle" class="block font-bold text-text-primary"
      >{$t('settings.fab.domain_control.title')}</label
    >
    <p class="flex text-muted">
      {$t('settings.fab.domain_control.description')}
    </p>
  </div>
  <div class="py-4 flex flex-col gap-4 px-5">
    <div class="w-full flex flex-col gap-1">
      <div class="w-full">
        <ReusableSelect
          items={controlModeItems}
          bind:bindValue={currentControlMode}
          onValueChangeCallback={handleControlModeChange}
          ariaLabel={$t('settings.fab.domain_control.aria_label')}
          className="w-full"
        />
      </div>
    </div>
    <div class="flex-auto">
      {#if getCurrentMode() !== 'all'}
        <div class="flex flex-col gap-2 pb-4">
          <div class="flex relative gap-1">
            {#if getCurrentMode() === 'whitelist'}
              <input
                type="text"
                placeholder={$t('settings.fab.domain_input_placeholder')}
                bind:value={newWhitelistedDomain}
                onkeydown={(e) => e.key === 'Enter' && addDomain('whitelist')}
                autocomplete="off"
                autocorrect="off"
                autocapitalize="none"
                spellcheck="false"
                inputmode="url"
                class="w-full pl-3 text-text-primary text-xs pr-9 h-8.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
              />
            {:else}
              <input
                type="text"
                placeholder={$t('settings.fab.domain_input_placeholder')}
                bind:value={newBlacklistedDomain}
                onkeydown={(e) => e.key === 'Enter' && addDomain('blacklist')}
                autocomplete="off"
                autocorrect="off"
                autocapitalize="none"
                spellcheck="false"
                inputmode="url"
                class="w-full pl-3 text-text-primary text-xs pr-9 h-8.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
              />
            {/if}
            <button
              onclick={() => addDomain(getCurrentMode())}
              class=" absolute top-0 right-0 w-8.5 h-8.5 flex justify-center items-center hover:text-text-primary transition-colors duration-150"
              ><Icon
                icon="heroicons:plus-circle-16-solid"
                width="16"
                height="16"
              /></button
            >
          </div>
        </div>
        {#if getCurrentMode() === 'whitelist'}
          <div
            class="grid relative overflow-hidden min-h-32 bg-background grid-cols-1 xs:grid-cols-2 p-2 gap-2"
          >
            <span
              class="absolute z-40 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
            ></span>
            <div
              class="absolute pointer-events-none bg-dot z-20 border border-border inset-0"
            ></div>

            {#each getCurrentWhitelist() as domain}
              <div
                class="flex gap-2 z-30 h-8 overflow-hidden relative justify-between items-center bg-surface-2 text-text-secondary pl-3 text-xs"
              >
                <span
                  class="absolute z-20 size-3 rotate-45 border border-border bg-background bottom-px left-px -translate-x-1/2 translate-y-1/2"
                ></span>
                <div
                  class="absolute pointer-events-none z-10 border border-border inset-0"
                ></div>
                <span>{domain}</span>
                <button
                  onclick={() => removeDomain(domain, 'whitelist')}
                  class="p-2 border-l border-blackwhite/5 transition-colors duration-150 bg-transparent hover:bg-blackwhite/5"
                >
                  <Icon
                    icon="heroicons:minus-16-solid"
                    width="16"
                    height="16"
                  />
                </button>
              </div>
            {/each}
            <div
              class="flex items-center text-center col-span-2 justify-center font-medium text-text-secondary text-xs"
            >
              {$t('settings.fab.domain_whitelist_helper')}
            </div>
          </div>
        {:else if getCurrentMode() === 'blacklist'}
          <div
            class="grid relative overflow-hidden bg-background min-h-32 grid-cols-2 p-2 gap-2"
          >
            <span
              class="absolute z-40 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
            ></span>
            <div
              class="absolute pointer-events-none bg-dot z-20 border border-border inset-0"
            ></div>

            {#each getCurrentBlacklist() as domain}
              <div
                class="flex gap-2 z-30 h-8 overflow-hidden relative justify-between items-center bg-surface-2 text-text-secondary pl-3 text-xs"
              >
                <span
                  class="absolute z-20 size-3 rotate-45 border border-border bg-background bottom-px left-px -translate-x-1/2 translate-y-1/2"
                ></span>
                <div
                  class="absolute pointer-events-none z-10 border border-border inset-0"
                ></div>
                <p class=" flex-auto line-clamp-1">{domain}</p>
                <button
                  onclick={() => removeDomain(domain, 'blacklist')}
                  class="p-2 border-l border-blackwhite/5 transition-colors duration-150 bg-transparent hover:bg-blackwhite/5"
                >
                  <Icon
                    icon="heroicons:minus-16-solid"
                    width="16"
                    height="16"
                  />
                </button>
              </div>
            {/each}

            <div
              class="flex mx-auto text-center col-span-2 items-center justify-center font-medium text-text-secondary text-xs"
            >
              {$t('settings.fab.domain_blacklist_helper')}
            </div>
          </div>
        {/if}
      {/if}
      {#if getCurrentMode() === 'all'}
        <div
          class="grid relative overflow-hidden min-h-32 bg-background p-2 gap-2"
        >
          <span
            class="absolute z-40 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <div
            class="absolute pointer-events-none bg-dot z-20 border border-border inset-0"
          ></div>
          <div
            class="flex items-center justify-center font-medium text-text-secondary text-xs"
          >
            {$t('settings.fab.domain_all_helper')}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
