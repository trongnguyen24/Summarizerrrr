<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import Icon, { loadIcons } from '@iconify/svelte'

  import {
    settings,
    loadSettings,
    subscribeToSettingsChanges,
  } from '@/stores/settingsStore.svelte.js'
  import Setting from '@/components/settings/Setting.svelte'
  import {
    themeSettings,
    initializeTheme,
    subscribeToSystemThemeChanges,
    subscribeToThemeChanges,
  } from '@/stores/themeStore.svelte.js'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  import '@fontsource/mali'

  // Browser detection for review URL
  const isFirefox = import.meta.env.FIREFOX
  const reviewUrl = isFirefox
    ? 'https://addons.mozilla.org/firefox/addon/summarizerrrr/reviews/'
    : 'https://chromewebstore.google.com/detail/summarizerrrr/ahfjndakflcegianjdojpldllodpkkpc/reviews'

  $effect(() => {
    initializeTheme()
    const unsubscribeSystemTheme = subscribeToSystemThemeChanges()
    const unsubscribeTheme = subscribeToThemeChanges()

    return () => {
      unsubscribeSystemTheme()
      unsubscribeTheme()
    }
  })

  // Apply reduce motion setting to DOM
  $effect(() => {
    const _reduceMotion = settings.reduceMotion
    import('@/services/animationService.js').then(
      ({ applyReduceMotionToDOM }) => {
        applyReduceMotionToDOM()
      },
    )
  })

  loadSettings().then(() => {
    subscribeToSettingsChanges()
  })
</script>

<div class="flex parent h-dvh bg-background">
  <span class=" bg-border/70 top">
    <div
      class="w-full absolute max-w-2xl left-1/2 -translate-x-1/2 top-px z-10 flex items-end"
    >
      <!-- Bug Reports & Feature Ideas -->
      <a
        href="https://github.com/trongnguyen24/Summarizerrrr/issues"
        target="_blank"
        rel="noopener noreferrer"
        class="flex w-fit ml-auto text-muted hover:text-primary py-1 px-3 items-center gap-1"
      >
        <Icon icon="mdi:github" width="16" height="16" />
        <span class="text-xs">Bug reports & feature ideas</span>
        <Icon icon="heroicons:arrow-up-right-16-solid" width="12" height="12" />
      </a>
    </div>
  </span>
  <span class=" bg-border/70 relative bottom">
    <!-- Footer Links: Support & Bug Reports -->
    <div
      class="w-full absolute max-w-2xl left-1/2 -translate-x-1/2 top-px z-10"
    >
      <!-- Buy Me a Coffee or Review -->
      <div
        class="flex w-full text-muted py-1 px-3 items-center gap-1 text-xs justify-center"
      >
        If helpful? Support me on <a
          href="https://www.buymeacoffee.com/trongnguyen24"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 hover:text-primary underline underline-offset-1"
          >Buy Me a Coffee</a
        >
        or leave a
        <a
          href={reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 hover:text-primary underline underline-offset-1"
          >Review</a
        >
        <!-- <a
          href="https://www.buymeacoffee.com/trongnguyen24"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 hover:text-primary"
        >
          <Icon icon="simple-icons:buymeacoffee" width="14" height="14" />
          <span>Buy me a coffee</span>
        </a>
        <span class="text-muted/50">or</span>
        <a
          href={reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 hover:text-primary"
        >
          <Icon icon="material-symbols:star-rounded" width="14" height="14" />
          <span>Review</span>
        </a> -->
      </div>
    </div>
  </span>
  <span class="bg-border/70 left"></span>
  <span class="bg-border/70 right"></span>
  <div class="settings max-w-2xl w-full relative">
    <div
      class="absolute hidden sm:block left-0 z-10 -translate-x-[5px] -translate-y-[5px]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
        ><path d="M4 0h1v9H4z" fill="currentColor" /><path
          d="M9 4v1H0V4z"
          fill="currentColor"
        /></svg
      >
    </div>
    <div
      class="absolute hidden sm:block right-0 bottom-0 z-10 translate-x-[5px] translate-y-[5px]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
        ><path d="M4 0h1v9H4z" fill="currentColor" /><path
          d="M9 4v1H0V4z"
          fill="currentColor"
        /></svg
      >
    </div>

    <Setting />
  </div>
</div>

<style>
  .parent {
    display: grid;
    grid-template-columns:
      minmax(1.5rem, 1fr) /* trái min 1.5rem */
      1px
      min(672px, calc(100% - 3rem - 2px))
      /* giữa: 640px hoặc 100% - 3rem - 2px, tuỳ nhỏ hơn */
      1px
      minmax(1.5rem, 1fr); /* phải min 1.5rem */
    grid-template-rows: 1.5rem 1px 1fr 1px 1.5rem;
    grid-column-gap: 0px;
    grid-row-gap: 0px;
  }
  .settings {
    grid-area: 3 / 3 / 4 / 4;
  }
  .top {
    grid-area: 2 / 1 / 3 / 6;
  }
  .bottom {
    grid-area: 4 / 1 / 5 / 6;
  }
  .left {
    grid-area: 1 / 2 / 6 / 3;
  }
  .right {
    grid-area: 1 / 4 / 6 / 5;
  }
  @media (max-width: 42rem) {
    .settings {
      grid-area: 1 / 1 / 7 / 7;
    }
    .top,
    .bottom,
    .left,
    .right {
      display: none;
    }
  }
</style>
