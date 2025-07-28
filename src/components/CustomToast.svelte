<script>
  import TextScramble from '@/lib/textScramble.js'
  import { onMount } from 'svelte'

  let textElement
  let textScramble

  onMount(() => {
    textScramble = new TextScramble(textElement)
    textScramble.setText('Saved successfully!')
  })
</script>

<div class="toast-wrap w-1 relative z-10">
  <div
    class="relative w-48 overflow-hidden flex flex-col h-13 justify-center px-6 text-text-secondary text-left border bg-surface-2 border-blackwhite/10"
  >
    <div bind:this={textElement}>Saved successfully!</div>
  </div>
  <span
    class="absolute size-4 rotate-45 bottom-px left-px border border-blackwhite/10 bg-surface-2 -translate-x-1/2 translate-y-1/2"
  ></span>
</div>
<div
  class="absolute inset-0 left-3 shadow-2xl shadow-gray-950 bg-surface-2"
></div>

<style>
  .toast-wrap {
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 12px 100%, 0% 40px);
  }

  .toast-wrap {
    animation: show-toast 0.3s ease-out forwards;
  }
  @keyframes show-toast {
    from {
      width: 0;
    }
    to {
      width: 12rem;
    }
  }
</style>
