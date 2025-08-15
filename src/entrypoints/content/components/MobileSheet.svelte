<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import MobileSummaryDisplay from '@/components/displays/mobile/MobileSummaryDisplay.svelte'
  import SummarizeButton from '@/components/buttons/SummarizeButton.svelte'
  import { useSummarization } from '../composables/useSummarization.svelte.js'
  import {
    lockBodyScroll,
    unlockBodyScroll,
  } from '../composables/scroll-freezer.js'

  let { visible, onclose } = $props()

  const summarization = useSummarization()
  let summaryToDisplay = $derived(summarization.summaryToDisplay())
  let statusToDisplay = $derived(summarization.statusToDisplay())

  let isDragging = false
  let startY
  let currentTranslateY
  let animationFrameId
  let drawerContainer, drawerBackdrop, drawerPanel, drawerHeader, drawerContent

  function openDrawer() {
    if (!drawerContainer) return
    drawerContainer.classList.remove('pointer-events-none')
    lockBodyScroll() // Lock body scroll when opening
    requestAnimationFrame(() => {
      drawerBackdrop.style.opacity = '1'
      drawerPanel.style.transform = 'translateY(0)'
    })
  }

  function closeDrawer() {
    if (!drawerContainer) return
    unlockBodyScroll() // Unlock body scroll when closing
    onclose?.()
  }

  $effect(() => {
    if (visible) {
      openDrawer()
    } else {
      if (drawerContainer) {
        // Unlock scroll immediately when starting to close
        unlockBodyScroll()
        // Run closing animation
        drawerBackdrop.style.opacity = '0'
        drawerPanel.style.transform = 'translateY(calc(100% + 10vh))'
        // Defer making it non-interactive to allow animation to finish
        setTimeout(() => {
          drawerContainer.classList.add('pointer-events-none')
        }, 400) // Match transition duration
      }
    }
  })

  function handleKeyDown(event) {
    if (visible && event.key === 'Escape') {
      closeDrawer()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('summarizeClick', handleSummarizeClick)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('summarizeClick', handleSummarizeClick)
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    // Ensure body scroll is unlocked on component unmount
    unlockBodyScroll()
  })

  // --- Drag/Swipe to close logic ---

  const onDragStart = (e) => {
    const target = e.target
    const isHeader = drawerHeader.contains(target)
    const isContent = drawerContent.contains(target)

    // Only start dragging if:
    // 1. Touched on the header.
    // OR
    // 2. Touched on the content area AND the content is scrolled to the top.
    if (isHeader || (isContent && drawerContent.scrollTop === 0)) {
      isDragging = true
      startY = e.pageY || e.touches[0].pageY
      drawerPanel.style.transition = 'none'
      drawerBackdrop.style.transition = 'none'

      // Body scroll is already locked when the sheet is open, no need for more
    } else {
      // Otherwise, allow content to scroll normally.
      isDragging = false
    }
  }

  const onDragging = (e) => {
    if (!isDragging) {
      // If not dragging the drawer, allow default behavior (e.g., scrolling content)
      return
    }

    // Prevent default touch behavior only when actively dragging the drawer
    e.preventDefault()

    const currentY = e.pageY || e.touches[0].pageY
    // Only allow pulling down (positive deltaY)
    const deltaY = Math.max(0, currentY - startY)
    currentTranslateY = deltaY

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(() => {
        drawerPanel.style.transform = `translateY(${currentTranslateY}px)`
        const panelHeight = drawerPanel.offsetHeight
        const opacity = 1 - (currentTranslateY / panelHeight) * 0.8
        drawerBackdrop.style.opacity = Math.max(0, opacity).toString()
        animationFrameId = null
      })
    }
  }

  const onDragEnd = () => {
    if (!isDragging) return
    isDragging = false

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    drawerPanel.style.transition = ''
    drawerBackdrop.style.transition = ''

    const panelHeight = drawerPanel.offsetHeight
    if (currentTranslateY > panelHeight / 4) {
      closeDrawer()
    } else {
      drawerBackdrop.style.opacity = '1'
      drawerPanel.style.transform = 'translateY(0)'
    }
  }

  function openSettings() {
    browser.runtime.sendMessage({ type: 'OPEN_SETTINGS' })
  }

  function handleSummarizeClick() {
    summarization.summarizePageContent()
  }
</script>

<!-- Drawer Container -->
<div
  bind:this={drawerContainer}
  class="fixed inset-0 z-[10000] pointer-events-none"
  role="dialog"
  aria-modal="true"
>
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={drawerBackdrop}
    class="drawer-backdrop absolute inset-0 bg-black/40 opacity-0"
    onclick={closeDrawer}
  ></div>

  <!-- Drawer Panel -->
  <div
    bind:this={drawerPanel}
    class="drawer-panel fixed bottom-0 left-0 right-0 bg-surface-1 text-black rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
    style="transform: translateY(calc(100% + 10vh));"
  >
    <!-- Drawer Header (Drag Handle)       onmousedown={onDragStart}
 -->
    <div
      bind:this={drawerHeader}
      class="p-4 cursor-grab active:cursor-grabbing drag-handle"
      ontouchstart={onDragStart}
    >
      <div
        class="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300"
      ></div>
    </div>

    <!-- Drawer Content -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={drawerContent}
      class="px-4 pb-4 flex-grow overflow-y-auto drawer-content"
      onmousedown={onDragStart}
      ontouchstart={onDragStart}
    >
      <div class="grid grid-rows-[160px_1fr]">
        <!-- <div
        class="top-stripes border-t border-b border-border flex justify-center items-center w-full h-full"
      ></div> -->
        <div class="w-full flex justify-center my-8">
          <SummarizeButton
            isLoading={statusToDisplay === 'loading'}
            isChapterLoading={false}
          />
        </div>
      </div>

      <MobileSummaryDisplay
        summary={summaryToDisplay}
        isLoading={statusToDisplay === 'loading'}
        error={summarization.localSummaryState().error}
      />
    </div>

    <!-- Action Button -->
    <!-- <div class="px-4 pb-4 flex-shrink-0">
      

      <button
        class="w-full bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition-colors"
        onclick={openSettings}
      >
        Settings
      </button>
    </div> -->
  </div>
</div>

<svelte:body
  onmousemove={onDragging}
  onmouseup={onDragEnd}
  ontouchmove={onDragging}
  ontouchend={onDragEnd}
/>

<style>
  /* Custom transition for drawer and backdrop */
  .drawer-panel,
  .drawer-backdrop {
    transition:
      transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
      opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  /* Ngăn chặn touch actions mặc định trên drag handle */
  .drag-handle {
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Ngăn chặn pull-to-refresh cho drawer content */
  .drawer-content {
    touch-action: pan-y;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  /* Remove tap highlight on mobile */
  * {
    -webkit-tap-highlight-color: transparent;
  }
</style>
