<script>
  // @ts-nocheck
  import { onDestroy } from 'svelte'
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import { isReduceMotionEnabled } from '@/services/animationService.js'

  let {
    tabs = [],
    activeTabId = null,
    onSelectTab = null,
    onRemoveTab = null,
    onPrevious = null,
    onNext = null,
  } = $props()

  const SCROLL_SPEED_MULTIPLIER = 1
  const DRAG_THRESHOLD_PX = 5
  const ANIMATION_DELAY_MS = 50
  const LERP_FACTOR = 0.15
  const LERP_THRESHOLD = 0.5

  let tabListContainer = $state(null)
  let isGrabbing = $state(false)
  let hasDragged = $state(false)
  let startX = $state(0)
  let scrollLeft = $state(0)
  let targetScrollLeft = $state(0)
  let currentScrollLeft = $state(0)
  let lerpAnimationId = $state(null)

  $effect(() => {
    const tabId = activeTabId
    const tabCount = tabs.length
    if (!tabId || tabCount === 0) return
    setTimeout(() => scrollToActiveTab(tabId), ANIMATION_DELAY_MS)
  })

  function scrollToActiveTab(tabId) {
    if (!tabListContainer) return
    const tabButton = tabListContainer.querySelector(`[data-tab-id="${tabId}"]`)
    if (!tabButton) return

    const containerWidth = tabListContainer.getBoundingClientRect().width
    const buttonWidth = tabButton.getBoundingClientRect().width
    const targetScroll =
      tabButton.offsetLeft - containerWidth / 2 + buttonWidth / 2
    const maxScroll = tabListContainer.scrollWidth - containerWidth
    const clampedTarget = Math.max(0, Math.min(targetScroll, maxScroll))

    if (!isReduceMotionEnabled()) {
      targetScrollLeft = clampedTarget
      currentScrollLeft = tabListContainer.scrollLeft
      startLerpAnimation()
    } else {
      tabListContainer.scrollLeft = clampedTarget
    }
  }

  function selectTab(tabId) {
    if (hasDragged) return
    onSelectTab?.(tabId)
  }

  function removeTab(event, tab) {
    event?.preventDefault()
    event?.stopPropagation()
    if (tab.removable === false) return
    onRemoveTab?.(tab.id)
  }

  function handleTabMiddleClick(event, tab) {
    if (event.button === 1 && tab.removable !== false) removeTab(event, tab)
  }

  function preventMiddleClickScroll(event) {
    if (event.button === 1) event.preventDefault()
  }

  function lerp(start, end, factor) {
    return start + (end - start) * factor
  }

  function animateLerp() {
    if (!tabListContainer) {
      lerpAnimationId = null
      return
    }
    currentScrollLeft = lerp(currentScrollLeft, targetScrollLeft, LERP_FACTOR)
    tabListContainer.scrollLeft = currentScrollLeft
    if (Math.abs(targetScrollLeft - currentScrollLeft) > LERP_THRESHOLD) {
      lerpAnimationId = requestAnimationFrame(animateLerp)
    } else {
      tabListContainer.scrollLeft = targetScrollLeft
      currentScrollLeft = targetScrollLeft
      lerpAnimationId = null
    }
  }

  function startLerpAnimation() {
    if (lerpAnimationId === null) {
      lerpAnimationId = requestAnimationFrame(animateLerp)
    }
  }

  function stopLerpAnimation() {
    if (lerpAnimationId !== null) {
      cancelAnimationFrame(lerpAnimationId)
      lerpAnimationId = null
    }
  }

  function cleanupGlobalMouseListeners() {
    document.removeEventListener('mousemove', handleGlobalMouseMove)
    document.removeEventListener('mouseup', handleGlobalMouseUp)
  }

  function handleGlobalMouseMove(event) {
    if (!isGrabbing || !tabListContainer) return
    event.preventDefault()
    const x = event.pageX - tabListContainer.offsetLeft
    const walk = (x - startX) * SCROLL_SPEED_MULTIPLIER
    if (Math.abs(x - startX) > DRAG_THRESHOLD_PX) hasDragged = true
    targetScrollLeft = scrollLeft - walk
    if (!isReduceMotionEnabled()) startLerpAnimation()
    else {
      tabListContainer.scrollLeft = targetScrollLeft
      currentScrollLeft = targetScrollLeft
    }
  }

  function handleGlobalMouseUp() {
    if (!isGrabbing) return
    isGrabbing = false
    if (tabListContainer) tabListContainer.style.cursor = 'grab'
    cleanupGlobalMouseListeners()
    if (hasDragged) setTimeout(() => (hasDragged = false), 10)
  }

  function handleMouseDown(event) {
    if (event.button !== 0 || !tabListContainer) return
    isGrabbing = true
    hasDragged = false
    startX = event.pageX - tabListContainer.offsetLeft
    scrollLeft = tabListContainer.scrollLeft
    tabListContainer.style.cursor = 'grabbing'
    currentScrollLeft = tabListContainer.scrollLeft
    targetScrollLeft = tabListContainer.scrollLeft
    stopLerpAnimation()
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }

  function handleWheel(event) {
    if (!tabListContainer) return
    event.preventDefault()
    const scrollAmount = event.deltaY || event.deltaX
    targetScrollLeft =
      tabListContainer.scrollLeft + scrollAmount * SCROLL_SPEED_MULTIPLIER
    const maxScroll =
      tabListContainer.scrollWidth - tabListContainer.clientWidth
    targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll))
    currentScrollLeft = tabListContainer.scrollLeft
    if (!isReduceMotionEnabled()) startLerpAnimation()
    else {
      tabListContainer.scrollLeft = targetScrollLeft
      currentScrollLeft = targetScrollLeft
    }
  }

  onDestroy(() => {
    cleanupGlobalMouseListeners()
    stopLerpAnimation()
  })
</script>

<div
  class="text-text-secondary relative bg-background-dark overflow-hidden w-full h-9 flex gap-px items-center"
>
    <div
      class="flex fixed gap-1.5 z-40 left-0 top-0 h-9 px-1.5 justify-center items-center"
    >
      <button
        onclick={() => onPrevious?.()}
        class="size-5 flex justify-center items-center relative z-20 bg-surface-1 hover:bg-surface-2 rounded-full transition-colors hover:text-text-primary shrink-0"
        title={$t('tab_navigation.previous_tab')}
      >
        <Icon icon="carbon:caret-left" width="14" height="14" />
      </button>
      <button
        onclick={() => onNext?.()}
        class="size-5 flex justify-center items-center relative z-20 bg-surface-1 hover:bg-surface-2 rounded-full transition-colors hover:text-text-primary shrink-0"
        title={$t('tab_navigation.next_tab')}
      >
        <Icon icon="carbon:caret-right" width="14" height="14" />
      </button>
      <div
        class="w-14 absolute z-10 left-0 top-0 h-8.5 bg-linear-to-r from-background-dark/70 to-background-dark/0 mask-r-from-50% backdrop-blur-[2px]"
      ></div>
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={tabListContainer}
      onmousedown={(event) => {
        preventMiddleClickScroll(event)
        handleMouseDown(event)
      }}
      onmousemove={handleGlobalMouseMove}
      onmouseup={handleGlobalMouseUp}
      onwheel={handleWheel}
      role="group"
      class="tab-list-container flex gap-0.5 font-mono pr-8 pl-15 z-10 relative h-full overflow-x-auto overflow-y-hidden scrollbar-hide flex-1 cursor-grab"
    >
      {#each tabs as tab (tab.id)}
        <div
          role="button"
          tabindex="0"
          data-tab-id={tab.id}
          onclick={() => selectTab(tab.id)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              selectTab(tab.id)
            }
          }}
          onauxclick={(event) => handleTabMiddleClick(event, tab)}
          class="tab-btn flex items-center group tab {tab.id === activeTabId
            ? 'bg-surface-1 tab-active  text-text-primary !border !border-b-0 !border-surface-2/50 dark:!border-border  '
            : ' hover:text-text-primary !border !border-b-0 !border-transparent'}"
          title={tab.title}
        >
          <span
            class="flex z-20 -translate-y-0.75 px-1.75 max-w-full w-full {tab.removable ===
            false
              ? ''
              : 'group-hover:w-[90%]'} duration-200 transition-all mask-alpha overflow-x-hidden mask-r-from-black mask-r-from-75% mask-r-to-90% select-none {tab.isLoading
              ? 'animate-pulse'
              : ''} {tab.hasError ? 'text-red-400' : ''} {tab.detached ? 'text-text-tertiary opacity-75' : ''}"
            >
            {#if tab.detached}
              <span
                class="inline-flex shrink-0 items-center mr-1"
                title={$t('chat.detached.tab_tooltip')}
                aria-hidden="true"
              >
                <Icon icon="carbon:unlink" width="13" height="13" />
              </span>
            {/if}
            {tab.title}
          </span>
          <div
            class="absolute tab-bg scale-90 group-hover:scale-100 w-[calc(100%-2px)] top-0.5 left-1/2 -translate-x-1/2 flex items-center gap-1 transition-all duration-150 ease-in-out group-hover:bg-surface-1 group-hover:dark:bg-surface-2 px-1.5 h-5 rounded-xl overflow-hidden"
          ></div>
          {#if tab.removable !== false}
            <button
              class="close-btn absolute z-30 right-0.5 top-1/2 -translate-y-3.25 bg-surface-2 p-0.5 rounded-full text-text-secondary hover:text-text-primary opacity-0 transition-all duration-200"
              onclick={(event) => removeTab(event, tab)}
              title={$t('tab_navigation.remove_tab')}
            >
              <Icon icon="heroicons:x-mark-16-solid" width="14" height="14" />
            </button>
          {/if}
          <span
            class="tab-round-l bg-surface-1 before:bg-background-dark before:!border-surface-2/70 dark:before:!border-border dark:before:bg-black"
          ></span>
          <span
            class="tab-round-r bg-surface-1 before:bg-background-dark before:!border-surface-2/70 dark:before:!border-border dark:before:bg-black"
          ></span>
        </div>
      {/each}
    </div>
  <div
    class="w-full right-0 left-0 absolute bottom-0 h-px dark:bg-border bg-surface-2/50"
  ></div>
</div>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .tab-list-container:hover :global(.close-btn),
  .tab-list-container .tab:hover :global(.close-btn) {
    opacity: 1;
  }
  .tab {
    cursor: pointer;
    height: 2rem;
    text-align: left;
    width: clamp(5rem, 2.5rem + 12.5vw, 7.5rem);
    border: 1px solid transparent;
    transform: translateY(6px);
    padding: 2px 0 2px 2px;
    font-size: 0.7rem;
    border-radius: 0.5rem 0.5rem 0 0;
    white-space: nowrap;
    flex-shrink: 0;
    .tab-round-l,
    .tab-round-r {
      opacity: 0;
      position: absolute;
      bottom: 0.125rem;
      left: 0;
      transform: translateX(-100%);
      width: 0.5rem;
      height: 0.5rem;
      overflow: hidden;
      &:before {
        content: '';
        position: absolute;
        top: 0;
        border: 1px solid transparent;
        left: 0;
        width: 200%;
        height: 200%;
        transform: translate(-50%, -50%);
        border-radius: 100%;
      }
    }
    .tab-round-l {
      left: 100%;
      transform: translateX(0);
      &::before {
        left: 100%;
      }
    }
  }
  .tab-active {
    z-index: 2;
    &::after {
      opacity: 0;
    }
    .tab-round-l,
    .tab-round-r {
      opacity: 1;
    }
    .tab-bg {
      background-color: transparent;
      transition-duration: 0ms;
    }
  }
</style>
