<script>
  // @ts-nocheck
  import { Label, Switch } from 'bits-ui'
  import Icon from '@iconify/svelte'

  /**
   * Reusable Tool Enable Toggle Component
   *
   * @prop {string} id - HTML id for the switch element
   * @prop {boolean} checked - Toggle state (bindable)
   * @prop {Function} onCheckedChange - Callback when toggle changes
   * @prop {string} [icon='heroicons:cpu-chip-20-solid'] - Icon name (iconify format)
   * @prop {string} [text='Enabled'] - Text to display when enabled
   * @prop {boolean} [useAnimation=true] - Enable TextScramble animation
   */
  let {
    id,
    checked = $bindable(),
    onCheckedChange,
    icon = 'heroicons:cpu-chip-20-solid',
    text = 'Enabled',
    useAnimation = true,
  } = $props()
</script>

<div class="flex w-full items-center">
  <Switch.Root
    {id}
    bind:checked
    {onCheckedChange}
    class="focus-visible:ring-primary group overflow-hidden w-full relative  text-text-secondary flex items-center focus-visible:ring-offset-background   transition-colors focus-visible:outline-hidden pr-4 h-9 pl-8 cursor-pointer  focus-visible:ring-1 focus-visible:ring-offset-1 data-[state=checked]:border-border data-[state=checked]:text-white"
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

    <Label.Root
      class="cursor-pointer flex flex-col overflow-hidden justify-start line-clamp-1 text-text-secondary transition-colors duration-1000 select-none {checked
        ? ' !text-text-primary '
        : ''}"
      for={id}
    >
      {text}
    </Label.Root>
  </Switch.Root>
</div>
