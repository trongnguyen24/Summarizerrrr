<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { fade } from 'svelte/transition'
  import {
    historyFilterStore,
    setContentTypeFilter,
    clearContentTypeFilter,
    isContentTypeSelected,
  } from '@/stores/historyFilterStore.svelte.js'
  import { getAvailableContentTypes } from '@/lib/utils/contentTypeDetector.js'

  // Get available content types
  const contentTypes = getAvailableContentTypes()

  // Filter functions
  function handleContentTypeClick(contentType) {
    if (isContentTypeSelected(contentType)) {
      clearContentTypeFilter()
    } else {
      setContentTypeFilter(contentType)
    }
  }

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  let isTouchScreen = $state(false)

  // Effects
  $effect(() => {
    isTouchScreen = isTouchDevice()
  })
</script>

<div class="pt-2 pb-4 mb-2 border-b border-border/50">
  <h3
    class="mb-2 px-2 text-xs font-semibold tracking-wider uppercase text-text-muted"
  >
    Content Type
  </h3>

  <!-- Horizontal layout with 3 icons -->
  <div class="flex gap-2 px-2">
    {#each contentTypes as contentType (contentType.type)}
      <button
        class="flex-1 flex flex-col items-center gap-1 p-2 rounded-md transition-colors duration-200 {isContentTypeSelected(
          contentType.type
        )
          ? 'bg-surface-2 text-text-primary'
          : 'hover:bg-blackwhite/5 text-text-secondary'}"
        onclick={() => handleContentTypeClick(contentType.type)}
        aria-label={`Filter by ${contentType.label} content`}
        aria-pressed={isContentTypeSelected(contentType.type)}
        title={contentType.label}
      >
        <div class="size-6 relative">
          <Icon
            icon={contentType.icon}
            width="24"
            height="24"
            class="transition-colors duration-200"
          />
        </div>
        <span class="text-xs font-medium">
          {contentType.label}
        </span>
      </button>
    {/each}
  </div>
</div>
