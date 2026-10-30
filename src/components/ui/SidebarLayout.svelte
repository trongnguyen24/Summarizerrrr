<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { animationService } from '@/services/animationService.js'
  import { fadeOnly } from '@/lib/utils/slideScaleFade.js'

  let {
    open = $bindable(),
    sidebar,
    children,
  } = $props()

  // Panel-level state: mobile is a drawer (< 768px), desktop is a docked column
  let isMobile = $state(window.innerWidth < 768)
  let sidePanel

  function toggle() {
    open = !open
    if (open) {
      animationService.show(sidePanel)
    } else {
      animationService.hide(sidePanel)
    }
  }

  // Lets a sidebar item close the drawer after selection, only on mobile
  function closeOnMobile() {
    if (isMobile && open) toggle()
  }

  function handleResize() {
    const newIsMobile = window.innerWidth < 768
    if (newIsMobile !== isMobile) {
      isMobile = newIsMobile
      open = !isMobile // Visibility follows the device class
    }
  }

  // Close the drawer when clicking the overlay on mobile
  function handleOverlayClick() {
    if (isMobile && open) toggle()
  }

  $effect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  })
</script>

<!-- Overlay backdrop for mobile - click outside to close sidepanel -->
{#if isMobile && open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    transition:fadeOnly
    class="fixed top-0 bottom-0 left-2 right-2 sm:left-5 sm:right-5 bg-black/40 z-30"
    onclick={handleOverlayClick}
  ></div>
{/if}

<button
  class="fixed top-3 left-3 sm:left-6 md:left-9 translate-x-0.5 z-50 md:hover:bg-blackwhite/5 overflow-hidden rounded-4xl p-2"
  onclick={toggle}
>
  {#if open}
    <Icon icon="tabler:layout-sidebar-left-collapse" width="24" height="24" />
  {:else}
    <Icon icon="tabler:layout-sidebar-right-collapse" width="24" height="24" />
  {/if}
  <span class=" -z-10 absolute -inset-2 bg-surface-2/50 backdrop-blur-sm"></span>
</button>

<!-- Left edge stripes -->
<div
  class="top-stripes fixed z-50 shrink-0 left-0 top-0 w-2 sm:w-5 md:w-8 h-screen border-r border-border/70"
></div>

<div
  bind:this={sidePanel}
  class="top-0 p-0 fixed left-2 sm:left-5 md:left-8 h-svh max-h-svh z-40 bg-background overflow-hidden"
>
  <div class="w-px absolute z-30 top-0 right-0 h-svh bg-border/70"></div>

  {#if open && sidebar}
    {@render sidebar({ closeOnMobile })}
  {/if}
</div>

<!-- Main column -->
<div
  class="flex-1 w-full wrap-break-word relative bg-surface-1 z-20 flex flex-col gap-2
   pl-0"
>
  {@render children?.()}
</div>

<!-- Right edge stripes -->
<div
  class="top-stripes z-50 right-0 shrink-0 fixed top-0 w-2 sm:w-5 md:w-8 h-screen border-l border-border/70"
></div>
