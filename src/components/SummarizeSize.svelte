<script>
  import { settingsStore } from '../stores/settingsStore.svelte.js' // Import the settingsStore object

  // Access state and action via the imported object
  const { settings, updateSettings } = settingsStore
</script>

<div
  class="flex group relative flex-col text-xs items-center justify-center mt-4"
>
  <div
    class="transition-all ease-out duration-500 delay-300 opacity-0 -translate-y-1.5 blur-xs group-hover:blur-none group-hover:translate-y-0 group-hover:opacity-100"
  >
    Summary size
  </div>
  <div class="settingbar flex gap-2">
    <button
      onclick={() => updateSettings({ summaryLength: 'short' })}
      class={settingsStore.settings.summaryLength === 'short' ? 'active' : ''}
      >short</button
    >
    <button
      onclick={() => updateSettings({ summaryLength: 'medium' })}
      class={settingsStore.settings.summaryLength === 'medium' ? 'active' : ''}
      >medium</button
    >
    <button
      onclick={() => updateSettings({ summaryLength: 'long' })}
      class={settingsStore.settings.summaryLength === 'long' ? 'active' : ''}
      >long</button
    >
  </div>
</div>
