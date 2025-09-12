<script>
  import { settings } from '../../stores/settingsStore.svelte.js'
  import { themeSettings } from '../../stores/themeStore.svelte.js' // Import themeSettings
  import hljs from 'highlight.js/lib/core'
  import json from 'highlight.js/lib/languages/json'
  import 'highlight.js/styles/github-dark.css'

  hljs.registerLanguage('json', json)

  let highlightedCode = $state('')

  $effect(() => {
    highlightedCode = hljs.highlight(settingsLog, { language: 'json' }).value
  })

  let settingsLog = $state('')

  $effect(() => {
    // Đảm bảo cả settings và themeSettings.theme đều được truy cập để $effect phản ứng
    settingsLog = JSON.stringify(settings, null, 2)
    // Truy cập themeSettings.theme để $effect theo dõi sự thay đổi của nó
  })
</script>

<details
  class=" fixed z-[99999999] text-xs max-h-svh overflow-auto text-text-secondary border border-border bg-surface-2/80 backdrop-blur-lg top-0 left-0"
>
  <summary class="p-1">Log</summary>
  <pre
    class="border-t w-2xl pt-4 border-border px-4 wrap-normal overflow-hidden">
    
<code class="language-json">{@html highlightedCode}</code>


  </pre>
</details>
