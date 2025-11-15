<script>
  // @ts-nocheck
  let { animated = true } = $props()
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  class=" text-border-2"
  class:no-animation={!animated}
  width="96"
  height="96"
  fill="none"
  viewBox="0 0 96 96"
  ><g clip-path="url(#a)">
    <path
      class="stroke-line line-1"
      stroke="currentcolor"
      stroke-dasharray="1 8"
      d="M1 77.5h94"
    />
    <path
      class="stroke-line line-2"
      stroke="currentcolor"
      stroke-dasharray="1 6"
      d="M1 80.5h94"
    />
    <path
      class="stroke-line line-3"
      stroke="currentcolor"
      stroke-dasharray="2 7"
      d="M1 83.5h94"
    />
    <path
      class="stroke-line line-4"
      stroke="currentcolor"
      stroke-dasharray="2 5"
      d="M1 86.5h94"
    />
    <path
      class="stroke-line line-5"
      stroke="currentcolor"
      stroke-dasharray="2 4"
      d="M1 89.5h94"
    />
    <path
      class="stroke-line line-6"
      stroke="currentcolor"
      stroke-dasharray="4 2"
      d="M1 92.5h94"
    />
    <path stroke="currentcolor" d="M1 14.5h94" />
    <path
      class=" text-muted"
      stroke="currentcolor"
      stroke-width="2"
      d="M1 39v18m0 3v3m0-30v3M95 39v18m0 3v3m0-30v3"
    />
    <path
      stroke="currentcolor"
      stroke-width="2"
      d="M0 30V0h96v30M0 66v30h96V67"
    />
    <path
      class=" text-muted"
      fill="currentcolor"
      d="M1 89h6v6H1v-6ZM89 89h6v6h-6v-6ZM89 1h6v6h-6V1ZM1 1h6v6H1V1Z"
    />
  </g><defs
    ><clipPath id="a"><path fill="#fff" d="M0 0h96v96H0z" /></clipPath></defs
  ></svg
>

<style>
  .stroke-line {
    animation: stroke-flow linear infinite;
    color: var(--color-blackwhite-10);
  }

  .no-animation .stroke-line {
    animation: none;
  }

  .line-1 {
    animation-duration: 6s;
  }
  .line-2 {
    animation-duration: 5.2s;
  }
  .line-3 {
    animation-duration: 4.4s;
  }
  .line-4 {
    animation-duration: 3.6s;
  }
  .line-5 {
    animation-duration: 2.8s;
  }
  .line-6 {
    animation-duration: 2s;
  }

  @keyframes stroke-flow {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: 96;
    }
  }
</style>
