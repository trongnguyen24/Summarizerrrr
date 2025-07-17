<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import Dialog from './Dialog.svelte'
  import TextInput from '@/components/inputs/TextInput.svelte'
  import { DropdownMenu } from 'bits-ui'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { slideScaleFade } from '@/lib/slideScaleFade'
  import {
    deleteSummary,
    deleteHistory,
    updateSummary,
    updateHistory,
    getSummaryById,
    getHistoryById,
  } from '@/lib/indexedDBService'
  import TabArchive from '@/components/TabArchive.svelte'

  const {
    list,
    selectedSummary,
    selectSummary,
    selectedSummaryId,
    activeTab,
    selectTab,
    onRefresh,
  } = $props()

  let isOpen = $state(false)
  let newSummaryName = $state('')
  let currentSummaryIdToRename = $state(null)

  async function refreshSummaries() {
    if (onRefresh) {
      await onRefresh()
    }
  }

  function openRenameDialog(item) {
    currentSummaryIdToRename = item.id
    newSummaryName = item.title
    isOpen = true
  }

  async function handleRename() {
    if (!currentSummaryIdToRename || !newSummaryName.trim()) {
      return // Không làm gì nếu không có ID hoặc tên trống
    }

    try {
      if (activeTab === 'archive') {
        const summaryToUpdate = await getSummaryById(currentSummaryIdToRename)
        if (summaryToUpdate) {
          summaryToUpdate.title = newSummaryName.trim()
          await updateSummary(summaryToUpdate)
          console.log(
            `Archive item with ID ${currentSummaryIdToRename} renamed to "${newSummaryName}".`
          )
        }
      } else if (activeTab === 'history') {
        const historyToUpdate = await getHistoryById(currentSummaryIdToRename)
        if (historyToUpdate) {
          historyToUpdate.title = newSummaryName.trim()
          await updateHistory(historyToUpdate)
          console.log(
            `History item with ID ${currentSummaryIdToRename} renamed to "${newSummaryName}".`
          )
        }
      }
      await refreshSummaries() // Cập nhật lại danh sách sau khi đổi tên
      isOpen = false // Đóng dialog
      newSummaryName = '' // Đặt lại tên mới
      currentSummaryIdToRename = null // Đặt lại ID
    } catch (error) {
      console.error('Error renaming summary:', error)
    }
  }

  async function handleDelete(id) {
    if (activeTab === 'archive') {
      await deleteSummary(id)
      console.log(`Archive item with ID ${id} deleted.`)
    } else if (activeTab === 'history') {
      await deleteHistory(id)
      console.log(`History item with ID ${id} deleted.`)
    }
    await refreshSummaries() // Cập nhật lại danh sách sau khi xóa
  }

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
    duration: 800,
    slideDistance: '0rem',
    startScale: 1,
    slideFrom: 'left',
  }}
  class="w-80 relative flex flex-col h-screen"
>
  <h2 class="text-lg pl-12 pt-4.5 pb-2 font-bold">Summarizerrrr</h2>

  <TabArchive {activeTab} onSelectTab={selectTab} />

  <div id="scroll-side" class="text-text-secondary flex-1 relative gap-0.5">
    <div
      class=" sticky bg-linear-to-b from-background to-background/40 mask-b-from-50% left-0 top-0 w-78 h-4 backdrop-blur-[2px] z-30 pointer-events-none"
    ></div>
    <div
      class="flex font-mono text-xs md:text-sm absolute inset-0 px-2 pt-3 pb-6 h-full flex-col gap-px"
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
              class="text-text-muted hover:bg-blackwhite/5 rounded-sm z-10 absolute right-0 justify-center items-center top-0 size-9"
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
                  onclick={() => openRenameDialog(item)}
                  class="py-1 px-3 w-28 hover:bg-blackwhite/5 rounded-sm"
                  >Rename</DropdownMenu.Item
                >
                <DropdownMenu.Item
                  class="py-1 px-3 w-28 hover:bg-blackwhite/5 rounded-sm"
                  onclick={() => handleDelete(item.id)}
                  >Delete</DropdownMenu.Item
                >
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      {/each}
      <!-- <div class="py-2 w-full">-</div> -->
    </div>
  </div>
  <div
    class=" absolute bg-linear-to-t from-background to-background/40 mask-t-from-50% left-0 right-3 bottom-0 h-4 backdrop-blur-[2px] z-30 pointer-events-none"
  ></div>
</div>

<Dialog bind:open={isOpen}>
  <div>
    <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
      <span class="block size-3.5 bg-muted/15 rounded-full"></span>
      <span class="block size-3.5 bg-muted/15 rounded-full"></span>
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button
        class="block size-3.5 bg-error rounded-full"
        onclick={() => (isOpen = false)}
      >
        <Icon
          class="text-red-800 transition-opacity duration-150"
          width={14}
          icon="heroicons:x-mark-16-solid"
        />
      </button>
    </div>
    <div
      class="relative font-mono rounded-lg text-text-primary dark:text-text-secondary text-sm bg-background dark:bg-surface-1 overflow-hidden border border-border w-full flex-shrink-0 flex flex-col"
    >
      <div
        class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
      >
        <p class="!text-center select-none">Rename summary</p>
      </div>
      <div class="flex relative p-px gap-4 flex-col">
        <div class="p-4 flex justify-end gap-2">
          <div class="lang flex-1 overflow-hidden relative">
            <input
              type="text"
              class="w-full px-3 h-10 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
              bind:value={newSummaryName}
              onkeydown={(e) => {
                if (e.key === 'Enter') handleRename()
              }}
            />
          </div>
          <button class="relative overflow-hidden group" onclick={handleRename}>
            <div
              class=" font-medium flex justify-center items-center h-10 px-4 border transition-colors duration-200 bg-surface-2 group-hover:bg-surface-2/95 dark:group-hover:surface-2/90 text-orange-50 dark:text-text-primary border-border hover:border-gray-500/50 hover:text-white"
            >
              Save
            </div>
            <span
              class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200 border-border group-hover:border-gray-500"
            ></span>
          </button>
        </div>
      </div>
    </div>
    <!-- Additional dialog content here... -->
  </div></Dialog
>

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
  .lang::after {
    display: block;
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    height: 8px;
    width: 8px;
    background-color: var(--color-text-primary);
    transform: rotate(45deg) translate(-50%, -50%);
    transition: transform 0.3s ease-out;
    transform-origin: top right;
  }
  .lang::after {
    transform: rotate(45deg) translate(50%, -50%);
  }
  .lang::before {
    display: block;
    content: '';
    z-index: -1;
    position: absolute;
    bottom: 0;
    left: 0;
    height: 28px;
    width: 100%;
    background-color: rgba(124, 124, 124, 0.025);
    transform: translateY(100%);
    transition: transform 0.3s ease-out;
  }
  .lang::before {
    transform: translateY(0);
  }
</style>
