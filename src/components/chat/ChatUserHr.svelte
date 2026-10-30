<script>
  // @ts-nocheck
  // Renders a markdown thematic break ("---", "***", "___") as literal text
  // instead of an <hr>, keeping user messages consistent with the composer's
  // minimal set (horizontalRule is disabled there — see editorExtensions.js).
  let { raw = '---' } = $props()
</script>

<p>{(raw || '---').trim()}</p>
