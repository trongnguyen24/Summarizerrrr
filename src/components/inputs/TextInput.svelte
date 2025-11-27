<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import PlusIcon from '@/components/icons/PlusIcon.svelte'

  let {
    value = $bindable(), // Đổi tên từ apiKey thành value
    label = '',
    placeholder = '',
    id = 'text-input', // Thêm prop id với default value
    list = undefined,
    onSave = () => {},
    saveStatus = $bindable(''),
  } = $props()

  let valueDebounceTimer = null // Đổi tên biến debounce timer

  /**
   * Schedules the input value save operation with a debounce.
   * Clears any existing timer and sets a new one.
   */
  function scheduleValueSave() {
    // Đổi tên hàm
    clearTimeout(valueDebounceTimer)
    valueDebounceTimer = setTimeout(() => {
      onSave(value.trim())
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }
</script>

<div class="flex flex-col gap-2">
  {#if label}
    <div class="flex items-center gap-1 justify-between">
      <label for={id} class="block">
        {label}
      </label>
      {#if saveStatus}
        <p id="save-status" transition:fade class="text-success flex mr-auto">
          Saved!
        </p>
      {/if}
    </div>
  {/if}

  <div
    class="overflow-hidden relative w-full h-9 bg-muted/5 border border-border hover:border-blackwhite/15 focus-within:!border-blackwhite/20 dark:border-blackwhite/10 transition-colors duration-150"
  >
    <input
      type="text"
      {placeholder}
      {id}
      {list}
      bind:value
      class="absolute top-0 left-0 w-[133.33%] h-[133.33%] pl-4 pr-4 text-base bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted origin-top-left scale-75"
      oninput={scheduleValueSave}
    />
  </div>
</div>
