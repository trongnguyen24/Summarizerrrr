<script>
  import { settings } from '../../stores/settingsStore.svelte.js'
  import { themeSettings } from '../../stores/themeStore.svelte.js' // Import themeSettings

  let settingsLog = $state('')

  $effect(() => {
    // Đảm bảo cả settings và themeSettings.theme đều được truy cập để $effect phản ứng
    settingsLog = JSON.stringify(settings, null, 2)
    // Truy cập themeSettings.theme để $effect theo dõi sự thay đổi của nó
  })
</script>

<details
  class=" fixed text-text-secondary border border-border bg-surface-2/80 backdrop-blur-lg top-0 left-0 z-50"
>
  <summary class="p-1">Log</summary>
  <pre
    class=" border-t w-2xl pt-4 border-border px-4 wrap-normal overflow-hidden">
Theme: {themeSettings.theme}
Settings: {settingsLog}
  </pre>
</details>
