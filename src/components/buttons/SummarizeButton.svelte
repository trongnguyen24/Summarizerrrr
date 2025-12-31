<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { animate, stagger } from 'animejs'
  import { onMount } from 'svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import {
    stopStreaming,
    fetchAndSummarize,
  } from '@/stores/summaryStore.svelte.js'

  // Props received from App.svelte
  let { isLoading, disabled = false, onStop = null, onClick = null } = $props()

  // Element references for shadow DOM compatibility
  let buttonElement
  let backgroundElement
  let animaeTextElements = []
  let animaeText2Elements = []

  // State for hover and stopping
  let isHovered = $state(false)
  let isDebouncing = $state(false)

  // Event dispatcher
  const dispatch = () => {
    const customEvent = new CustomEvent('summarizeClick')
    document.dispatchEvent(customEvent)
  }

  // Handle click based on state
  const handleClick = () => {
    if (isDebouncing) return

    // Apply debounce
    isDebouncing = true
    setTimeout(() => {
      isDebouncing = false
    }, 300)

    if (isLoading) {
      // Nếu có onStop callback (FloatingPanel), dùng nó
      if (onStop) {
        onStop()
      } else {
        // Fallback cho sidepanel (dùng summaryStore)
        stopStreaming()
      }
    } else {
      if (onClick) {
        onClick()
      } else {
        fetchAndSummarize()
      }
    }
  }

  // Define keyframes for .animae-text animation
  const textAnimationKeyframes = {
    translateY: [
      { to: '-0.3rem', ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: '-0.3rem', ease: 'inQuad', duration: 3600 },
      { to: 0, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 0, ease: 'inQuad', duration: 3600 },
    ],
    opacity: [
      { to: 0, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 0, ease: 'inQuad', duration: 3600 },
      { to: 1, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 1, ease: 'inQuad', duration: 3600 },
    ],
    rotateX: [
      { to: 80, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 80, ease: 'inQuad', duration: 3600 },
      { to: 0, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 0, ease: 'inQuad', duration: 3600 },
    ],
    filter: [
      { to: 'blur(2px)', ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 'blur(2px)', ease: 'inQuad', duration: 3600 },
      { to: 'blur(0px)', ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 'blur(0px)', ease: 'inQuad', duration: 3600 },
    ],
  }

  // Define keyframes for .animae-text-2 animation
  const text2AnimationKeyframes = {
    opacity: [
      { to: 0, ease: 'inQuad', duration: 400 },
      { to: 1, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 1, ease: 'inQuad', duration: 2800 },
      { to: 0, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 0, ease: 'inQuad', duration: 4000 },
    ],
    translateY: [
      { to: '0.3rem', ease: 'inQuad', duration: 400 },
      { to: 0, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 0, ease: 'inQuad', duration: 2800 },
      { to: '0.3rem', ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: '0.3rem', ease: 'inQuad', duration: 4000 },
    ],
    rotateX: [
      { to: 80, ease: 'inQuad', duration: 400 },
      { to: 0, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 0, ease: 'inQuad', duration: 2800 },
      { to: 80, ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 80, ease: 'inQuad', duration: 4000 },
    ],
    filter: [
      { to: 'blur(2px)', ease: 'inQuad', duration: 400 },
      { to: 'blur(0px)', ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 'blur(0px)', ease: 'inQuad', duration: 2800 },
      { to: 'blur(2px)', ease: 'inQuad', duration: 400, delay: stagger(50) },
      { to: 'blur(2px)', ease: 'inQuad', duration: 4000 },
    ],
  }

  // Effect to handle animations and style changes based on state
  $effect(() => {
    if (buttonElement && backgroundElement) {
      if (isLoading) {
        if (isHovered) {
          // Loading + Hover = Stop State (Red)
          animate(buttonElement, {
            color: 'var(--color-blackwhite)',
            duration: 200,
            easing: 'easeInOutQuad',
          })
          animate(backgroundElement, {
            top: 36,
            left: 16,
            width: '24px',
            height: 4,
            duration: 300,
            easing: 'easeInOutQuad',
          })
        } else {
          // Loading + No Hover = Loading State (Spinner)
          animate(buttonElement, {
            color: 'var(--color-blackwhite)',
            duration: 300,
            easing: 'easeInOutQuad',
          })
          animate(backgroundElement, {
            top: 36,
            left: 16,
            width: '24px',
            height: 4,
            backgroundColor: '#ffffff', // Reset to white
            duration: 300,
            easing: 'easeInOutQuad',
          })
        }
      } else {
        // Idle State (Summarize)
        animate(buttonElement, {
          color: 'var(--color-summarize)',
          duration: 300,
          easing: 'easeInOutQuad',
        })
        animate(backgroundElement, {
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff', // Reset to white
          duration: 300,
          easing: 'easeInOutQuad',
        })
      }
    }
  })

  // Animation function for text
  onMount(() => {
    if (animaeTextElements.length > 0) {
      animate(animaeTextElements, {
        ...textAnimationKeyframes,
        loop: true,
      })
    }

    if (animaeText2Elements.length > 0) {
      animate(animaeText2Elements, {
        ...text2AnimationKeyframes,
        loop: true,
      })
    }
  })
</script>

<button
  bind:this={buttonElement}
  class="relative font-mono summarize p-[1em] pl-[1em] pr-[1.5em] overflow-hidden text-black flex outline-offset-2 items-center rounded-full gap-[0.5em] w-fit h-[3em] transition-colors duration-200"
  class:!outline-red-400={isLoading && isHovered}
  class:!outline-primary={!isLoading || !isHovered}
  class:cursor-wait={isDebouncing}
  onclick={handleClick}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
  disabled={disabled || isDebouncing}
  title={isLoading ? 'Stop Streaming' : 'Summarize'}
>
  <div
    class="text-inherit relative z-10 size-[1.5em] flex items-center justify-center"
  >
    {#if isLoading && isHovered}
      <span
        transition:slideScaleFade={{
          duration: 200,
          slideFrom: 'bottom',
          startScale: 0.8,
          slideDistance: '0rem',
          startBlur: 1,
        }}
        class="absolute inset-0 text-error"
      >
        <Icon width={24} icon="heroicons:stop-solid" />
      </span>
    {:else if isLoading && !isHovered}
      <!-- Spinner -->
      <span
        transition:slideScaleFade={{
          duration: 200,
          slideFrom: 'bottom',
          startScale: 0.8,
          slideDistance: '0rem',
          startBlur: 1,
        }}
        class="absolute inset-0 text-primary"
      >
        <Icon width={24} icon="svg-spinners:bouncing-ball" />
      </span>
    {:else}
      <!-- Sparkle Icon -->
      <span
        transition:slideScaleFade={{
          duration: 200,
          slideFrom: 'bottom',
          startScale: 0.8,
          slideDistance: '0rem',
          startBlur: 1,
        }}
        class="absolute inset-0 text-primary z"
      >
        <Icon width={24} icon="octicon:sparkle-fill-16" />
      </span>
    {/if}
  </div>

  <div class="grid z-10 grid-cols-1 grid-rows-1 text-[1.125em]">
    <!-- Summarize Text Animation -->
    <div class="flex col-start-1 row-start-1 gap-px">
      <span bind:this={animaeTextElements[0]} class="animae-text">S</span>
      <span bind:this={animaeTextElements[1]} class="animae-text">u</span>
      <span bind:this={animaeTextElements[2]} class="animae-text">m</span>
      <span bind:this={animaeTextElements[3]} class="animae-text">m</span>
      <span bind:this={animaeTextElements[4]} class="animae-text">a</span>
      <span bind:this={animaeTextElements[5]} class="animae-text">r</span>
      <span bind:this={animaeTextElements[6]} class="animae-text">i</span>
      <span bind:this={animaeTextElements[7]} class="animae-text">z</span>
      <span bind:this={animaeTextElements[8]} class="animae-text">e</span>
    </div>
    <div class="flex col-start-1 row-start-1 gap-px">
      <span bind:this={animaeText2Elements[0]} class="animae-text-2 opacity-0"
        >S</span
      >
      <span bind:this={animaeText2Elements[1]} class="animae-text-2 opacity-0"
        >u</span
      >
      <span bind:this={animaeText2Elements[2]} class="animae-text-2 opacity-0"
        >m</span
      >
      <span bind:this={animaeText2Elements[3]} class="animae-text-2 opacity-0"
        >m</span
      >
      <span bind:this={animaeText2Elements[4]} class="animae-text-2 opacity-0"
        >a</span
      >
      <span bind:this={animaeText2Elements[5]} class="animae-text-2 opacity-0"
        >r</span
      >
      <span bind:this={animaeText2Elements[6]} class="animae-text-2 opacity-0"
        >i</span
      >
      <span bind:this={animaeText2Elements[7]} class="animae-text-2 opacity-0"
        >z</span
      >
      <span bind:this={animaeText2Elements[8]} class="animae-text-2 opacity-0"
        >e</span
      >
    </div>
  </div>

  <div
    bind:this={backgroundElement}
    class="bg-white summarize-bg absolute z-0 w-full left-0 h-full rounded-full"
  ></div>
</button>
