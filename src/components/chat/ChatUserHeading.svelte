<script>
  // @ts-nocheck
  // Renders markdown headings as literal paragraph text (e.g. "# tôi là") so a
  // user message never turns into a big heading. Matches the composer, where the
  // "#" input rule is disabled and "#" stays literal — see editorExtensions.js /
  // markdownCodec.js. The "#" markers are reconstructed from `depth` while inline
  // marks inside the line still render via the children snippet.
  let { depth = 1, children } = $props()
</script>

<p>{'#'.repeat(depth) + ' '}{@render children?.()}</p>
