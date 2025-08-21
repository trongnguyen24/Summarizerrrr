<script>
  let { title, children, class: className } = $props()
</script>

<div class={`overflow-hidden bg-background relative ${className}`}>
  <div
    class="absolute z-50 text-[0.65rem] text-muted/75 top-px z-10 left-px rounded-br-2xl bg-surface-1 pl-1.5 pr-2 py-1"
  >
    {title}
  </div>
  <div class="absolute z-40 border border-border inset-0"></div>
  <div class="absolute inset-0 bg-dot"></div>
  <span
    class="absolute z-50 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
  ></span>
  {@render children?.()}
</div>
