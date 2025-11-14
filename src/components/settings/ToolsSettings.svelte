<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import Icon from '@iconify/svelte'
  import DeepDiveToolSettings from './tools/DeepDiveToolSettings.svelte'
  import ToolIcon from '../ui/ToolIcon.svelte'

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

<div class="setting-block flex gap-5 pb-6 flex-col">
  <!-- Deep Dive Tool -->
  <div class="overflow-hidden">
    <button
      class="w-full flex items-center justify-between p-4 hover:bg-surface-2 transition-colors"
      onclick={() => toggleTool('deepDive')}
    >
      <div class="flex items-center gap-3">
        <div class="size-16 shrink-0 overflow-hidden relative">
          <ToolIcon />
          <Icon
            icon="heroicons:sparkles-solid"
            class="size-6 center-abs text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
          />
        </div>

        <div class="text-left">
          <div class="font-bold text-text-primary">Deep Dive Questions</div>
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
</div>
