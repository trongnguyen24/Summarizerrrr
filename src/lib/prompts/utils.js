import { parameterDefinitions } from './modules/parameterDefinitions.js'

export function replacePlaceholders(userPrompt, lang, length, tone) {
  const lengthDescription = parameterDefinitions.length[length]
  // Check if tone definition is an object (new structure) or string (legacy)
  const toneDef = parameterDefinitions.tone[tone]
  const toneDescription = typeof toneDef === 'object' ? toneDef.toneDescription : toneDef

  return userPrompt
    .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
    .replace(/__LANG__/g, lang)
    .replace(/__TONE_DESCRIPTION__/g, toneDescription)
}
