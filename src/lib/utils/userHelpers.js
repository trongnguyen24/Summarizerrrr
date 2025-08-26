// @ts-nocheck

/**
 * Checks if the user has any API key configured
 * @param {Object} settings - The settings object
 * @returns {boolean} - True if user has any API key, false otherwise
 */
export function hasAnyApiKey(settings) {
  const apiKeyFields = [
    'geminiApiKey',
    'geminiAdvancedApiKey',
    'openaiCompatibleApiKey',
    'openrouterApiKey',
    'deepseekApiKey',
    'chatgptApiKey',
    'groqApiKey',
  ]

  return apiKeyFields.some((field) => {
    const key = settings[field]
    return (
      key && key.trim() && key !== 'AIzaSyA6I0DGp3XgSoGDZqergz9JAryupj-0JOI'
    ) // Loại trừ demo key
  })
}

/**
 * Checks if the user is a new user (no API keys and hasn't completed onboarding)
 * @param {Object} settings - The settings object
 * @returns {boolean} - True if user is new, false otherwise
 */
export function isNewUser(settings) {
  return !hasAnyApiKey(settings) && !settings.hasCompletedOnboarding
}

/**
 * Completes the onboarding process by updating settings
 * @returns {Promise<void>}
 */
export async function completeOnboarding() {
  const { updateSettings } = await import('@/stores/settingsStore.svelte.js')
  await updateSettings({
    hasCompletedOnboarding: true,
    onboardingStep: 0,
  })
}
