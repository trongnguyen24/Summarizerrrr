<script>
  // @ts-nocheck
  import { Label, Switch } from 'bits-ui'
  import Icon from '@iconify/svelte'

  let { id, name, checked = $bindable(), onCheckedChange } = $props()

  $effect(() => {
    if (onCheckedChange) {
      onCheckedChange(checked)
    }
  })
</script>

<div class="flex flex-row items-center gap-0.5">
  <Switch.Root
    {id}
    {name}
    bind:checked
    title="Active custom prompt"
    class="focus-visible:ring-primary group overflow-hidden relative  text-text-secondary flex items-center focus-visible:ring-offset-background pl-8 pr-2  transition-colors focus-visible:outline-hidden w-full h-9  cursor-pointer  focus-visible:ring-1 focus-visible:ring-offset-1 data-[state=checked]:border-border data-[state=checked]:text-white"
  >
    <div
      class=" absolute inset-0 bg-muted/5 border border-blackwhite/10 hover:border-blackwhite/15 transition-colors
      {checked
        ? ' !border-border !bg-blackwhite/5 hover:!border-blackwhite/15'
        : ''}"
    ></div>
    <div
      class="size-4 absolute z-10 -left-2 -bottom-2 bg-surface-1 rotate-45 border group-hover:border-blackwhite/15 transition-colors
      {checked
        ? ' !border-border group-hover:!border-blackwhite/25'
        : 'border-blackwhite/10 '}"
    ></div>
    <span
      class="size-1.5 bg-white absolute transition-all rounded-full z-0 left-4 {checked
        ? '!shadow-[0_0_6px_rgba(255,255,255,1),0_0_3px_rgba(255,255,255,0.647)] '
        : '!bg-blackwhite/10 shadow-[0_0_0_rgba(255,255,255,0),0_0_0_rgba(255,255,255,0)]'}"
    ></span>

    <!-- <Icon
      icon="solar:shield-check-bold"
      class="size-5 absolute text-text-secondary transition-all left-3 {checked
        ? '!text-white !drop-shadow-[0_0_4px_rgba(255,255,255,1),0_0_1.5px_rgba(255,255,255,0.647)] '
        : ' drop-shadow-[0_0_0_rgba(255,255,255,0),0_0_0_rgba(255,255,255,0)]'}"
    /> -->
    <Label.Root
      class="cursor-pointer flex flex-col overflow-hidden justify-start line-clamp-1 text-text-secondary select-none {checked
        ? ' !text-text-primary '
        : ''}"
      for={id}
    >
      {name}
    </Label.Root>
  </Switch.Root>
</div>
