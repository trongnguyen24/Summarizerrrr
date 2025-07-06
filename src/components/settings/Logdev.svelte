<script>
  import { settings } from '../../stores/settingsStore.svelte.js'
  let settingsLog = $state('')
  $effect(() => {
    settingsLog = JSON.stringify(settings, null, 2)
  })
</script>

<details
  class=" fixed text-text-secondary border border-border bg-surface-2/80 backdrop-blur-lg top-0 left-0 z-50"
>
  <summary class="p-1">Log</summary>
  <pre
    class=" border-t w-2xl pt-4 border-border px-4 wrap-normal overflow-hidden">{settingsLog}
  </pre>
</details>
