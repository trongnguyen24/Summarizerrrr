<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import { domVisibility } from '@/stores/stateAbout.svelte.js'
  import {
    themeSettings,
    setTheme,
    // updateThemeSettings as updateThemeStoreSettings, // Không còn cần thiết, dùng setTheme thay thế
  } from '@/stores/themeStore.svelte' // Import themeSettings và updateThemeSettings
  import { t } from 'svelte-i18n'
  import Logo from '../ui/Logo.svelte'
  import packageJson from '../../../package.json'
  import ButtonSupport from '../buttons/ButtonSupport.svelte'
  import ButtonRate from '../buttons/ButtonRate.svelte'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
</script>

<!-- About Section -->
<div class=" text-pretty flex pb-12 pt-5 px-5 flex-col space-y-6">
  <!-- Logo và tên -->
  <div class="flex gap-2 sm:gap-6 flex-col sm:flex-row items-center">
    <div class="w-56 relative shrink-0 p-4"><Logo /></div>
    <div>
      <h2 class="text-lg text-center sm:text-left font-bold text-primary">
        Summarizerrrr
      </h2>

      <p class="text-center sm:text-left text-muted">
        {$t('about.version')}
        {packageJson.version} -
        <button
          class=" underline hover:text-text-primary transition-colors underline-offset-2"
          onclick={domVisibility.show}>What's new?</button
        >
      </p>

      <p class="text-pretty mt-4 text-text-secondary">
        {@html $t('about.description')}
      </p>
      <p class="text-pretty mt-2 text-text-secondary">
        Help project by donate or leave review!
      </p>
      <div class="flex justify-center sm:justify-start mt-4 gap-4">
        <ButtonSupport />
        <ButtonRate />
      </div>
    </div>
  </div>

  <div>
    <h3 class="font-semibold text-gray-900 dark:text-white">
      {$t('about.key_features')}
    </h3>
    <ul class=" mt-4 space-y-4">
      <li class="flex gap-4 items-start">
        <div class="size-16 shrink-0 overflow-hidden relative">
          <div
            class="absolute z-40 border border-border dark:border-surface-2 inset-0"
          ></div>
          <div class="absolute inset-1 bg-white/50 dark:bg-white/3"></div>
          <span
            class="absolute z-20 size-6 rotate-45 bg-surface-1 bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <span
            class="absolute z-20 size-6 rotate-45 bg-surface-1 top-px right-px translate-x-1/2 -translate-y-1/2"
          ></span>
          <span
            class="absolute z-50 size-4 rotate-45 bg-surface-1 border border-border dark:border-surface-2 bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <span
            class="absolute z-50 size-4 rotate-45 border-surface-1 bg-border dark:bg-muted border dark:border-surface-2 top-px right-px translate-x-1/2 -translate-y-1/2"
          ></span>
          <Icon
            icon="heroicons:circle-stack"
            class="size-6 center-abs text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
          />
        </div>
        <div>
          <h4 class=" font-medium">{$t('about.data_sovereignty_title')}</h4>
          <p class="mt-1 text-muted">
            {$t('about.data_sovereignty_desc')}
          </p>
        </div>
      </li>

      <li class="flex gap-4 items-start">
        <div class="size-16 shrink-0 overflow-hidden relative">
          <div
            class="absolute z-40 border border-border dark:border-surface-2 inset-0"
          ></div>
          <div class="absolute inset-1 bg-white/50 dark:bg-white/3"></div>
          <span
            class="absolute z-20 size-6 rotate-45 bg-surface-1 bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <span
            class="absolute z-20 size-6 rotate-45 bg-surface-1 top-px right-px translate-x-1/2 -translate-y-1/2"
          ></span>
          <span
            class="absolute z-50 size-4 rotate-45 bg-surface-1 border border-border dark:border-surface-2 bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <span
            class="absolute z-50 size-4 rotate-45 border-surface-1 bg-border dark:bg-muted border dark:border-surface-2 top-px right-px translate-x-1/2 -translate-y-1/2"
          ></span>
          <Icon
            icon="heroicons:adjustments-horizontal"
            class="size-6 center-abs text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
          />
        </div>
        <div>
          <h4 class=" font-medium">{$t('about.customizable_title')}</h4>
          <p class="mt-1 text-muted">
            {$t('about.customizable_desc')}
          </p>
        </div>
      </li>

      <li class="flex gap-4 items-start">
        <div class="size-16 shrink-0 overflow-hidden relative">
          <div
            class="absolute z-40 border border-border dark:border-surface-2 inset-0"
          ></div>
          <div class="absolute inset-1 bg-white/50 dark:bg-white/3"></div>
          <span
            class="absolute z-20 size-6 rotate-45 bg-surface-1 bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <span
            class="absolute z-20 size-6 rotate-45 bg-surface-1 top-px right-px translate-x-1/2 -translate-y-1/2"
          ></span>
          <span
            class="absolute z-50 size-4 rotate-45 bg-surface-1 border border-border dark:border-surface-2 bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <span
            class="absolute z-50 size-4 rotate-45 border-surface-1 bg-border dark:bg-muted border dark:border-surface-2 top-px right-px translate-x-1/2 -translate-y-1/2"
          ></span>
          <Icon
            icon="heroicons:device-phone-mobile"
            class="size-6 center-abs text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
          />
        </div>
        <div>
          <h4 class=" font-medium">{$t('about.cross_platform_title')}</h4>
          <p class="mt-1 text-muted">
            {$t('about.cross_platform_desc')}
          </p>
        </div>
      </li>
    </ul>
  </div>

  <!-- Developer -->
  <div class="border-t border-border pt-4">
    <p class=" text-text-primary mt-2">
      {@html $t('about.developer_credit')}
    </p>
    <p class=" text-text-secondary mt-1">
      <a
        href="https://summarizerrrr.com/"
        class=" underline underline-offset-1"
        target="_blank">Summarizerrrr.com</a
      >
      •
      {$t('about.availability')}
    </p>
  </div>

  <!-- Links -->
  <div class="flex flex-col sm:flex-row sm:flex-wrap gap-3 text-sm">
    <a
      href="https://github.com/trongnguyen24/Summarizerrrr"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center space-x-2 sm:space-x-1 transition-colors hover:underline"
    >
      <div class="size-4">
        <Icon icon="mdi:github" class="w-4 h-4" />
      </div>
      <span class="flex items-center"
        >{$t('about.github')}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </span>
    </a>
    <a
      href="https://chromewebstore.google.com/detail/summarizerrrr/ahfjndakflcegianjdojpldllodpkkpc"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center space-x-2 sm:space-x-1 transition-colors hover:underline"
    >
      <div class="size-4">
        <Icon icon="logos:chrome" class="w-4 h-4" />
      </div>
      <span class="flex items-center"
        >{$t('about.chrome_store')}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </span>
    </a>
    <a
      href="https://addons.mozilla.org/en-CA/firefox/addon/summarizerrrr/"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center space-x-2 sm:space-x-1 transition-colors hover:underline"
    >
      <div class="size-4">
        <Icon icon="logos:firefox" class="w-4 h-4" />
      </div>
      <span class="flex items-center"
        >{$t('about.firefox_addons')}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </span>
    </a>
    <a
      href="https://addons.mozilla.org/en-CA/firefox/addon/summarizerrrr/"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center space-x-2 sm:space-x-1 transition-colors hover:underline"
    >
      <div class="size-4">
        <Icon icon="logos:microsoft-edge" class="w-4 h-4" />
      </div>
      <span class="flex items-center"
        >Edge Add-ons
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </span>
    </a>
  </div>
</div>
