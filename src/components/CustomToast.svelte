<script>
  import TextScramble from '@/lib/textScramble.js'
  import { onMount } from 'svelte'

  export let message = 'Saved successfully!'
  export let type = 'success' // 'success' or 'error'

  let textElement
  let textScramble

  onMount(() => {
    textScramble = new TextScramble(textElement)
    textScramble.setText(message)
  })

  let borderColorClass =
    type === 'success' ? 'border-green-500/20' : 'border-red-500/20'
  let bgColorClass = type === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'
  let textColorClass = type === 'success' ? 'text-green-400' : 'text-red-400'
</script>

<div class="toast-wrap w-1 relative z-10">
  <div
    class="relative w-48 overflow-hidden flex flex-col h-13 justify-center px-6 text-left border {borderColorClass} {bgColorClass} {textColorClass}"
  >
    <div bind:this={textElement}>{message}</div>
  </div>
  <span
    class="absolute size-4 rotate-45 bottom-px left-px border {borderColorClass} {bgColorClass} -translate-x-1/2 translate-y-1/2"
  ></span>
</div>
<div
  class="absolute inset-0 left-3 shadow-2xl shadow-gray-950 {bgColorClass}"
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
