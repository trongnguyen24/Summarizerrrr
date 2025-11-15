<script>
  // @ts-nocheck
  let { animated = true } = $props()
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  class=" text-border-2"
  class:no-animation={!animated}
  width="64"
  height="64"
  fill="none"
  ><g clip-path="url(#a)">
    <path
      class="stroke-line line-1"
      stroke="currentcolor"
      stroke-dasharray="1 8"
      d="M1 51.5h62"
    />
    <path
      class="stroke-line line-2"
      stroke="currentcolor"
      stroke-dasharray="1 6"
      d="M1 53.5h62"
    />
    <path
      class="stroke-line line-3"
      stroke="currentcolor"
      stroke-dasharray="2 7"
      d="M1 55.5h62"
    />
    <path
      class="stroke-line line-4"
      stroke="currentcolor"
      stroke-dasharray="2 5"
      d="M1 57.5h62"
    />
    <path
      class="stroke-line line-5"
      stroke="currentcolor"
      stroke-dasharray="2 4"
      d="M1 59.5h62"
    />
    <path
      class="stroke-line line-6"
      stroke="currentcolor"
      stroke-dasharray="4 2"
      d="M1 61.5h62"
    />
    <path stroke="currentcolor" d="M1 9.5h62" />
    <path
      class=" text-muted"
      stroke="currentcolor"
      stroke-width="2"
      d="M1 26v12m0 2v2m0-20v2M63 26v12m0 2v2m0-20v2"
    />
    <path
      stroke="currentcolor"
      stroke-width="2"
      d="M0 20V0h64v20M0 44v20h64V45"
    />
    <path
      class=" text-muted"
      fill="currentcolor"
      d="M1 59h4v4H1v-4ZM59 59h4v4h-4v-4ZM59 1h4v4h-4V1ZM1 1h4v4H1V1Z"
    />
  </g><defs
    ><clipPath id="a"><path fill="#fff" d="M0 0h64v64H0z" /></clipPath></defs
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
      stroke-dashoffset: 64;
    }
  }
</style>
