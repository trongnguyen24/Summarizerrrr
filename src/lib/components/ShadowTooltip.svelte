<!-- @ts-nocheck -->
<script>
  // Props
  let { content, children } = $props()
</script>

<div class="group relative flex justify-center">
  <!-- Trigger content (the button or element that shows the tooltip) -->
  {@render children?.()}

  <!-- Tooltip content -->
  <div
    class="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1.5 font-mono text-xs bg-surface-2 rounded-sm text-text-primary whitespace-nowrap"
  >
    {content}
  </div>
</div>

<style>
  /* Optional: Add custom styles here if Tailwind classes are not sufficient */
</style>
