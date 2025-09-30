<!-- @ts-nocheck -->
<script>
  import { onMount } from 'svelte'
  import { animate } from 'animejs'
  import {
    createTimer,
    createParticleAnimation,
    clamp,
  } from '../../services/animationService.js'

  let buttonElement
  let heartsAnimation = null
  let pointerX = 0
  let pointerY = 0
  const spread = 16
  let svgElement = null

  onMount(() => {
    const svgContainer = document.createElement('div')
    svgContainer.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4"><path d="M2 6.342a3.375 3.375 0 0 1 6-2.088 3.375 3.375 0 0 1 5.997 2.26c-.063 2.134-1.618 3.76-2.955 4.784a14.437 14.437 0 0 1-2.676 1.61c-.02.01-.038.017-.05.022l-.014.006-.004.002h-.002a.75.75 0 0 1-.592.001h-.002l-.004-.003-.015-.006a5.528 5.528 0 0 1-.232-.107 14.395 14.395 0 0 1-2.535-1.557C3.564 10.22 1.999 8.558 1.999 6.38L2 6.342Z"/></svg>'
    svgElement = svgContainer.querySelector('svg')

    heartsAnimation = createTimer({
      autoplay: false,
      duration: 100,
      loop: true,
      onLoop: () => {
        createParticleAnimation({
          svgElement,
          buttonElement,
          pointerX,
          pointerY,
          particleColor: 'hsl(0, 100%, 70%)',
        })
      },
    })

    return () => {
      if (heartsAnimation) heartsAnimation.revert()
    }
  })

  function handleMouseMove(e) {
    if (!buttonElement) return
    const { width, height, left, top } = buttonElement.getBoundingClientRect()
    pointerX = clamp(e.clientX - left, spread, width - spread)
    pointerY = clamp(e.clientY - top, 0, height)
  }

  function handleMouseEnter(e) {
    handleMouseMove(e)
    const mainSvg = buttonElement.querySelector('svg:first-child')
    if (mainSvg) {
      animate(mainSvg, {
        scale: [1, 1.25, 1],
        loop: true,
        ease: 'inOutSine',
        duration: 900,
      })
    }
    if (heartsAnimation) {
      heartsAnimation.play()
    }
  }

  function handleMouseLeave() {
    const mainSvg = buttonElement.querySelector('svg:first-child')
    if (mainSvg) {
      animate(mainSvg, {
        scale: 1,
        duration: 500,
        ease: 'outExpo',
      })
    }
    if (heartsAnimation) {
      heartsAnimation.pause()
    }
  }
</script>

<button
  bind:this={buttonElement}
  class="relative group"
  style="overflow: visible;"
  onmouseenter={(e) => handleMouseEnter(e)}
  onmousemove={(e) => handleMouseMove(e)}
  onmouseleave={handleMouseLeave}
>
  <div
    class=" relative flex items-center font-bold justify-center gap-1 px-3 py-2 font-mono text-xs text-red-500 inset-0 overflow-hidden"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      class="size-4 z-20 transition-transform"
    >
      <path
        d="M2 6.342a3.375 3.375 0 0 1 6-2.088 3.375 3.375 0 0 1 5.997 2.26c-.063 2.134-1.618 3.76-2.955 4.784a14.437 14.437 0 0 1-2.676 1.61c-.02.01-.038.017-.05.022l-.014.006-.004.002h-.002a.75.75 0 0 1-.592.001h-.002l-.004-.003-.015-.006a5.528 5.528 0 0 1-.232-.107 14.395 14.395 0 0 1-2.535-1.557C3.564 10.22 1.999 8.558 1.999 6.38L2 6.342Z"
      />
    </svg>

    <div
      class="relative z-20 flex text-text-primary justify-center items-center"
    >
      Support
    </div>
    <span
      class="absolute z-50 size-4 border border-transparent group-hover:border-blackwhite/15 rotate-45 bg-surface-1 -bottom-px -left-px -translate-x-1/2 translate-y-1/2 duration-150"
    ></span>
    <div
      class="absolute z-40 inset-0 text-text-secondary py-2 font-mono bg-muted/5 dark:bg-muted/5 border border-transparent hover:border-blackwhite/15 focus:border-blackwhite/30 dark:focus:border-blackwhite/10 focus:outline-none focus:ring-0 transition-colors duration-150"
    ></div>
  </div>
</button>
