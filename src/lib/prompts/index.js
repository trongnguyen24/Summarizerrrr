import { youtubeSummary, youtubeChapter } from './templates/youtube.js'
import { generalSummary, customActionTemplates } from './templates/general.js'
import { courseConcepts, courseSummary } from './templates/course.js'
import { selectedText } from './templates/selectedText.js'

export const promptTemplates = [
  youtubeSummary,
  youtubeChapter,
  courseConcepts,
  courseSummary,
  generalSummary,
  selectedText,
]

export { customActionTemplates }
