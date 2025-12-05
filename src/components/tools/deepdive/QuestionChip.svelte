<script>
  // @ts-nocheck
  let {
    question,
    index,
    isSelected = false,
    disabled = false,
    onclick,
  } = $props()
</script>

<button
  class="question-chip select-all w-full px-1 text-left text-text-secondary hover:text-text-primary transition-all duration-200 {disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : ''}"
  {onclick}
  {disabled}
>
  <div class="flex group items-start gap-1.5">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      class="size-4 translate-y-1 sm:translate-y-0.5 group-hover:text-blackwhite transition-colors text-muted"
    >
      <path
        fill-rule="evenodd"
        d="M15 8A7 7 0 1 0 1 8a7 7 0 0 0 14 0ZM4.75 7.25a.75.75 0 0 0 0 1.5h4.69L8.22 9.97a.75.75 0 1 0 1.06 1.06l2.5-2.5a.75.75 0 0 0 0-1.06l-2.5-2.5a.75.75 0 0 0-1.06 1.06l1.22 1.22H4.75Z"
        clip-rule="evenodd"
      />
    </svg>

    <p class="question-text !m-0 !p-0 xs:text-sm text-base flex-1">
      {question}
    </p>
  </div>
</button>
