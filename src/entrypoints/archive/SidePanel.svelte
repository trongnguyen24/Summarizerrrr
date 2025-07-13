<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { DropdownMenu } from 'bits-ui'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { slideScaleFade } from '@/lib/slideScaleFade'
  import { addSummary, getSummaryById } from '@/lib/indexedDBService' // Import addSummary and getSummaryById

  const { list, selectedSummary, selectSummary, selectedSummaryId } = $props()

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

  async function saveToArchiveFromHistory(item) {
    try {
      const existingSummary = await getSummaryById(item.id)
      if (existingSummary) {
        document.dispatchEvent(
          new CustomEvent('saveSummaryError', {
            detail: { message: 'This summary is already in Archive!' },
          })
        )
        return
      }

      const archiveEntry = {
        id: item.id, // Keep the same ID
        title: item.title,
        url: item.url,
        date: item.date,
        summaries: item.summaries,
      }

      await addSummary(archiveEntry)
      document.dispatchEvent(
        new CustomEvent('saveSummarySuccess', {
          detail: { message: 'Saved to Archive successfully!' },
        })
      )
    } catch (error) {
      console.error('Error saving history item to archive:', error)
      document.dispatchEvent(
        new CustomEvent('saveSummaryError', {
          detail: { message: `Error saving to Archive: ${error.message}` },
        })
      )
    }
  }
</script>

<div
  transition:slideScaleFade={{
    duration: 500,
    slideDistance: '0rem',
    startScale: 1,
    slideFrom: 'left',
  }}
  class="w-80 relative flex flex-col h-screen"
>
  <div class="px-4 mt-4">
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
    <div
      class="flex font-mono text-xs md:text-sm absolute inset-0 px-2 py-6 h-full flex-col gap-px"
    >
      {#each list as item (item.id)}
        <div class="relative group">
          <button
            class="list-button w-full relative p-2 pr-7 text-left hover:bg-blackwhite/5 rounded-sm {selectedSummaryId ==
            item.id
              ? 'text-text-primary active font-bold'
              : 'hover:bg-white/50 dark:hover:bg-white/5'}"
            onclick={() => selectSummary(item)}
          >
            <div
              class="line-clamp-1 transition-colors w-full mask-r-from-90% mask-r-to-100%"
            >
              {item.title}
            </div>
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              class="text-text-muted pointer-none: hover:bg-blackwhite/5 rounded-sm z-10 absolute right-0 justify-center items-center top-0 size-9"
              ><div
                class="action-button hidden justify-center items-center top-0 size-9"
              >
                <Icon
                  icon="heroicons:ellipsis-horizontal-16-solid"
                  width="20"
                  height="20"
                  style="color: #fff"
                />
              </div></DropdownMenu.Trigger
            >

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={4}
                align="end"
                class="z-50  p-0.5 text-sm rounded-sm bg-surface-2 border flex flex-col gap-px border-border"
              >
                <div
                  class="text-text-muted bg-blackwhite/5 rounded-sm z-10 absolute right-0 justify-center items-center flex bottom-full -translate-y-1 size-9"
                >
                  <Icon
                    icon="heroicons:ellipsis-horizontal-16-solid"
                    width="20"
                    height="20"
                    style="color: #fff"
                  />
                </div>
                <DropdownMenu.Item
                  class="py-1 px-3 w-28 hover:bg-blackwhite/5 rounded-sm"
                  onselect={() => saveToArchiveFromHistory(item)}
                  >Save to Archive</DropdownMenu.Item
                >
                <DropdownMenu.Item
                  class="py-1 px-3 w-28 hover:bg-blackwhite/5 rounded-sm"
                  >Rename</DropdownMenu.Item
                >
                <DropdownMenu.Item
                  class="py-1 px-3 w-28 hover:bg-blackwhite/5 rounded-sm"
                  >Delete</DropdownMenu.Item
                >
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      {/each}
      <div class="py-2 w-full">-</div>
    </div>
  </div>
  <div
    class=" absolute bg-linear-to-t from-background to-background/40 mask-t-from-50% left-0 right-3 bottom-0 h-6 backdrop-blur-[2px] z-30 pointer-events-none"
  ></div>
</div>

<style>
  .list-button::after {
    content: '';
    display: block;
    width: 0px;
    position: absolute;
    background: white;
    top: 50%;
    transform: translateY(-50%) translateX(-0.25rem);
    right: -0.5rem;
    left: -0.5rem;
    height: 1rem;
    border-radius: 0 4px 4px 0;
    transition: all 0.3s ease-in-out;
    box-shadow:
      0 0 2px #ffffff18,
      0 0 0 #ffffff18;
  }
  .list-button.active {
    &::after {
      transform: translateY(-50%) translateX(1px);
      width: 4px;
      box-shadow:
        4px 0 8px 2px #ffffff71,
        0 0 3px 1px #ffffff94;
    }
  }
  .list-button:focus + .action-button {
    display: flex !important;
  }
  .group:focus-within .action-button,
  .group:hover .action-button {
    display: flex !important;
  }
</style>
