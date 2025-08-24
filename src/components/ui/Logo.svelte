<script>
  import { animate, stagger } from 'animejs'
  import Field from './Field.svelte'

  $effect(() => {
    animate('.in', {
      opacity: [0, 1],
      scale: [0.8, 1],
      rotate: [-15, 0],
      delay: stagger(150),
    }),
      animate('.field-in', {
        opacity: [0, 1],
        delay: 900,
      })
  })
</script>

<svg
  class=" relative z-10"
  viewBox="0 0 256 256"
  xmlns="http://www.w3.org/2000/svg"
>
  <g clip-path="url(#clip0_220_253)">
    <path
      class="stroke-border in"
      d="M128 0.5C158.184 0.5 180.772 0.501242 198.159 2.83887C215.532 5.17458 227.637 9.83451 236.901 19.0986C246.165 28.3628 250.825 40.4684 253.161 57.8408C255.499 75.2279 255.5 97.816 255.5 128C255.5 158.184 255.499 180.772 253.161 198.159C250.825 215.532 246.165 227.637 236.901 236.901C227.637 246.165 215.532 250.825 198.159 253.161C180.772 255.499 158.184 255.5 128 255.5C97.816 255.5 75.2279 255.499 57.8408 253.161C40.4684 250.825 28.3628 246.165 19.0986 236.901C9.83451 227.637 5.17458 215.532 2.83887 198.159C0.501242 180.772 0.5 158.184 0.5 128C0.5 97.816 0.501242 75.2279 2.83887 57.8408C5.17458 40.4684 9.83451 28.3628 19.0986 19.0986C28.3628 9.83451 40.4684 5.17458 57.8408 2.83887C75.2279 0.501242 97.816 0.5 128 0.5Z"
      fill="none"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <circle
      class="stroke-border in"
      cx="128"
      cy="128"
      r="111.5"
      fill="none"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />

    <circle
      class="stroke-border in"
      cx="128"
      cy="138.667"
      r="95.5"
      fill="none"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <circle
      class="stroke-primary in"
      cx="128"
      cy="128"
      r="106.167"
      fill="none"
    />
    <path
      class="stroke-blue text-surface-1 stroke-blue-300 dark:stroke-sky-700 in"
      d="M128 192L132.42 174.336C134.952 164.206 140.189 154.955 147.572 147.572C154.955 140.189 164.206 134.952 174.336 132.42L192 128L174.336 123.58C164.206 121.048 154.955 115.811 147.572 108.428C140.189 101.045 134.952 91.7937 132.42 81.664L128 64L123.58 81.664C121.05 91.7916 115.815 101.041 108.435 108.424C101.055 115.807 91.8076 121.045 81.6811 123.58L64 128L81.6811 132.42C91.8076 134.955 101.055 140.193 108.435 147.576C115.815 154.959 121.05 164.208 123.58 174.336L128 192Z"
      stroke="#949494"
      fill="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
  </g>
  <defs>
    <clipPath id="clip0_220_253">
      <rect width="256" height="256" fill="currentColor" />
    </clipPath>
  </defs>
</svg>

<div
  class=" absolute inset-8 blur-md z-20 overflow-hidden rounded-full field-in"
>
  <div class="chip__filter"></div>
</div>

<style>
  .stroke-border {
    stroke: var(--color-border);
    transform-origin: center;
  }
  /* .stroke-secondary {
    stroke: var(--color-text-secondary);
    transform-origin: center;
  } */
  .stroke-primary {
    stroke: var(--color-primary);
    transform-origin: center;
  }
  .stroke-blue {
    transform-origin: center;
  }

  .chip__filter {
    position: absolute; /* Or other positioning if needed */

    z-index: 20;
    border-radius: 100px;
  }

  /* Styles for the ::before pseudo-element */
  .chip__filter::before {
    content: '';
    display: block;
    position: absolute;
    filter: blur(60px);
    border-radius: 100px;
    mix-blend-mode: color-dodge;
    width: 8.5rem;
    top: 0;
    aspect-ratio: 1;
    transform-origin: center;
    background: linear-gradient(-45deg, #3f312100 20%, #ffa856, #3f342100 80%)
      200%;

    mix-blend-mode: color-dodge;
    animation: shimmer-1 5s linear infinite;
  }

  /* Styles for the ::after pseudo-element */
  .chip__filter::after {
    content: '';
    display: block;
    position: absolute;
    width: 8.5rem;
    aspect-ratio: 1;
    mix-blend-mode: color-dodge;
    transform-origin: center;
    background: linear-gradient(45deg, #3f312100 40%, #ffbb67, #3f342100 55%)
      300%;
    filter: blur(60px);
    border-radius: 100px;
    mix-blend-mode: color-dodge;
    animation: shimmer-2 4s linear infinite;
  }

  @keyframes shimmer-1 {
    0% {
      transform: translateX(-100%) translateY(-100%) scale(0.2);
    }
    50% {
      transform: translateX(0) translateY(0) scale(0.75);
    }
    100% {
      transform: translateX(100%) translateY(100%) scale(0.2);
    }
  }
  @keyframes shimmer-2 {
    0% {
      transform: translateX(-100%) translateY(100%) scale(0.1);
    }
    50% {
      transform: translateX(0) translateY(0) scale(0.8);
    }
    100% {
      transform: translateX(100%) translateY(-100%) scale(0.2);
    }
  }
</style>
