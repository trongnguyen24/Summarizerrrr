<script>
  let { title, Description, class: className, onclick, ...rest } = $props()
</script>

<button class={`w-full group ${className}`} {onclick} {...rest}>
  <div
    class="relative overflow-hidden flex flex-col gap-0 px-3 text-text-secondary text-left py-1.5 font-mono bg-black/5 dark:bg-muted/5 border border-transparent hover:border-white/10 transition-colors duration-150"
  >
    <div class="title">{title}</div>
    <div class="description text-muted">{Description}</div>
  </div>
</button>

<style>
  button.active div .title {
    color: var(--color-text-primary);
  }
  button.active div .description {
    color: var(--color-text-secondary);
  }
  button.active div {
    border-color: var(--color-text-secondary);
  }
  button div::after {
    display: block;
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    height: 20px;
    width: 20px;
    background-color: var(--color-text-primary);
    transform: rotate(45deg) translate(-50%, -50%);
    transition: transform 0.3s ease-out;
    transform-origin: top right;
  }
  button.active div::after {
    transform: rotate(45deg) translate(50%, -50%);
  }
</style>
