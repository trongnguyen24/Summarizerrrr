<script>
  // @ts-nocheck
  import { Label, Switch } from 'bits-ui'
  import Icon from '@iconify/svelte'

  let { id, name, checked = $bindable(), onEdit } = $props()
</script>

<div class="flex flex-row items-center gap-0.5">
  <Switch.Root
    {id}
    {name}
    bind:checked
    title="Active custom prompt"
    class="focus-visible:ring-primary group overflow-hidden relative  text-text-secondary flex items-center focus-visible:ring-offset-background px-3  transition-colors focus-visible:outline-hidden w-full h-8  cursor-pointer  focus-visible:ring-1 focus-visible:ring-offset-1 data-[state=checked]:border-border data-[state=checked]:text-white"
  >
    <div
      class=" absolute inset-0 bg-muted/5 border border-transparent hover:border-blackwhite/15 transition-colors
      {checked ? ' !border-border !bg-blackwhite/5' : ''}"
    ></div>
    <div
      class="size-4 absolute z-10 -left-2 -bottom-2 bg-surface-1 rotate-45 border border-transparent group-hover:border-blackwhite/15 transition-colors
      {checked ? ' !border-border ' : ''}"
    ></div>
    <span
      class="w-2 h-1 bg-white rotate-45 absolute rounded-t-xs left-0 z-0 bottom-1 translate-x-0.5 shadow-[0_-2px_6px_rgba(255,255,255,1),0_-1px_3px_rgba(255,255,255,0.647)]"
    ></span>
    <Label.Root class="cursor-pointer select-none" for={id}>
      {name}
    </Label.Root>
  </Switch.Root>
  <button
    class="bg-muted/5 h-8 flex text-transparent justify-center items-center w-2 border transition-all border-transparent overflow-hidden disabled:cursor-default
     {checked
      ? '!w-10 !text-text-primary !bg-blackwhite/5 !border-border '
      : ''}"
    disabled={!checked}
    onclick={onEdit}
    title="Edit prompt"
  >
    <Icon icon="solar:pen-bold" width="16" height="16" />
  </button>
</div>
