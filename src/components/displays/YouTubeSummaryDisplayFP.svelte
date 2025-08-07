<script>
  // @ts-nocheck
  import TabbedSummaryDisplay from './TabbedSummaryDisplay.svelte'
  import GenericSummaryDisplayFP from './GenericSummaryDisplayFP.svelte'
  import TOC from '@/components/navigation/TOC.svelte'

  let {
    summary = '',
    chapterSummary = '',
    isLoading = false,
    isChapterLoading = false,
    activeYouTubeTab = 'videoSummary',
    onSelectTab = null,
  } = $props()

  const youtubeTabs = $derived([
    {
      id: 'videoSummary',
      label: 'Summary',
      show: true,
      isLoading,
    },
    {
      id: 'chapterSummary',
      label: 'Chapters',
      show: true,
      isLoading: isChapterLoading,
    },
  ])

  function handleSelectTab(tabId) {
    onSelectTab?.(tabId)
  }
</script>

<TabbedSummaryDisplay
  tabs={youtubeTabs}
  activeTab={activeYouTubeTab}
  onSelectTab={handleSelectTab}
>
  <div hidden={activeYouTubeTab !== 'videoSummary'}>
    <GenericSummaryDisplayFP
      {summary}
      {isLoading}
      loadingText="Processing main YouTube summary..."
      targetId="fp-youtube-video-summary-display"
    />
    {#if activeYouTubeTab === 'videoSummary' && summary}
      <TOC targetDivId="fp-youtube-video-summary-display" />
    {/if}
  </div>
  <div hidden={activeYouTubeTab !== 'chapterSummary'}>
    <GenericSummaryDisplayFP
      summary={chapterSummary}
      isLoading={isChapterLoading}
      loadingText="Generating chapter summary..."
      targetId="fp-youtube-chapter-summary-display"
    />
    {#if activeYouTubeTab === 'chapterSummary' && chapterSummary}
      <TOC targetDivId="fp-youtube-chapter-summary-display" />
    {/if}
  </div>
</TabbedSummaryDisplay>
