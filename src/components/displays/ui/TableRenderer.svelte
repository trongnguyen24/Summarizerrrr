<script>
  let { children, ...props } = $props()
</script>

<div class="table-container">
  <table {...props}>
    {@render children?.()}
  </table>
</div>

<style>
  .table-container {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin-bottom: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5em;
    padding-top: 0.125em;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  .table-container:hover {
    scrollbar-color: var(--color-border) transparent;
  }

  /* Webkit scrollbar - hidden until hover */
  .table-container::-webkit-scrollbar {
    height: 6px;
    background: transparent;
  }

  .table-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .table-container::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 3px;
  }

  .table-container:hover::-webkit-scrollbar-thumb {
    background: var(--color-border);
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0;
    /* Remove border from table itself as container has it */
    border: none;
  }
</style>
