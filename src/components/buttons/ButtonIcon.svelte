<script>
  let {
    children,
    title,
    Description,
    class: className,
    onclick,
    ...rest
  } = $props()
</script>

<button
  type="button"
  title={Description}
  class={`group overflow-hidden relative w-20 ${className}`}
  {onclick}
  {...rest}
>
  <div
    class="relative overflow-hidden flex flex-col justify-center h-18 items-center gap-1 text-text-secondary text-left font-mono bg-muted/5 dark:bg-muted/5 border border-transparent hover:border-blackwhite/10 transition-colors duration-150"
  >
    {#if children}
      <div class="icon">{@render children()}</div>
    {/if}

    <div class="title text-xs">{title}</div>
  </div>
  <span
    class="absolute size-4 rotate-45 bottom-px left-px bg-muted/5 group-hover:bg-border -translate-x-1/2 translate-y-1/2 transition-colors duration-150"
  ></span>
  <div class="tri"></div>
  <span class="rec"></span>
</button>

<style>
  button {
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 11px 100%, 0% 61px);
  }
  button.active div .title {
    color: var(--color-text-primary);
  }

  button.active > div {
    border-color: var(--color-border);
  }
  button .tri::after {
    display: block;
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    height: 12px;
    width: 12px;
    background-color: var(--color-text-primary);
    transform: rotate(45deg) translate(-50%, -50%);
    transition: transform 0.3s ease-out;
    transform-origin: top right;
  }
  button.active .tri::after {
    transform: rotate(45deg) translate(50%, -50%);
  }
  button .rec {
    position: absolute;
    bottom: 0;
    left: 4px;
    transform: rotate(45deg) translate(-50%, 3px);
    height: 3px;
    border-radius: 2px 2px 0 0;
    width: 16px;
    background-color: transparent;
    transition: transform 0.3s ease-out;
    box-shadow:
      0 -0px 0px #fff,
      0 0 0 #fff;
  }
  button.active .rec {
    background-color: #fff;
    transform: rotate(45deg) translate(-50%, 0);
    box-shadow:
      0 -2px 6px #fff,
      0 -1px 3px #ffffffa5;
  }
  button div::before {
    display: block;
    content: '';
    z-index: 0;
    position: absolute;
    bottom: 0;
    left: 0;
    height: 72px;
    width: 100%;
    background-color: rgba(124, 124, 124, 0.035);
    transform: translateY(100%);
    transition: transform 0.3s ease-out;
  }
  button.active div::before {
    transform: translateY(0);
  }
</style>
