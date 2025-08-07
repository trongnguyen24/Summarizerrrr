<script>
  // @ts-nocheck
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  function handleClick() {
    dispatch('toggle')
  }
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button onclick={handleClick} class="floating-button" title="Toggle Summarizer">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M12 3c-1.1 0-2 .9-2 2v2h4V5c0-1.1-.9-2-2-2z" />
    <path
      d="M5 10v1c0 3.9 3.1 7 7 7s7-3.1 7-7v-1h-2v1c0 2.8-2.2 5-5 5s-5-2.2-5-5v-1H5z"
    />
    <path d="M10 18v2h4v-2h-4z" />
    <path
      d="M5 10V7c0-1.7 1.3-3 3-3h8c1.7 0 3 1.3 3 3v3h-2V7c0-.6-.4-1-1-1H9c-.6 0-1 .4-1 1v3H5z"
    />
  </svg>
</button>

<style>
  .floating-button {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 56px;
    height: 56px;
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
