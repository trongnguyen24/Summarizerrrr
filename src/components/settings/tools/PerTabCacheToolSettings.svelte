<script>
  // @ts-nocheck
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
        Per-Tab Summary Cache
      </div>
      <div class="text-xs mt-2 pb-3 text-text-secondary text-pretty">
        Keep separate summary state for each browser tab.
      </div>
      <!-- Enable Tool Toggle -->
      <ToolEnableToggle
        id="pertabcache-enabled"
        bind:checked={toolSettings.enabled}
        onCheckedChange={(value) => updateToolSetting('enabled', value)}
        icon="heroicons:document-duplicate-20-solid"
        enabledText="Enabled"
        disabledText="Disabled"
      />
    </div>
  </div>

  {#if toolSettings.enabled}
    <!-- Clear Cache on Navigation -->
    <div>
      <span class="text-text-primary">Clear Cache on Navigation</span>
      <p class="mt-2 text-muted">
        Choose how the summary cache behaves when you navigate to a different
        URL within the same tab.
      </p>
      <div class="grid mt-3 grid-cols-2 gap-2">
        <ButtonSet
          title="Keep Summary"
          class="setting-btn {!toolSettings.autoResetOnNavigation
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoResetOnNavigation', false)}
          Description="Summary remains cached when navigating to a new page"
        >
          <Icon icon="heroicons:bookmark" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title="Auto Clear"
          class="setting-btn {toolSettings.autoResetOnNavigation
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoResetOnNavigation', true)}
          Description="Automatically clear summary when URL changes"
        >
          <Icon icon="heroicons:arrow-path" width="16" height="16" />
        </ButtonSet>
      </div>
    </div>

    <!-- Auto Scroll to Active Tab -->
    <div>
      <span class="text-text-primary">Auto Scroll to Active Tab</span>
      <p class="mt-2 text-muted">
        Automatically scroll to bring the active tab button into view.
      </p>
      <div class="grid mt-3 grid-cols-3 gap-2">
        <ButtonSet
          title="Off"
          class="setting-btn {toolSettings.autoScrollBehavior === 'off'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoScrollBehavior', 'off')}
          Description="Don't auto scroll"
        >
          <Icon icon="heroicons:x-mark" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title="Jump"
          class="setting-btn {toolSettings.autoScrollBehavior === 'jump'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoScrollBehavior', 'jump')}
          Description="Instant scroll"
        >
          <Icon icon="heroicons:bolt" width="16" height="16" />
        </ButtonSet>
        <ButtonSet
          title="Smooth"
          class="setting-btn {toolSettings.autoScrollBehavior === 'smooth'
            ? 'active'
            : ''}"
          onclick={() => updateToolSetting('autoScrollBehavior', 'smooth')}
          Description="Animated scroll"
        >
          <Icon icon="heroicons:sparkles" width="16" height="16" />
        </ButtonSet>
      </div>
    </div>
  {/if}
</div>

<style>
</style>
