import { gemini25FlashConfig } from '../prompting/models/gemini-2.5-flash.js'
import { gemini25FlashLiteConfig } from '../prompting/models/gemini-2.5-flash-lite.js'
import { gemini20FlashConfig } from '../prompting/models/gemini-2.0-flash.js'

export const geminiModelsConfig = {
  'gemini-2.5-flash': gemini25FlashConfig,
  'gemini-2.0-flash': gemini20FlashConfig,
  'gemini-2.5-flash-lite-preview-06-05': gemini25FlashLiteConfig,

  // Add other model configurations here
}
