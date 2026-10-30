<script>
  let {
    title,
    children,
    class: className,
    bgDotClass = '',
    ...restProps
  } = $props()
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class={`overflow-hidden bg-background relative ${className}`}
  {...restProps}
>
  <div
    class="absolute z-50 text-[0.65rem] text-muted/75 top-px left-px rounded-br-2xl bg-surface-1 pl-1.5 pr-2 py-1 select-none pointer-events-none"
  >
    {title}
  </div>
  <div class="absolute z-40 border border-border inset-0 pointer-events-none"></div>
  <div class="absolute inset-0 bg-dot {bgDotClass}"></div>
  <span
    class="absolute z-50 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2 pointer-events-none"
  ></span>
  {@render children?.()}
</div>
