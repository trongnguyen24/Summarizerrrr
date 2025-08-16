<script>
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'

  const openSettings = () => {
    browser.tabs.create({ url: browser.runtime.getURL('settings.html') })
  }
</script>

<button
  onclick={openSettings}
  class="p-1 setting-animation transition-colors hover:bg-surface-1 rounded-full hover:text-text-primary"
  title={$t('settings.open_settings')}
>
  <Icon width={24} icon="heroicons:cog-6-tooth" />
</button>

<style>
  .setting-animation {
    animation: gear-jiggle 8s ease-in-out infinite;
  }

  @keyframes gear-jiggle {
    0%,
    15%,
    20.001%,
    50%,
    54.001%,
    58.001%,
    85%,
    85%,
    90.001%,
    100% {
      transform: rotate(0deg);
    }
    20% {
      transform: rotate(60deg);
    }
    52.5% {
      transform: rotate(-6deg);
    }
    56.5% {
      transform: rotate(6deg);
    }
    90% {
      transform: rotate(60deg);
    }
  }
</style>
