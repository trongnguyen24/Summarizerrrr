import { gemini25ProConfig } from './models/gemini-2.5-pro.js'
import { gemini25FlashConfig } from './models/gemini-2.5-flash.js'
import { gemini20FlashConfig } from './models/gemini-2.0-flash.js'

export const geminiModelsConfig = {
  'gemini-2.5-pro-preview-05-06': gemini25ProConfig,
  'gemini-2.5-flash-preview-05-20': gemini25FlashConfig,
  'gemini-2.0-flash': gemini20FlashConfig,
  // Add other model configurations here
}
