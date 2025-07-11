<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import TOC from '../TOC.svelte'
  import { addSummary } from '@/lib/indexedDBService'
  import { tabTitle } from '@/stores/tabTitleStore.svelte.js'

  let { summary, isLoading, error, pageUrl } = $props()
  let currentTitle = ''

  tabTitle.subscribe((value) => {
    currentTitle = value
  })
  $effect(() => {
    if (summary && !isLoading) {
      // Đảm bảo DOM đã được cập nhật trước khi làm nổi bật
      // Có thể cần một setTimeout nhỏ nếu DOM chưa sẵn sàng ngay lập tức
      // Tuy nhiên, $effect thường chạy sau khi DOM được cập nhật
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  })
</script>

{#if isLoading}
  <div class="text-center p-4 mx-auto text-text-secondary w-fit animate-pulse">
    Processing web summary...
  </div>
{/if}

{#if error}
  <div
    class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20"
  >
    <p class="text-sm">
      <span class="font-bold block">Wed summary error</span>
      {error}
    </p>
    <div class="plus-icon red-plus-icon top-left"></div>
    <div class="plus-icon red-plus-icon bottom-right"></div>
  </div>
{/if}

{#if summary && !isLoading}
  <div id="summary">
    {@html marked.parse(summary)}
    <button
      class="py-1 px-4 bg-blackwhite/5 hover:bg-blackwhite/10 rounded-md"
      onclick={async () => {
        const date = new Date().toISOString()
        const summaryToSave = {
          title: currentTitle,
          url: pageUrl,
          summary: summary,
          date: date,
        }
        try {
          await addSummary(summaryToSave)
          alert('Summary saved to archive!')
        } catch (error) {
          console.error('Error saving summary:', error)
          alert('Failed to save summary.')
        }
      }}>Save to Archive</button
    >
  </div>

  <TOC targetDivId="summary" />
{:else if !isLoading && !error}
  <!-- Optional: Add a placeholder if no summary and no error -->
  <!-- <p class="text-text-secondary text-center italic">No summary available.</p> -->
{/if}
