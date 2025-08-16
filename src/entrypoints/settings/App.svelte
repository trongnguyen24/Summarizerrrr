<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
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

  $effect(() => {
    initializeTheme()
    const unsubscribeSystemTheme = subscribeToSystemThemeChanges()
    const unsubscribeTheme = subscribeToThemeChanges()

    return () => {
      unsubscribeSystemTheme()
      unsubscribeTheme()
    }
  })
</script>

<div class="flex parent h-screen bg-background">
  <span class=" bg-border/70 top"></span>
  <span class=" bg-border/70 bottom"></span>
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
