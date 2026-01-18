<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import Icon from '@iconify/svelte'
  import ToolIcon96 from '@/components/ui/ToolIcon96.svelte'
  import ToolEnableToggle from '@/components/inputs/ToolEnableToggle.svelte'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'

  // Computed value for tool settings with complete defaults
  let toolSettings = $derived.by(
    () =>
      settings.tools?.perTabCache ?? {
        enabled: true,
        autoResetOnNavigation: false,
        autoScrollBehavior: 'smooth',
      },
  )

  /**
   * Helper function to update tool setting
   */
  function updateToolSetting(key, value) {
    updateSettings({
      tools: {
        ...settings.tools,
        perTabCache: {
          ...settings.tools.perTabCache,
          [key]: value,
        },
      },
    })
  }
</script>

<div class="flex flex-col gap-6 py-5">
  <!-- Tool Header/Introduction -->
  <div class="flex gap-4">
    <div class="size-24 bg-background shrink-0 overflow-hidden relative">
      <ToolIcon96 animated={toolSettings.enabled} />
      <Icon
        icon="heroicons:document-duplicate-solid"
        class="size-8 center-abs text-muted dark:text-text-primary dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
      />
    </div>

    <div class="text-left">
      <div class="font-bold text-text-primary text-xs">
        {$t('settings.tools.perTabCache.title')}
      </div>
      <div class="text-xs mt-2 pb-3 text-text-secondary text-pretty">
        {$t('settings.tools.perTabCache.description')}
      </div>
      <!-- Enable Tool Toggle -->
      <ToolEnableToggle
        id="pertabcache-enabled"
        bind:checked={toolSettings.enabled}
        onCheckedChange={(value) => updateToolSetting('enabled', value)}
        icon="heroicons:document-duplicate-20-solid"
        enabledText={$t('settings.tools.perTabCache.enabled')}
        disabledText={$t('settings.tools.perTabCache.disabled')}
      />
    </div>
  </div>

  {#if toolSettings.enabled}
    <!-- Clear Cache on Navigation -->
    <div>
      <span class="text-text-primary"
        >{$t('settings.tools.perTabCache.clear_on_navigation.title')}</span
      >
      <p class="mt-2 text-muted">
        {$t('settings.tools.perTabCache.clear_on_navigation.description')}
      </p>
      <div class="grid mt-3 grid-cols-2 gap-2">
        <ButtonSet
          title={$t(
            'settings.tools.perTabCache.clear_on_navigation.keep_summary',
          )}
          class="setting-btn {!toolSettings.autoResetOnNavigation
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoResetOnNavigation', false)}
          Description={$t(
            'settings.tools.perTabCache.clear_on_navigation.keep_summary_desc',
          )}
        >
          <Icon icon="heroicons:bookmark" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title={$t(
            'settings.tools.perTabCache.clear_on_navigation.auto_clear',
          )}
          class="setting-btn {toolSettings.autoResetOnNavigation
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoResetOnNavigation', true)}
          Description={$t(
            'settings.tools.perTabCache.clear_on_navigation.auto_clear_desc',
          )}
        >
          <Icon icon="heroicons:arrow-path" width="16" height="16" />
        </ButtonSet>
      </div>
    </div>

    <!-- Auto Scroll to Active Tab -->
    <div>
      <span class="text-text-primary"
        >{$t('settings.tools.perTabCache.auto_scroll.title')}</span
      >
      <p class="mt-2 text-muted">
        {$t('settings.tools.perTabCache.auto_scroll.description')}
      </p>
      <div class="grid mt-3 grid-cols-3 gap-2">
        <ButtonSet
          title={$t('settings.tools.perTabCache.auto_scroll.off')}
          class="setting-btn {toolSettings.autoScrollBehavior === 'off'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoScrollBehavior', 'off')}
          Description={$t('settings.tools.perTabCache.auto_scroll.off_desc')}
        >
          <Icon icon="heroicons:x-mark" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title={$t('settings.tools.perTabCache.auto_scroll.jump')}
          class="setting-btn {toolSettings.autoScrollBehavior === 'jump'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoScrollBehavior', 'jump')}
          Description={$t('settings.tools.perTabCache.auto_scroll.jump_desc')}
        >
          <Icon icon="heroicons:bolt" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title={$t('settings.tools.perTabCache.auto_scroll.smooth')}
          class="setting-btn {toolSettings.autoScrollBehavior === 'smooth'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoScrollBehavior', 'smooth')}
          Description={$t('settings.tools.perTabCache.auto_scroll.smooth_desc')}
        >
          <Icon icon="heroicons:sparkles" width="16" height="16" />
        </ButtonSet>
      </div>
    </div>
    <div class="text-xs text-muted">
      {$t('settings.tools.perTabCache.blocking_note')}
    </div>
  {/if}
</div>

<style>
</style>
