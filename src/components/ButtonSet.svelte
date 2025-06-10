<script>
  let { title, Description, class: className, onclick, ...rest } = $props()
</script>

<button
  type="button"
  title={Description}
  class={`w-full group ${className}`}
  {onclick}
  {...rest}
>
  <div
    class="relative overflow-hidden flex flex-col gap-0 px-3 text-text-secondary text-left py-1.5 font-mono bg-muted/5 dark:bg-muted/5 border border-transparent hover:border-white/10 transition-colors duration-150"
  >
    <div class="title">{title}</div>
  </div>
</button>

<style>
  button.active div .title {
    color: var(--color-text-primary);
  }

  button.active > div {
    border-color: var(--color-border);
  }
  button div::after {
    display: block;
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    height: 8px;
    width: 8px;
    background-color: var(--color-text-primary);
    transform: rotate(45deg) translate(-50%, -50%);
    transition: transform 0.3s ease-out;
    transform-origin: top right;
  }
  button.active div::after {
    transform: rotate(45deg) translate(50%, -50%);
  }
  button div::before {
    display: block;
    content: '';
    z-index: 0;
    position: absolute;
    bottom: 0;
    left: 0;
    height: 28px;
    width: 100%;
    background-color: rgba(124, 124, 124, 0.035);
    transform: translateY(100%);
    transition: transform 0.3s ease-out;
  }
  button.active div::before {
    transform: translateY(0);
  }
</style>
