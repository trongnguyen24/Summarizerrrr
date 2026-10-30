import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'

/**
 * Which surface the side panel is currently showing.
 *
 * Both surfaces scroll the same element (the document — neither has a local
 * overflow container), but each keeps its own per-tab scroll offset: the
 * summary surface in `services/tabCacheService.js`, chat in `chatStore`'s
 * session snapshots. Whoever is off screen must not touch the viewport, so
 * this flag has to be readable outside `App.svelte` — `messageHandler` reads
 * it before saving or restoring the summary offset.
 *
 * The panel opens on whichever surface the user last switched to explicitly
 * (`settings.sidepanelSurface`): summary until they pick Try Chat, chat from
 * then on until they go back via the chat menu's "Back to Summarize".
 */
export const sidepanelViewState = $state({
  /** @type {'chat' | 'summary'} */
  surface: 'summary',
})

/** Call once settings are loaded, before the first surface matters. */
export function applySavedSurface() {
  sidepanelViewState.surface =
    settings.sidepanelSurface === 'chat' ? 'chat' : 'summary'
}

function switchSurface(surface) {
  sidepanelViewState.surface = surface
  if (settings.sidepanelSurface !== surface) {
    updateSettings({ sidepanelSurface: surface })
  }
}

export function showChatSurface() {
  switchSurface('chat')
}

export function showSummarySurface() {
  switchSurface('summary')
}
