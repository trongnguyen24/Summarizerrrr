<script>
  // @ts-nocheck
  let { toggle } = $props()

  function handleClick() {
    if (toggle) {
      toggle()
    }
  }
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button onclick={handleClick} class="floating-button" title="Toggle Summarizer">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
  >
    <path
      fill="currentColor"
      d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.5 7.5 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.5 7.5 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.5 7.5 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.5 7.5 0 0 0 4.464-4.464Z"
    />
  </svg>
</button>

<style>
  .floating-button {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: #1a73e8;
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    transition:
      transform 0.2s ease-in-out,
      box-shadow 0.2s ease-in-out;
  }

  .floating-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
</style>
