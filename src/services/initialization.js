import { loadSettings, subscribeToSettingsChanges } from '../stores/settingsStore.svelte.js';
import { initializeTheme, subscribeToSystemThemeChanges, applyThemeToDocument, themeSettings } from '../stores/themeStore.svelte.js';
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';

export function initializeApp() {
  const options = {
    scrollbars: {
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  };
  const [initialize] = useOverlayScrollbars({ options, defer: true });

  initialize(document.body);

  loadSettings();
  initializeTheme();
  const unsubscribeTheme = subscribeToSystemThemeChanges();
  subscribeToSettingsChanges();

  // Effect to apply theme
  $effect(() => {
    applyThemeToDocument(themeSettings.theme);
  });

  // Effect to apply font
  $effect(() => {
    if (document.body && settings.selectedFont) {
      document.body.classList.remove('font-default', 'font-noto-serif', 'font-opendyslexic', 'font-mali');
      document.body.classList.add(`font-${settings.selectedFont}`);
    }
  });

  return () => {
    unsubscribeTheme();
  };
}
