<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import {
    themeSettings,
    setTheme,
    // updateThemeSettings as updateThemeStoreSettings, // Không còn cần thiết, dùng setTheme thay thế
  } from '../../stores/themeStore.svelte' // Import themeSettings và updateThemeSettings
  import { t } from 'svelte-i18n'
  import Logo from '../ui/Logo.svelte'
  import packageJson from '../../../package.json'

  function handleUpdateSetting(key, value) {
    updateSettings({ [key]: value })
  }
</script>

<!-- About Section -->
<div class="setting-block flex pb-6 pt-5 px-5 flex-col space-y-6">
  <!-- Logo và tên -->
  <div class="flex gap-6 flex-col sm:flex-row items-center">
    <div class="w-52 relative shrink-0 p-4"><Logo /></div>
    <div>
      <h2 class="text-lg font-bold text-primary">Summarizerrrr</h2>

      <p class=" text-muted">Version {packageJson.version}</p>
      <p class="text-pretty mt-4 text-text-secondary">
        Summarize everything in 1 click, save time.<br /> Extension helps you
        summarize for <b>YouTube, Udemy, Coursera, any websites</b>. Crafted
        with superior UI/UX design.
      </p>
    </div>
  </div>

  <div>
    <h3 class="font-semibold text-gray-900 dark:text-white">Key Features</h3>
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
          <h4 class=" font-medium">Your data is yours</h4>
          <p class=" text-muted">
            Your keys, your data, your control. For complete privacy - use a
            local model through our integration with Ollama.
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
          <h4 class=" font-medium">Customizable</h4>
          <p class=" text-muted">
            Provider, temperature, top P, length, format, languages, appearance,
            sytem prompt and user prompt...
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
          <h4 class=" font-medium">Cross-Platform Compatibility</h4>
          <p class=" text-muted">
            Desktop, Tablet, and Mobile. Work on Mobile browsers including
            Firefox Android and Kiwi Browser.
          </p>
        </div>
      </li>
    </ul>
  </div>

  <!-- Developer -->
  <div class="border-t border-border pt-4">
    <p class=" text-text-primary">Designed and developed by Nguyen Le</p>
    <p class=" text-text-secondary tẽ mt-1">
      Open source • MIT License • Available on Chrome Web Store & Firefox
      Add-ons
    </p>
  </div>

  <!-- Links -->
  <div class="flex flex-wrap gap-3 text-sm">
    <a
      href="https://github.com/trongnguyen24/Summarizerrrr"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center space-x-1 transition-colors"
    >
      <Icon icon="mdi:github" class="w-4 h-4" />
      <span>GitHub</span>
    </a>
    <a
      href="https://chromewebstore.google.com/detail/summarizerrrr/ahfjndakflcegianjdojpldllodpkkpc"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center space-x-1 transition-colors"
    >
      <Icon icon="logos:chrome" class="w-4 h-4" />
      <span>Chrome Store</span>
    </a>
    <a
      href="https://addons.mozilla.org/en-CA/firefox/addon/summarizerrrr/"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center space-x-1 transition-colors"
    >
      <Icon icon="logos:firefox" class="w-4 h-4" />
      <span>Firefox Add-ons</span>
    </a>
  </div>
</div>
