<script>
  let { title, Description, class: className, onclick, ...rest } = $props()
</script>

<button
  type="button"
  title={Description}
  class={`w-full relative group ${className}`}
  {onclick}
  {...rest}
>
  <div
    class="relative overflow-hidden flex flex-col gap-0 px-3 text-text-secondary text-left py-1.5 font-mono bg-muted/5 dark:bg-muted/5 border border-transparent hover:border-blackwhite/15 focus:border-blackwhite/30 dark:focus:border-blackwhite/10 focus:outline-none focus:ring-0 transition-colors duration-150"
  >
    <div class="title">{title}</div>
  </div>
  <span
    class="absolute size-4 rotate-45 bottom-0 left-0 bg-muted/5 group-hover:bg-border -translate-x-1/2 translate-y-1/2 transition-colors duration-150"
  ></span>
  <div class="tri"></div>
  <span class="rec"></span>
</button>

<style>
  button {
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 10px 100%, 0% 20px);
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
    height: 9px;
    width: 9px;
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
    left: 3px;
    transform: rotate(45deg) translate(-50%, 3px);
    height: 2px;
    border-radius: 2px 2px 0 0;
    width: 8px;
    background-color: transparent;
    transition: transform 0.3s ease-out;
    box-shadow:
      0 -0px 0px #fff,
      0 0 0 #fff;
  }
  button.active .rec {
    background-color: #fff;
    transform: rotate(45deg) translate(-50%, -2px);
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
    height: 30px;
    width: 100%;
    background-color: rgba(124, 124, 124, 0.035);
    transform: translateY(100%);
    transition: transform 0.3s ease-out;
  }
  button.active div::before {
    transform: translateY(0);
  }
</style>
