<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  // tabs: [{ id, label, icon, iconActive }]
  let { tabs, activeTab, onSelectTab } = $props()

  let activeIndex = $derived(
    Math.max(
      0,
      tabs.findIndex((tab) => tab.id === activeTab),
    ),
  )
  // Each tab takes an equal share of the bar; the active bar sits at the
  // centre of its share. With two tabs this is 25% / 75% of the panel width.
  let barLeft = $derived(((activeIndex + 0.5) / tabs.length) * 100)
</script>

<div
  class="flex flex-col relative mt-2 font-mono text-sm text-text-secondary w-full border-t border-b border-border dark:border-border/50"
>
  <div class="flex bg-background w-full items-center justify-evenly gap-0">
    {#each tabs as tab (tab.id)}
      <button
        class="flex p-3 items-center flex-1 justify-center gap-1 cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
        tab.id
          ? ' text-blackwhite '
          : 'text-text-secondary'}"
        onclick={() => onSelectTab(tab.id)}
      >
        <div class="size-5">
          <Icon
            icon={activeTab === tab.id ? tab.iconActive : tab.icon}
            width="20"
            height="20"
          />
        </div>
        <span>{tab.label}</span>
      </button>
    {/each}
  </div>

  <div class="relative bg-background h-1 w-full">
    <div
      id="activebar"
      class="absolute top-0 w-16 h-1 rounded-xs rounded-t-lg bg-white transition-[left] duration-400 ease-out"
      style="left: {barLeft}%; transform: translateX(-50%);"
    >
      <div class=" absolute rounded-xs inset-px bg-white"></div>
      <div class="  absolute -inset-px bg-white/50 blur-xs"></div>
      <div class="  absolute -inset-px bg-white/50 blur-[2px]"></div>
    </div>
  </div>
</div>
