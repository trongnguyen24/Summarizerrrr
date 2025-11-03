<script>
  // @ts-nocheck
  let { question, index, isSelected = false, onclick } = $props()
</script>

<button
  class="question-chip w-full text-left p-3 border border-border rounded-md transition-all duration-200 {isSelected
    ? 'bg-primary/10 border-primary'
    : 'bg-surface-2 hover:bg-surface-3 hover:border-border'}"
  {onclick}
>
  <div class="flex items-start gap-2">
    <span
      class="question-number flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-medium {isSelected
        ? 'bg-primary text-white'
        : 'bg-surface-3 text-text-secondary'}"
    >
      {index}
    </span>
    <p class="question-text text-xs text-text-primary flex-1">{question}</p>
  </div>
</button>

<style>
  .question-chip {
    cursor: pointer;
  }

  .question-chip:hover .question-number {
    transform: scale(1.1);
  }

  .question-text {
    line-height: 1.5;
  }
</style>
