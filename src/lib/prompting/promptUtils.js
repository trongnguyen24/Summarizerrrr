import { parameterDefinitions } from './prompts/modules/parameterDefinitions.js'

export function replacePlaceholders(userPrompt, lang, length, format, tone) {
  const lengthDescription = parameterDefinitions.length[length]
  const formatDescription = parameterDefinitions.format[format]
  const toneDescription = parameterDefinitions.tone[tone]

  return userPrompt
    .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
    .replace(/__LANG__/g, lang)
    .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
    .replace(/__TONE_DESCRIPTION__/g, toneDescription)
}
