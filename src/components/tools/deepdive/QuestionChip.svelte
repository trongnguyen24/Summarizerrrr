<script>
  // @ts-nocheck
  let { question, index, isSelected = false, onclick } = $props()
</script>

<button
  class="question-chip w-full px-4 py-2 text-left text-text-secondary hover:text-text-primary transition-all duration-200"
  {onclick}
>
  <div class="flex items-start gap-1.5">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      class="size-4 text-muted/50 translate-y-0.75"
    >
      <path
        fill-rule="evenodd"
        d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-6 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.293 5.293a1 1 0 1 1 .99 1.667c-.459.134-1.033.566-1.033 1.29v.25a.75.75 0 1 0 1.5 0v-.115a2.5 2.5 0 1 0-2.518-4.153.75.75 0 1 0 1.061 1.06Z"
        clip-rule="evenodd"
      />
    </svg>

    <p class="question-text text-sm flex-1">{question}</p>
  </div>
</button>
