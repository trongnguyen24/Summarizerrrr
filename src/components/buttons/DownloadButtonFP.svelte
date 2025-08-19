<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import ShadowTooltip from '@/lib/components/ShadowTooltip.svelte'
  import { marked } from 'marked'

  let { content, title } = $props()

  function downloadAsMarkdown() {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title || 'summary'}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function downloadAsHtml() {
    const htmlContent = marked(content)
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title || 'summary'}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
</script>

<ShadowTooltip content={$t('button.download_as_markdown')}>
  <button
    onclick={downloadAsMarkdown}
    class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200"
  >
    <Icon
      icon="heroicons:arrow-down-tray-solid"
      class="text-text-primary"
      width="20"
      height="20"
    />
  </button>
</ShadowTooltip>
