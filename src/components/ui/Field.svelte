<script>
  import { fieldPaths } from './paths'
</script>

<div class="field">
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 383 378"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {#each fieldPaths as d}
      {@const seed = Math.random()}
      {@const ab = seed > 0.5}
      <path
        style="animation-delay: {seed * -10}s"
        {d}
        stroke-width={ab ? 1 : 2}
        stroke-linecap="round"
        stroke="var(--color-primary)"
      />
    {/each}
    <defs>
      <radialGradient
        id="spokes_gradient"
        cx="0"
        cy="0"
        r="1.5"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(191 194) scale(175 175)"
      >
        <stop stop-color="var(--color-primary)" stop-opacity="0.6" />
        <stop
          offset="0.95"
          stop-color="var(--color-primary)"
          stop-opacity="0"
        />
      </radialGradient>
    </defs>
  </svg>
</div>

<style>
  .field {
    width: 100%;
    max-width: 100%;
    backface-visibility: hidden;
    contain: none;
  }

  svg {
    margin: auto;
    backface-visibility: hidden;
    contain: none;
  }

  path {
    animation: pulse 15s linear infinite;
    stroke-dasharray: 3 50;
    stroke-dashoffset: 200;
    transform-origin: center;
    stroke: url(#spokes_gradient);
  }

  @keyframes pulse {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: 160;
    }
  }
</style>
