// @ts-nocheck
export const geminiBasicModels = [
  {
    value: 'gemini-2.0-flash',
    label: '2.0 Flash',
    description: 'Fast and efficient.',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.2,
      topP: 0.9,
    },
  },
  {
    value: 'gemini-2.5-flash-lite',
    label: '2.5 Lite',
    description: 'A lighter version of 2.5 Flash.',
    generationConfig: {
      maxOutputTokens: 65536,
      temperature: 0.3,
      topP: 0.9,
    },
  },
  {
    value: 'gemini-2.5-flash',
    label: '2.5 Flash',
    description: 'Powerful but slow.',
    generationConfig: {
      maxOutputTokens: 65536,
      temperature: 0.3,
      topP: 0.9,
    },
  },
]

export const geminiAdvancedModels = [
  {
    value: 'gemini-2.5-pro',
    label: '2.5 Pro',
    description: 'Most powerful, Very slow + limit.',
    generationConfig: {
      maxOutputTokens: 65536,
      temperature: 0.3,
      topP: 0.9,
    },
  },
  {
    value: 'gemini-2.5-flash',
    label: '2.5 Flash',
    description: 'Powerful but slow.',
    generationConfig: {
      maxOutputTokens: 65536,
      temperature: 0.3,
      topP: 0.9,
    },
  },
  {
    value: 'gemini-2.5-flash-lite',
    label: '2.5 Flash-Lite',
    description: 'A lighter version of 2.5 Flash.',
    generationConfig: {
      maxOutputTokens: 65536,
      temperature: 0.3,
      topP: 0.9,
    },
  },

  {
    value: 'gemini-2.0-flash',
    label: '2.0 Flash',
    description: 'Fast and efficient.',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.2,
      topP: 0.9,
    },
  },
  {
    value: 'gemini-2.0-flash-lite',
    label: '2.0 Flash Lite',
    description: 'A lighter version of 2.0 Flash.',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.2,
      topP: 0.9,
    },
  },
]
