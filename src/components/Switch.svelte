<script>
  // @ts-nocheck
  import { Label, Switch } from 'bits-ui'

  let { id, name, checked = $bindable() } = $props()
</script>

<div class="flex flex-row items-center gap-2">
  <Switch.Root
    {id}
    {name}
    bind:checked
    class="focus-visible:ring-primary border border-blackwhite/5 text-text-secondary flex items-center focus-visible:ring-offset-background px-px bg-blackwhite/5 hover:bg-blackwhite/10 transition-colors rounded-full  focus-visible:outline-hidden  w-8 h-4  shrink-0 cursor-pointer  focus-visible:ring-1 focus-visible:ring-offset-1 disabled:cursor-not-allowed data-[state=checked]:text-white data-[state=checked]:bg-blackwhite/20 disabled:opacity50"
  >
    <Switch.Thumb
      class="bg-muted rounded-full pointer-events-none block shrink-0 size-3 transition-all duration-300 data-[state=checked]:scale-100 data-[state=unchecked]:translate-x-0  data-[state=checked]:translate-x-4"
    />
  </Switch.Root>
  <Label.Root class="cursor-pointer select-none" for={id}>
    {name}
  </Label.Root>
</div>
