<script>
  import Icon from '@iconify/svelte'
  import { animate, stagger } from 'animejs'
  import { onMount } from 'svelte'
  import { slideScaleFade } from '../lib/slideScaleFade.js' // Assuming path is correct
  import { on } from 'svelte/events'

  // Props received from App.svelte (or directly from summaryStore if desired)
  let { isLoading, isChapterLoading } = $props()

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
    const button = document.querySelector('.summarize')
    if (button) {
      if (isLoading || isChapterLoading) {
        animate(button, {
          color: 'var(--color-blackwhite)',

          duration: 300,
          easing: 'easeInOutQuad',
        })
        animate('.summarize-bg', {
          top: 36,
          left: 16,
          width: '24px',
          height: 4,
          duration: 300,
          easing: 'easeInOutQuad',
        })
      } else {
        animate(button, {
          color: 'var(--color-summarize)',
          duration: 300,
          easing: 'easeInOutQuad',
        })
        animate('.summarize-bg', {
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
    animate('.animae-text', {
      ...textAnimationKeyframes,
      loop: true,
    })

    animate('.animae-text-2', {
      ...text2AnimationKeyframes,
      loop: true,
    })
  })
</script>

<button
  class="relative summarize p-4 pl-4 pr-6 overflow-hidden text-black flex items-center rounded-full gap-2 w-fit h-12"
  onclick={dispatch}
  disabled={isLoading || isChapterLoading}
  title="Summarize current page"
>
  <div class="text-primary relative z-10 size-6">
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
  <div class="grid z-10 grid-cols-1 grid-rows-1 text-lg">
    <div class="flex col-start-1 row-start-1 gap-px">
      <span class="animae-text">S</span>
      <span class="animae-text">u</span>
      <span class="animae-text">m</span>
      <span class="animae-text">m</span>
      <span class="animae-text">a</span>
      <span class="animae-text">r</span>
      <span class="animae-text">i</span>
      <span class="animae-text">z</span>
      <span class="animae-text">e</span>
    </div>
    <div class="flex col-start-1 row-start-1 gap-px">
      <span class="animae-text-2 opacity-0">S</span>
      <span class="animae-text-2 opacity-0">u</span>
      <span class="animae-text-2 opacity-0">m</span>
      <span class="animae-text-2 opacity-0">m</span>
      <span class="animae-text-2 opacity-0">a</span>
      <span class="animae-text-2 opacity-0">r</span>
      <span class="animae-text-2 opacity-0">i</span>
      <span class="animae-text-2 opacity-0">z</span>
      <span class="animae-text-2 opacity-0">e</span>
    </div>
  </div>
  <div
    class="bg-white summarize-bg absolute z-0 w-full left-0 h-full rounded-full"
  ></div>
</button>
