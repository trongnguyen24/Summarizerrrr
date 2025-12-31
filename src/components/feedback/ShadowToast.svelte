<script>
  import Icon from '@iconify/svelte'
  import { fadeOnly, flyOnly } from '@/lib/ui/slideScaleFade.js'

  let {
    title = 'Notification',
    message = '',
    icon = 'heroicons-outline:information-circle',
    visible = false,
    onClose,
  } = $props()

  // Auto-dismiss logic can be handled by the parent or here if needed,
  // but for now we'll rely on the parent to manage visibility or simple manual close.
</script>

{#if visible}
  <div
    class="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10002] w-max max-w-[90%]"
    in:flyOnly={{ y: 20, duration: 300 }}
    out:fadeOnly={{ duration: 200 }}
  >
    <div
      class="font-mono flex items-center gap-2 text-xs rounded-4xl justify-between pl-4 pr-1 py-1 border bg-surface-2 border-blackwhite/10 shadow-lg"
    >
      <div class="flex items-center gap-2">
        <Icon
          {icon}
          class="text-text-primary flex-shrink-0"
          width="24"
          height="24"
        />
        <div>
          <div class="font-semibold text-text-primary">{title}</div>
          {#if message}
            <div class="text-text-secondary truncate max-w-[200px]">
              {message}
            </div>
          {/if}
        </div>
      </div>
      <button
        class="flex items-center p-2 text-text-secondary bg-blackwhite/0 hover:text-text-primary hover:bg-blackwhite/5 transition-colors cursor-pointer duration-100 rounded-4xl"
        onclick={onClose}
        aria-label="Close notification"
      >
        <Icon
          icon="heroicons:x-mark-16-solid"
          class="transition-colors duration-100"
          width="16"
          height="16"
        />
      </button>
    </div>
  </div>
{/if}
