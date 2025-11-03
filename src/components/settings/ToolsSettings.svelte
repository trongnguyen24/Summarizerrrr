<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import Icon from '@iconify/svelte'
  import DeepDiveToolSettings from './tools/DeepDiveToolSettings.svelte'

  // Persist expansion state với sessionStorage
  let expandedTool = $state(
    (typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('tools-expanded-tool')) ||
      null
  )

  /**
   * Toggle tool expansion với persistence
   */
  function toggleTool(toolName) {
    expandedTool = expandedTool === toolName ? null : toolName

    // Persist state
    if (typeof sessionStorage !== 'undefined') {
      if (expandedTool) {
        sessionStorage.setItem('tools-expanded-tool', expandedTool)
      } else {
        sessionStorage.removeItem('tools-expanded-tool')
      }
    }
  }
</script>

<div class="setting-block flex gap-5 pb-6 pt-5 flex-col">
  <div class="flex items-center h-6 justify-between px-5">
    <label class="block font-bold text-text-primary">Tools</label>
  </div>

  <div class="setting-secsion flex flex-col gap-4 px-5">
    <!-- Deep Dive Tool -->
    <div class="border border-border rounded-md overflow-hidden">
      <button
        class="w-full flex items-center justify-between p-4 hover:bg-surface-2 transition-colors"
        onclick={() => toggleTool('deepDive')}
      >
        <div class="flex items-center gap-3">
          <Icon
            icon="heroicons:light-bulb"
            width="24"
            height="24"
            class="text-primary"
          />
          <div class="text-left">
            <div class="font-bold text-text-primary">Deep Dive with AI</div>
            <div class="text-xs text-text-secondary">
              Generate follow-up questions and chat with AI
            </div>
          </div>
        </div>
        <Icon
          icon={expandedTool === 'deepDive'
            ? 'heroicons:chevron-up'
            : 'heroicons:chevron-down'}
          width="20"
          height="20"
        />
      </button>

      {#if expandedTool === 'deepDive'}
        <div class="border-t border-border p-4 bg-surface-1">
          <DeepDiveToolSettings />
        </div>
      {/if}
    </div>

    <!-- Future tools will be added here -->
    <div class="text-center text-text-secondary text-xs py-4">
      More tools coming soon...
    </div>
  </div>
</div>
