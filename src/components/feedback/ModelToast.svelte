<script>
  import Icon from '@iconify/svelte'
  import { toast } from 'svelte-sonner'

  let {
    id,
    title = 'Gemini overloaded',
    message = 'Switching to lighter model',
    icon = 'heroicons-outline:exclamation',
  } = $props()
</script>

<div class="toast-wrap font-mono z-10">
  <div
    class="rw-fit flex items-center gap-2 text-xs rounded-4xl justify-between pl-4 pr-1 py-1 border bg-surface-2 border-blackwhite/10"
  >
    <div class="flex items-center gap-2">
      <Icon {icon} class="text-text-primary" width="24" height="24" />
      <div>
        <div class="font-semibold text-text-primary">{title}</div>
        <div class="text-text-secondary truncate">{message}</div>
      </div>
    </div>
    <button
      class="flex items-center p-2 text-text-secondary bg-blackwhite/0 hover:text-text-primary hover:bg-blackwhite/5 transition-colors cursor-pointer duration-100 rounded-4xl"
      onclick={() => toast.dismiss(id)}
    >
      <Icon
        icon="heroicons:x-mark-16-solid"
        class=" transition-colors  duration-100"
        width="16"
        height="16"
      />
    </button>
  </div>
</div>
