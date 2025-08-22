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
    <div class="w-52 shrink-0 p-4"><Logo /></div>
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
    <ul>
      <li class=" p-2 flex gap-4 items-center">
        <div class="size-16 shrink-0 overflow-hidden relative">
          <div class="absolute z-40 border border-border inset-0"></div>
          <div class="absolute inset-0 bg-dot"></div>
          <span
            class="absolute z-50 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <Icon
            icon="heroicons:circle-stack"
            class="size-8 center-abs  drop-shadow-md drop-shadow-primary shrink-0"
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

      <li class=" p-2 flex gap-4 items-center">
        <div class="size-16 shrink-0 overflow-hidden relative">
          <div class="absolute z-40 border border-border inset-0"></div>
          <div class="absolute inset-0 bg-dot"></div>
          <span
            class="absolute z-20 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <Icon
            icon="heroicons:adjustments-horizontal"
            class="size-8 z-50 center-abs drop-shadow-md drop-shadow-primary shrink-0"
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
    </ul>
  </div>

  <!-- <div class="space-y-3">
    <h3 class="font-semibold text-gray-900 dark:text-white">Key Features</h3>
    <ul class="space-y-3">
      <li class="flex items-start text-text-secondary">
        <Icon icon="heroicons:sparkles" class="w-4 h-4 mr-2 shrink-0" />
        <span>You maintain privacy - your keys, your data, your control.</span>
      </li>
      <li class="flex items-start text-text-secondary">
        <Icon icon="heroicons:language" class="w-4 h-4 mr-2 shrink-0" />
        <span
          >Save time with YouTube videos, learn deeper with concepts explained
          thoroughly on Udemy and Coursera</span
        >
      </li>
      <li class="flex items-start text-text-secondary">
        <Icon
          icon="heroicons:adjustments-horizontal"
          class="w-4 h-4 mr-2 shrink-0"
        />
        <span
          >Customizable: provider, temperature, top P, length, format, languages
          sytem prompt and user prompt ...</span
        >
      </li>
      <li class="flex items-start text-text-secondary">
        <Icon icon="heroicons:swatch" class="w-4 h-4 mr-2 shrink-0" />
        <span>Beautiful Interface and better User Experience.</span>
      </li>
      <li class="flex items-start text-text-secondary">
        <Icon icon="heroicons:device-tablet" class="w-4 h-4 mr-2 shrink-0" />
        <span
          >Work on Desktop, Tablet and Mobile (Firefox Android or Kiwi browser)</span
        >
      </li>
    </ul>
  </div> -->

  <!-- Developer -->
  <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Designed and developed by Nguyen Le
    </p>
    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
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
      class="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      <Icon icon="mdi:github" class="w-4 h-4" />
      <span>GitHub</span>
    </a>
    <a
      href="https://chromewebstore.google.com/detail/summarizerrrr/ahfjndakflcegianjdojpldllodpkkpc"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      <Icon icon="logos:chrome" class="w-4 h-4" />
      <span>Chrome Store</span>
    </a>
    <a
      href="https://addons.mozilla.org/en-CA/firefox/addon/summarizerrrr/"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      <Icon icon="logos:firefox" class="w-4 h-4" />
      <span>Firefox Add-ons</span>
    </a>
  </div>
</div>
