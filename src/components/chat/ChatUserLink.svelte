<script>
  // @ts-nocheck
  let { href, title, children } = $props()
</script>

<a {href} {title} target="_blank" rel="noopener noreferrer" class="underline hover:text-accent">
  {@render children?.()}
</a>
