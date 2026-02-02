<script>
  // @ts-nocheck
  import { Label, Switch } from 'bits-ui'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'

  /**
   * Backup Model Toggle Component
   *
   * Toggle button for selecting backup models in Gemini Advanced mode.
   * Multiple models can be selected simultaneously.
   *
   * @prop {string} id - HTML id for the switch element
   * @prop {string} modelValue - The model value to toggle (e.g., 'gemini-2.5-flash')
   * @prop {string} label - Display label for the model
   */
  let { id, modelValue, label } = $props()

  // Check if this model is currently selected as backup
  const isSelected = $derived(
    settings.geminiAdvancedBackupModels?.includes(modelValue) || false,
  )

  function handleToggle(checked) {
    const current = settings.geminiAdvancedBackupModels || []
    let newValues
    if (checked) {
      newValues = [...current, modelValue]
    } else {
      newValues = current.filter((v) => v !== modelValue)
    }
    updateSettings({ geminiAdvancedBackupModels: newValues })
  }
</script>

<div class="flex w-full items-center">
  <Switch.Root
    {id}
    checked={isSelected}
    onCheckedChange={handleToggle}
    class="focus-visible:ring-primary w-full group min-w-24 overflow-hidden relative text-text-secondary flex items-center focus-visible:ring-offset-background transition-colors focus-visible:outline-hidden pr-3 h-8 pl-6 cursor-pointer focus-visible:ring-1 focus-visible:ring-offset-1 data-[state=checked]:border-border data-[state=checked]:text-white"
  >
    <div
      class="absolute inset-0 bg-muted/5 border border-transparent hover:border-blackwhite/15 transition-colors
      {isSelected
        ? ' !border-border !bg-blackwhite/5 hover:!border-blackwhite/15'
        : ''}"
    ></div>
    <div
      class="size-3 absolute z-10 -left-1.5 -bottom-1.5 bg-surface-1 rotate-45 border group-hover:border-blackwhite/15 transition-colors
      {isSelected
        ? ' !border-border group-hover:!border-blackwhite/25'
        : 'border-blackwhite/10 '}"
    ></div>
    <span
      class="size-1 bg-white absolute transition-all rounded-full z-0 left-3 {isSelected
        ? '!shadow-[0_0_6px_rgba(255,255,255,1),0_0_3px_rgba(255,255,255,0.647)] '
        : '!bg-blackwhite/10 shadow-[0_0_0_rgba(255,255,255,0),0_0_0_rgba(255,255,255,0)]'}"
    ></span>

    <Label.Root
      class="cursor-pointer flex flex-col overflow-hidden justify-start line-clamp-1 text-xs text-text-secondary transition-colors duration-300 select-none {isSelected
        ? ' !text-text-primary '
        : ''}"
      for={id}
    >
      {label}
    </Label.Root>
  </Switch.Root>
</div>
