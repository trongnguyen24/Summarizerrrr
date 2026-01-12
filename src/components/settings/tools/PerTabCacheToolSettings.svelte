<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import Icon from '@iconify/svelte'
  import ToolIcon96 from '@/components/ui/ToolIcon96.svelte'
  import ToolEnableToggle from '@/components/inputs/ToolEnableToggle.svelte'

  // Computed value for tool settings
  let toolSettings = $derived.by(
    () => settings.tools?.perTabCache ?? { enabled: true },
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

      <!-- Auto Reset Toggle -->
      {#if toolSettings.enabled}
        <div class="mt-4 pt-3 border-t border-border">
          <ToolEnableToggle
            id="pertabcache-autoreset"
            bind:checked={toolSettings.autoResetOnNavigation}
            onCheckedChange={(value) =>
              updateToolSetting('autoResetOnNavigation', value)}
            icon="heroicons:arrow-path-20-solid"
            enabledText="Auto-reset on URL change"
            disabledText="Keep summary on navigation"
          />
        </div>
      {/if}
    </div>
  </div>
</div>
