<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { animate, stagger } from 'animejs'
  import { onMount } from 'svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import { on } from 'svelte/events'

  // Props received from App.svelte (or directly from summaryStore if desired)
  let { isLoading, isChapterLoading } = $props()

  // Element references for shadow DOM compatibility
  let buttonElement
  let backgroundElement
  let animaeTextElements = []
  let animaeText2Elements = []

  // Event dispatcher to notify when the button is clicked
  const dispatch = () => {
    const customEvent = new CustomEvent('summarizeClick')
    document.dispatchEvent(customEvent) // Dispatch to document or a specific element
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

  // if isLoading || isChapterLoading is true
  $effect(() => {
    if (buttonElement && backgroundElement) {
      if (isLoading || isChapterLoading) {
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
          duration: 300,
          easing: 'easeInOutQuad',
        })
      } else {
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
          duration: 300,
          easing: 'easeInOutQuad',
        })
      }
    }
  })

  // Animation function
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
  class="relative summarize p-[1em] pl-[1em] pr-[1.5em] overflow-hidden text-black flex outline-offset-2 !outline-primary items-center rounded-full gap-[0.5em] w-fit h-[3em]"
  onclick={dispatch}
  disabled={isLoading || isChapterLoading}
  title="Summarize"
>
  <div class="text-primary relative z-10 size-[1.5em]">
    {#if isLoading || isChapterLoading}
      <span transition:slideScaleFade>
        <Icon
          width={24}
          icon="svg-spinners:bouncing-ball"
          class="absolute inset-0"
        />
      </span>
    {:else}
      <!--  octicon:sparkle-fill-16 -->
      <span transition:slideScaleFade>
        <Icon
          class="absolute inset-0"
          width={24}
          icon="octicon:sparkle-fill-16"
        />
      </span>
    {/if}
  </div>
  <div class="grid z-10 grid-cols-1 grid-rows-1 text-[1.125em]">
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
