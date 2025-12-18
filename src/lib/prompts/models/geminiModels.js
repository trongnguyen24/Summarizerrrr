// @ts-nocheck
export const geminiBasicModels = [
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
  {
    value: 'gemini-3-flash-preview',
    label: '3.0 Flash',
    description: 'Latest and fastest.',
    generationConfig: {
      maxOutputTokens: 65536,
      temperature: 0.3,
      topP: 0.9,
    },
  },
  
]
