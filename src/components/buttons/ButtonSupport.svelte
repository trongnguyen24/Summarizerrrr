<!-- @ts-nocheck -->
<script>
  import { onMount } from 'svelte'
  import { animate } from 'animejs'
  import Icon, { loadIcons } from '@iconify/svelte'
  import { DropdownMenu, Dialog } from 'bits-ui'
  import {
    createTimer,
    createParticleAnimation,
    clamp,
  } from '../../services/animationService.js'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'

  let buttonElement
  let heartsAnimation = null
  let pointerX = 0
  let pointerY = 0
  const spread = 16
  let svgElement = null
  let dialogOpen = $state(false)
  let DropdownOpen = $state(false)

  onMount(() => {
    const svgContainer = document.createElement('div')
    svgContainer.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4"><path d="M2 6.342a3.375 3.375 0 0 1 6-2.088 3.375 3.375 0 0 1 5.997 2.26c-.063 2.134-1.618 3.76-2.955 4.784a14.437 14.437 0 0 1-2.676 1.61c-.02.01-.038.017-.05.022l-.014.006-.004.002h-.002a.75.75 0 0 1-.592.001h-.002l-.004-.003-.015-.006a5.528 5.528 0 0 1-.232-.107 14.395 14.395 0 0 1-2.535-1.557C3.564 10.22 1.999 8.558 1.999 6.38L2 6.342Z"/></svg>'
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

<DropdownMenu.Root bind:open={DropdownOpen}>
  <DropdownMenu.Trigger>
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
          class="size-5 z-20 transition-transform"
        >
          <path
            d="M2 6.342a3.375 3.375 0 0 1 6-2.088 3.375 3.375 0 0 1 5.997 2.26c-.063 2.134-1.618 3.76-2.955 4.784a14.437 14.437 0 0 1-2.676 1.61c-.02.01-.038.017-.05.022l-.014.006-.004.002h-.002a.75.75 0 0 1-.592.001h-.002l-.004-.003-.015-.006a5.528 5.528 0 0 1-.232-.107 14.395 14.395 0 0 1-2.535-1.557C3.564 10.22 1.999 8.558 1.999 6.38L2 6.342Z"
          />
        </svg>

        <div
          class="relative z-20 flex text-text-primary justify-center items-center"
        >
          Donate
        </div>
        <span
          class="absolute z-50 size-4 border border-transparent group-hover:border-blackwhite/15 rotate-45 bg-surface-1 -bottom-px -left-px -translate-x-1/2 translate-y-1/2 duration-150"
        ></span>
        <div
          class="absolute z-40 inset-0 text-text-secondary py-2 font-mono bg-blackwhite/5 dark:bg-blackwhite/5 border border-transparent hover:border-blackwhite/15 focus:border-blackwhite/30 dark:focus:border-blackwhite/10 focus:outline-none focus:ring-0 transition-colors duration-150"
        ></div>
      </div>
    </button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      class="mt-2 bg-surface-2/80 divide-y divide-border divide-dashed font-mono text-xs backdrop-blur-md border border-border  rounded flex flex-col"
    >
      <DropdownMenu.Item>
        {#snippet child({ props })}
          <button
            {...props}
            onclick={() => ((dialogOpen = true), (DropdownOpen = false))}
            class=" p-3 flex gap-2 hover:bg-blackwhite-5 transition-colors duration-75 items-center"
          >
            <span
              ><svg
                class=" size-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
              >
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.696 6.073c5.44-2.773 23.353-1.376 25.543 2.703c1.294 5.695-3.128 12.285-4.688 14.626c-4.301 6.457-6.3 9.817-10.545 5.284c-7.27-7.762-15.444-20.835-10.31-22.614z"
                  stroke-width="3"
                />
                <g
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="3"
                >
                  <path
                    d="M20.584 4.987S3.049 7.143 4.861 16.31c1.96 9.918 11.197 20.114 15.251 23.112c3.528 2.608 8.073 5.624 12.94-.664c5.18-6.693 14.164-25.278 8.667-30.658"
                  />
                  <path
                    d="M18.664 17.223c3.41-.727 21.526-2.013 20.515 3.696"
                  />
                </g>
              </svg></span
            >Vietcombank
          </button>
        {/snippet}
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        {#snippet child({ props })}
          <a
            class=" select-none"
            href="https://ko-fi.com/trongnguyen24"
            {...props}
            target="_blank"
          >
            <div
              class=" p-3 flex gap-2 hover:bg-blackwhite-5 transition-colors duration-75 items-center"
            >
              <Icon icon="hugeicons:ko-fi" class="size-5" />Ko-fi
            </div></a
          >
        {/snippet}
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      class="outline-hidden fixed left-[50%] top-1/2 w-[calc(100vw-32px)] bg-white max-w-80 z-50 rounded-3xl overflow-hidden -translate-y-1/2 translate-x-[-50%]"
    >
      {#snippet child({ props, open })}
        {#if open}
          <div
            {...props}
            transition:slideScaleFade={{
              duration: 300,
              slideFrom: 'bottom',
              slideDistance: '0rem',
              startScale: 0.95,
            }}
          >
            <div class="p-4">
              <img src="./Vietcombank.svg" alt="Vietcombank" />
            </div>

            <div
              class="bg-white border-t text-sm font-mono flex flex-col gap-1 border-dashed text-center text-gray-900 p-4"
            >
              <p class=" font-bold">Vietcombank</p>
              <p>Lê Trọng Nguyên</p>
              <p>0181003567127</p>
            </div>
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
