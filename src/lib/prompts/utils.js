import { parameterDefinitions } from './modules/parameterDefinitions.js'

export function replacePlaceholders(userPrompt, lang, length, tone) {
  const lengthDescription = parameterDefinitions.length[length]
  const toneDescription = parameterDefinitions.tone[tone]

  return userPrompt
    .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
    .replace(/__LANG__/g, lang)
    .replace(/__TONE_DESCRIPTION__/g, toneDescription)
}
