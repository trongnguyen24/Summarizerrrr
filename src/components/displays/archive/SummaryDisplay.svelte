<script>
  // @ts-nocheck
  import TOC from '@/components/navigation/TOCArchive.svelte'
  import DisplaySettingsControls from '@/components/displays/ui/DisplaySettingsControls.svelte'
  import ArchiveSummaryHeader from './ArchiveSummaryHeader.svelte'
  import ArchiveSummaryContent from './ArchiveSummaryContent.svelte'
  import ArchiveSummaryFooter from './ArchiveSummaryFooter.svelte'
  import { useDisplaySettings } from '@/composables/useDisplaySettings.svelte.js'
  import {
    FONT_SIZE_CLASSES,
    WIDTH_CLASSES,
    FONT_MAP,
  } from '@/lib/constants/displayConstants.js'

  const { selectedSummary, formatDate, activeTab } = $props()
  const { fontSizeIndex, widthIndex, settings } = useDisplaySettings()

  let activeTabId = $state(null)
  let tabs = $state([])

  // Effect để cập nhật tabs khi selectedSummary thay đổi
  $effect(() => {
    if (selectedSummary) {
      const newTabs = selectedSummary.summaries.map((subSummary, index) => ({
        id: `summary-tab-${index}`,
        label: subSummary.title,
      }))

      // Cập nhật tabs chỉ khi có sự thay đổi thực sự về nội dung
      if (JSON.stringify(tabs) !== JSON.stringify(newTabs)) {
        tabs = newTabs
      }
    } else {
      tabs = []
    }
  })

  // Effect để quản lý activeTabId khi tabs hoặc selectedSummary thay đổi
  $effect(() => {
    if (selectedSummary && tabs.length > 0) {
      // Chỉ cập nhật activeTabId nếu nó chưa được đặt hoặc nếu tab hiện tại không còn tồn tại trong danh sách mới
      if (!activeTabId || !tabs.some((tab) => tab.id === activeTabId)) {
        activeTabId = tabs[0].id
      }
    } else {
      activeTabId = null
    }
  })

  function onSelectTab(tabId) {
    activeTabId = tabId
  }

  const currentSummary = $derived(
    selectedSummary?.summaries.find(
      (_, index) => `summary-tab-${index}` === activeTabId
    )
  )
</script>

{#if selectedSummary}
  <div
    class="prose px-8 md:px-12 xl:px-20 w-full {WIDTH_CLASSES[
      $widthIndex
    ]} mx-auto {FONT_SIZE_CLASSES[$fontSizeIndex]} {FONT_MAP[
      settings.selectedFont
    ]} pt-12 pb-[35vh] summary-content"
  >
    <DisplaySettingsControls />

    <ArchiveSummaryHeader {selectedSummary} {formatDate} />

    <ArchiveSummaryContent
      {selectedSummary}
      {activeTabId}
      {tabs}
      {onSelectTab}
    />

    <ArchiveSummaryFooter {selectedSummary} {currentSummary} {activeTab} />
  </div>

  <TOC targetDivId="summary-content" />
{:else}
  <p class="text-center text-text-secondary">No summary selected.</p>
{/if}
