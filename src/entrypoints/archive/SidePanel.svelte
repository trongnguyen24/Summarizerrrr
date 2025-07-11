<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { slideScaleFade } from '@/lib/slideScaleFade'

  const { list, selectedSummary, selectSummary } = $props()

  const options = {
    scrollbars: {
      visibility: 'auto',
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize] = useOverlayScrollbars({ options, defer: true })

  $effect(() => {
    initialize(document.getElementById('scroll-side'))
  })
</script>

<div
  transition:slideScaleFade={{
    duration: 500,
    slideDistance: '0rem',
    startScale: 1,
    slideFrom: 'left',
  }}
  class="w-80 relative flex flex-col h-screen gap-2"
>
  <h2 class="text-lg pl-11 pt-4.5 pb-2 font-bold">Archive</h2>
  <div class="px-4">
    <input
      class="px-4 py-2 rounded-md border w-full border-border"
      type="search"
      name="search"
      id="search"
      placeholder="Search"
    />
  </div>
  <div id="scroll-side" class="text-text-secondary flex-1 relative gap-0.5">
    <div
      class=" sticky bg-linear-to-b from-background to-background/40 mask-b-from-50% left-0 top-0 w-78 h-6 backdrop-blur-[2px] z-30 pointer-events-none"
    ></div>
    <div class="flex absolute inset-0 px-4 py-6 h-full flex-col gap-px">
      {#each list as item (item.id)}
        <a
          href="#{item.id}"
          class="px-3 py-2 transition-colors duration-125 rounded-sm {selectedSummary &&
          selectedSummary.id === item.id
            ? 'bg-white'
            : 'hover:bg-white/50'}"
          onclick={() => selectSummary(item)}
        >
          <div class="line-clamp-1">{item.title}</div>
        </a>
      {/each}
      <div class="py-2 w-full">-</div>
    </div>
  </div>
  <div
    class=" absolute bg-linear-to-t from-background to-background/40 mask-t-from-50% left-0 right-3 bottom-0 h-6 backdrop-blur-[2px] z-30 pointer-events-none"
  ></div>
</div>
