<script>
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '../lib/slideScaleFade.js' // Assuming path is correct

  // Props received from App.svelte (or directly from summaryStore if desired)
  let { isLoading, isChapterLoading } = $props()

  // Event dispatcher to notify when the button is clicked
  const dispatch = () => {
    const customEvent = new CustomEvent('summarizeClick')
    document.dispatchEvent(customEvent) // Dispatch to document or a specific element
  }
</script>

<button
  class=" p-3 pl-2 pr-4 bg-white text-black flex items-center rounded-full gap-2 w-fit h-8"
  onclick={dispatch}
  disabled={isLoading || isChapterLoading}
  title="Summarize current page"
>
  <div class="flex text-primary items-center justify-center relative size-4">
    {#if isLoading || isChapterLoading}
      <span transition:slideScaleFade>
        <Icon
          width={16}
          icon="svg-spinners:bouncing-ball"
          class="absolute inset-0"
        />
      </span>
    {:else}
      <span transition:slideScaleFade>
        <Icon
          class="translate-x-0.5 absolute inset-0"
          width={16}
          icon="octicon:sparkle-fill-16"
        />
      </span>
    {/if}
  </div>
  <div>
    <div class="text-sm">Summarize</div>
  </div>
</button>

<!-- <div class="flex group relative size-12 rounded-full">
  <span
    class="absolute group-hover:-translate-y-0.5 transition-all duration-300 inset-0 z-0 animate-spin-slow-2"
  >
    <span
      class="absolute inset-0 rounded-full bg-conic from-border to-primary group-hover:brightness-150 transition-all duration-300 animate-spin-slow"
    ></span>
    <span
      class="absolute inset-0 rounded-full bg-conic from-transparent from-80% to-amber-400 group-hover:to-amber-50 transition-all duration-150 animate-spin-slow blur-[2px]"
    ></span>
  </span>
  <button
    onclick={dispatch}
    class="absolute z-10 inset-px text-primary bg-surface-1 group-hover:brightness-110 group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center rounded-full disabled:cursor-progress"
    disabled={isLoading || isChapterLoading}
    title="Summarize current page"
  >
    <div class="relative size-6">
      {#if isLoading || isChapterLoading}
        <span transition:slideScaleFade>
          <Icon
            width={24}
            icon="svg-spinners:bouncing-ball"
            class="absolute inset-0"
          />
        </span>
      {:else}
        <span transition:slideScaleFade>
          <Icon
            class="translate-x-0.5 absolute inset-0"
            width={24}
            icon="heroicons:play-solid"
          />
        </span>
      {/if}
    </div>
  </button>
</div> -->
