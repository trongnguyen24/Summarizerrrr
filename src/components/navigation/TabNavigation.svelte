<!-- @ts-nocheck -->
<script>
  import { onMount } from 'svelte'

  let { tabs, activeTab, onSelectTab } = $props()

  // Sử dụng một đối tượng để theo dõi trạng thái đã từng loading của từng tab
  let tabLoadingStatus = $state({})

  // Thêm biến state để điều khiển vị trí translateX của activebar
  let barTranslateX = $state(0)
  let barWidth = $state(0)

  // Đối tượng để lưu trữ tham chiếu đến các button
  let tabButtons = $state({})

  $effect(() => {
    tabs.forEach((tab) => {
      // Chỉ cập nhật nếu tab đang loading và chưa được đánh dấu là đã từng loading
      if (tab.isLoading && !tabLoadingStatus[tab.id]) {
        tabLoadingStatus = { ...tabLoadingStatus, [tab.id]: true }
      }
    })
  })

  // Hàm để cập nhật vị trí và chiều rộng của activebar
  function updateActiveBarPosition() {
    if (tabButtons[activeTab]) {
      const activeTabElement = tabButtons[activeTab]
      barTranslateX = activeTabElement.offsetLeft
      barWidth = activeTabElement.offsetWidth
    }
  }

  // Effect để cập nhật vị trí và chiều rộng của activebar khi activeTab thay đổi
  $effect(() => {
    updateActiveBarPosition()
  })

  // Khi component được mount, cập nhật vị trí ban đầu của activebar
  onMount(() => {
    updateActiveBarPosition()
  })

  function selectTab(tabId) {
    onSelectTab(tabId)
  }
</script>

<div
  class="flex mx-auto relative px-2 font-mono text-base text-text-secondary w-fit gap-2 border-b border-border dark:border-border/70"
>
  <div class=" relative inset-0 overflow-hidden">
    {#each tabs as tab (tab.id)}
      <button
        bind:this={tabButtons[tab.id]}
        class="w-30 p-4 py-6 relative rounded-sm transition-colors duration-150 {activeTab ===
        tab.id
          ? 'text-text-primary font-bold active'
          : ''} "
        onclick={() => selectTab(tab.id)}
      >
        {#if tab.isLoading}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="4" cy="12" r="3" fill="currentColor">
              <animate
                id="svgSpinners3DotsFade0"
                fill="freeze"
                attributeName="opacity"
                begin="0;svgSpinners3DotsFade1.end-0.175s"
                dur="0.525s"
                values="1;0.35"
              />
            </circle>
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4">
              <animate
                fill="freeze"
                attributeName="opacity"
                begin="svgSpinners3DotsFade0.begin+0.105s"
                dur="0.525s"
                values="1;0.35"
              />
            </circle>
            <circle cx="20" cy="12" r="3" fill="currentColor" opacity="0.3">
              <animate
                id="svgSpinners3DotsFade1"
                fill="freeze"
                attributeName="opacity"
                begin="svgSpinners3DotsFade0.begin+0.21s"
                dur="0.525s"
                values="1;0.35"
              />
            </circle>
          </svg>
        {/if}
        <div
          class="flex w-full items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 {tab.isLoading
            ? 'opacity-0'
            : ''}"
        >
          {tab.label}
        </div>
      </button>
    {/each}
    <div
      id="activebar"
      style="transform: translateX({barTranslateX}px); width: {barWidth}px;"
      class="h-1 rounded-xs absolute bottom-0 rounded-t-lg transition-transform duration-400 ease-out"
    >
      <div
        class=" absolute rounded-xs w-1/2 inset-0 rounded-t-md translate-x-1/2 bg-white"
      ></div>
      <div
        class="  absolute -inset-px w-1/2 translate-x-1/2 bg-white/50 blur-xs"
      ></div>
      <div
        class="  absolute -inset-px w-1/2 translate-x-1/2 bg-white/50 blur-[2px]"
      ></div>
    </div>
  </div>

  <div class="plus-icon top-left">
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
      ><path d="M4 0h1v9H4z" fill="currentColor" /><path
        d="M9 4v1H0V4z"
        fill="currentColor"
      /></svg
    >
  </div>
  <div class="plus-icon bottom-right">
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
      ><path d="M4 0h1v9H4z" fill="currentColor" /><path
        d="M9 4v1H0V4z"
        fill="currentColor"
      /></svg
    >
  </div>
</div>

<style>
  .plus-icon {
    position: absolute;
    z-index: 10;
    width: 9px; /* Kích thước container dấu cộng */
    height: 9px; /* Kích thước container dấu cộng */
    overflow: hidden; /* Ẩn phần thừa của pseudo-elements */
  }

  /* .red-plus-icon:before,
  .red-plus-icon:after {
    background-color: var(--color-error);
  } */

  .top-left {
    bottom: 0;
    left: 0;
    transform: translateX(-5px) translateY(5px);
  }

  .bottom-right {
    bottom: 0;
    right: 0;
    transform: translateX(5px) translateY(5px);
  }
</style>
