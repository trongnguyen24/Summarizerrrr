<script>
  // @ts-nocheck
  import { Label, Switch } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import TextScramble from '@/lib/ui/textScramble.js'

  /**
   * Reusable Tool Enable Toggle Component
   *
   * @prop {string} id - HTML id for the switch element
   * @prop {boolean} checked - Toggle state (bindable)
   * @prop {Function} onCheckedChange - Callback when toggle changes
   * @prop {string} [icon='heroicons:cpu-chip-20-solid'] - Icon name (iconify format)
   * @prop {string} [enabledText='Enabled'] - Text to display when enabled
   * @prop {string} [disabledText='Disabled'] - Text to display when disabled
   * @prop {boolean} [useAnimation=true] - Enable TextScramble animation
   */
  let {
    id,
    checked = $bindable(),
    onCheckedChange,
    icon = 'heroicons:cpu-chip-20-solid',
    enabledText = 'Enabled',
    disabledText = 'Disabled',
    useAnimation = true,
  } = $props()

  // TextScramble effect setup
  let textElement
  let textScramble

  $effect(() => {
    if (useAnimation && textElement) {
      textScramble = new TextScramble(textElement)
      textScramble.setText(checked ? enabledText : disabledText)
    }
  })
</script>

<div class="flex items-center">
  <Switch.Root
    {id}
    bind:checked
    {onCheckedChange}
    class="focus-visible:ring-primary border border-blackwhite/5 text-text-secondary flex justify-center items-center focus-visible:ring-offset-background bg-blackwhite/5 hover:bg-blackwhite/10 transition-colors rounded-full focus-visible:outline-hidden size-7.5 shrink-0 cursor-pointer focus-visible:ring-1 focus-visible:ring-offset-1 disabled:cursor-not-allowed data-[state=checked]:text-white disabled:opacity-50"
  >
    <Switch.Thumb
      class="bg-primary rounded-full pointer-events-none block shrink-0 size-7.5 transition-all duration-300 data-[state=checked]:scale-100 data-[state=unchecked]:scale-60 data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-0"
    />
    <Icon {icon} width="20" height="20" class="origin-center absolute z-10" />
  </Switch.Root>
  <Label.Root
    for={id}
    class="cursor-pointer px-2 py-2 w-24 font-bold select-none transition-colors duration-1000 {checked
      ? 'text-primary'
      : 'text-text-primary'}"
  >
    {#if useAnimation}
      <span bind:this={textElement}>
        {checked ? enabledText : disabledText}
      </span>
    {:else}
      {checked ? enabledText : disabledText}
    {/if}
  </Label.Root>
</div>
