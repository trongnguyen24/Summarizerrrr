<!-- @ts-nocheck -->
<script>
  import { onMount } from 'svelte'
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
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">  <path fill-rule="evenodd" d="M8 1.75a.75.75 0 0 1 .692.462l1.41 3.393 3.664.293a.75.75 0 0 1 .428 1.317l-2.791 2.39.853 3.575a.75.75 0 0 1-1.12.814L7.998 12.08l-3.135 1.915a.75.75 0 0 1-1.12-.814l.852-3.574-2.79-2.39a.75.75 0 0 1 .427-1.318l3.663-.293 1.41-3.393A.75.75 0 0 1 8 1.75Z" clip-rule="evenodd" /></svg>'
    svgElement = svgContainer.querySelector('svg')

    heartsAnimation = createTimer({
      autoplay: false,
      duration: 130,
      loop: true,
      onLoop: () => {
        createParticleAnimation({
          svgElement,
          buttonElement,
          pointerX,
          pointerY,
          particleColor: '#FFE629',
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

    if (heartsAnimation) {
      heartsAnimation.play()
    }
  }

  function handleMouseLeave() {
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
      class="size-4 text-[#FFE629] transition-transform"
    >
      <path
        fill-rule="evenodd"
        d="M8 1.75a.75.75 0 0 1 .692.462l1.41 3.393 3.664.293a.75.75 0 0 1 .428 1.317l-2.791 2.39.853 3.575a.75.75 0 0 1-1.12.814L7.998 12.08l-3.135 1.915a.75.75 0 0 1-1.12-.814l.852-3.574-2.79-2.39a.75.75 0 0 1 .427-1.318l3.663-.293 1.41-3.393A.75.75 0 0 1 8 1.75Z"
        clip-rule="evenodd"
      />
    </svg>

    <div
      class="relative z-20 flex text-text-primary justify-center items-center"
    >
      Review
    </div>
    <span
      class="absolute z-50 size-4 border border-transparent group-hover:border-blackwhite/15 rotate-45 bg-surface-1 -bottom-px -left-px -translate-x-1/2 translate-y-1/2 duration-150"
    ></span>
    <div
      class="absolute z-40 inset-0 text-text-secondary py-2 font-mono bg-blackwhite/5 dark:bg-blackwhite/5 border border-transparent hover:border-blackwhite/15 focus:border-blackwhite/30 dark:focus:border-blackwhite/10 focus:outline-none focus:ring-0 transition-colors duration-150"
    ></div>
  </div>
</button>
