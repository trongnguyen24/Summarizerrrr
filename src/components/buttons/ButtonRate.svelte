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
      duration: 100,
      loop: true,
      onLoop: () => {
        createParticleAnimation({
          svgElement,
          buttonElement,
          pointerX,
          pointerY,
          particleColor: 'hsl(53, 100%, 70%)',
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
  class="relative flex items-center font-bold justify-center gap-1 px-3 py-1 font-mono text-xs"
  style="overflow: visible;"
  onmouseenter={(e) => handleMouseEnter(e)}
  onmousemove={(e) => handleMouseMove(e)}
  onmouseleave={handleMouseLeave}
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

  Review
</button>
