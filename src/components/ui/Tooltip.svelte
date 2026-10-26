<script>
  import { Tooltip } from 'bits-ui'
  import { slideScaleFade } from '@/lib/utils/slideScaleFade'

  let {
    content,
    children,
    customAnchor = null,
    side = 'bottom',
    align = 'center',
    sideOffset = 4,
    delayDuration = 500,
    disableHoverableContent = true,
  } = $props()
</script>

<Tooltip.Root {delayDuration} {disableHoverableContent}>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      {@render children?.({ builder: props })}
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content {side} {align} {sideOffset} {customAnchor} forceMount>
    {#snippet child({ wrapperProps, props, open })}
      {#if open}
        <div {...wrapperProps}>
          <div
            {...props}
            transition:slideScaleFade={{
              duration: 200,
              slideDistance: '0px',
              startScale: 1,
              startBlur: 0,
            }}
            class="z-50 overflow-hidden text-[10px] px-2 py-1 bg-surface-2 border border-border rounded-md shadow-md text-text-primary"
          >
            {content}
          </div>
        </div>
      {/if}
    {/snippet}
  </Tooltip.Content>
</Tooltip.Root>
