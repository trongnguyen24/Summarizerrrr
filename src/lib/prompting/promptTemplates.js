// @ts-nocheck
import { youtubeSummary } from '@/lib/prompts/templates/youtubeSummary.js'
import { chappterPrompt } from '@/lib/prompts/templates/youtubeChappter.js'
import { courseConcepts } from '@/lib/prompts/templates/courseConcepts.js'
import { courseSummary } from '@/lib/prompts/templates/courseSummary.js'
import { general } from '@/lib/prompts/templates/general.js'
import { selectedText } from '@/lib/prompts/templates/selectedText.js'

export const promptTemplates = [
  youtubeSummary,
  chappterPrompt,
  courseConcepts,
  courseSummary,
  general,
  selectedText,
]
