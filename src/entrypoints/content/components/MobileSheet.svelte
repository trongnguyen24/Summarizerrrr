<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import MobileSummaryDisplay from '@/components/displays/mobile/MobileSummaryDisplay.svelte'
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
  let drawerContainer, drawerBackdrop, drawerPanel, drawerHeader

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
        drawerPanel.style.transform = 'translateY(100%)'
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
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    // Ensure body scroll is unlocked on component unmount
    unlockBodyScroll()
  })

  // --- Drag/Swipe to close logic ---

  const onDragStart = (e) => {
    e.preventDefault() // Ngăn chặn scroll mặc định ngay từ đầu
    isDragging = true
    startY = e.pageY || e.touches[0].pageY
    drawerPanel.style.transition = 'none'
    drawerBackdrop.style.transition = 'none'

    // Body scroll đã được lock khi sheet mở, không cần thêm gì

    document.addEventListener('mousemove', onDragging)
    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('touchmove', onDragging, { passive: false })
    document.addEventListener('touchend', onDragEnd)
  }

  const onDragging = (e) => {
    if (!isDragging) return
    e.preventDefault()

    const currentY = e.pageY || e.touches[0].pageY
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

    // Body scroll vẫn được lock, không cần làm gì thêm

    document.removeEventListener('mousemove', onDragging)
    document.removeEventListener('mouseup', onDragEnd)
    document.removeEventListener('touchmove', onDragging)
    document.removeEventListener('touchend', onDragEnd)

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
  <div
    bind:this={drawerBackdrop}
    class="drawer-backdrop absolute inset-0 bg-black/40 opacity-0"
    onclick={closeDrawer}
  ></div>

  <!-- Drawer Panel -->
  <div
    bind:this={drawerPanel}
    class="drawer-panel fixed bottom-0 left-0 right-0 bg-white text-black rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
    style="transform: translateY(100%);"
  >
    <!-- Drawer Header (Drag Handle) -->
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
    <div class="px-4 pb-4 flex-grow overflow-y-auto">
      <MobileSummaryDisplay
        summary={summaryToDisplay}
        isLoading={statusToDisplay === 'loading'}
        error={summarization.localSummaryState().error}
      />
    </div>

    <!-- Action Button -->
    <div class="px-4 pb-4 flex-shrink-0">
      <button
        class="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
        onclick={summarization.summarizePageContent}
      >
        Summarize
      </button>
    </div>
  </div>
</div>

<style>
  /* Custom transition for drawer and backdrop */
  .drawer-panel,
  .drawer-backdrop {
    transition:
      transform 0.4s cubic-bezier(0.32, 0.72, 0, 1),
      opacity 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* Ngăn chặn touch actions mặc định trên drag handle */
  .drag-handle {
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Remove tap highlight on mobile */
  * {
    -webkit-tap-highlight-color: transparent;
  }
</style>
