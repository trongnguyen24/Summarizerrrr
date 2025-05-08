import { gemini20ProConfig } from './models/gemini-2.5-pro.js'
import { gemini25FlashPreviewConfig } from './models/gemini-2.5-flash-preview-04-17.js'
import { gemini20FlashConfig } from './models/gemini-2.0-flash.js'
import { gemini20FlashLiteConfig } from './models/gemini-2.0-flash-lite.js'

export const geminiModelsConfig = {
  'gemini-2.5-pro-exp-03-25': gemini20ProConfig,
  'gemini-2.5-flash-preview-04-17': gemini25FlashPreviewConfig,
  'gemini-2.0-flash': gemini20FlashConfig,
  'gemini-2.0-flash-lite': gemini20FlashLiteConfig,
  // Add other model configurations here
}
