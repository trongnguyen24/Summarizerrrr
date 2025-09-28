<!-- @ts-nocheck -->
<script>
  import { onMount } from 'svelte'
  import { animate, utils } from 'animejs'

  let buttonElement
  let heartsAnimation = null
  let pointerX = 0
  let pointerY = 0
  const spread = 16
  let svgElement = null

  // Utility functions
  function random(min, max, precision = 0) {
    const value = Math.random() * (max - min) + min
    return precision > 0 ? parseFloat(value.toFixed(precision)) : value
  }
  function randomPick(array) {
    return array[Math.floor(Math.random() * array.length)]
  }
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }
  function removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element)
    }
  }

  // Timer utility
  function createTimer(options = {}) {
    const {
      autoplay = false,
      duration = 1000,
      loop = false,
      onLoop = () => {},
    } = options
    let intervalId = null
    let isPlaying = false
    const timer = {
      play() {
        if (isPlaying) return
        isPlaying = true
        const runLoop = () => {
          onLoop()
          if (loop && isPlaying) {
            intervalId = setTimeout(runLoop, duration)
          } else {
            isPlaying = false
          }
        }
        intervalId = setTimeout(runLoop, duration)
      },
      pause() {
        if (intervalId) {
          clearTimeout(intervalId)
          intervalId = null
        }
        isPlaying = false
      },
      revert() {
        this.pause()
      },
    }
    if (autoplay) timer.play()
    return timer
  }

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
        if (!svgElement || !buttonElement) return
        const particle = svgElement.cloneNode(true)
        particle.style.cssText =
          'position: absolute; top: -8px; left: -8px; mix-blend-mode: plus-lighter; pointer-events: none; z-index: 9999;'
        particle.classList.add('particle')
        buttonElement.appendChild(particle)

        animate(particle, {
          translateX: [
            pointerX + random(-spread, spread),
            `+=${5 + random(-2, 2, 2)}`,
            `-=${6 + random(-2, 2, 2)}`,
            `+=${4 + random(-2, 2, 2)}`,
          ],
          translateY: [pointerY + random(-5, 5), `-=${random(30, 50)}`],
          scale: [0, 1, 0],
          duration: 1200,
          ease: 'outExpo',
          onComplete: () => removeElement(particle),
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
  class="relative flex items-center justify-center gap-1 px-3 py-1 font-mono text-xs text-red-500"
  style="overflow: visible;"
  onmouseenter={(e) => handleMouseEnter(e)}
  onmousemove={(e) => handleMouseMove(e)}
  onmouseleave={handleMouseLeave}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    class="size-4 transition-transform"
  >
    <path
      d="M2 6.342a3.375 3.375 0 0 1 6-2.088 3.375 3.375 0 0 1 5.997 2.26c-.063 2.134-1.618 3.76-2.955 4.784a14.437 14.437 0 0 1-2.676 1.61c-.02.01-.038.017-.05.022l-.014.006-.004.002h-.002a.75.75 0 0 1-.592.001h-.002l-.004-.003-.015-.006a5.528 5.528 0 0 1-.232-.107 14.395 14.395 0 0 1-2.535-1.557C3.564 10.22 1.999 8.558 1.999 6.38L2 6.342Z"
    />
  </svg>
  Support project
</button>

<style>
  :global(.particle) {
    position: absolute !important;
    pointer-events: none !important;
    filter: drop-shadow(0 0 3px currentColor);
    z-index: 9999 !important;
    color: hsl(0, 100%, 70%); /* Thêm màu cho trái tim bay ra đẹp hơn */
  }
</style>
