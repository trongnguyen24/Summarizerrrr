// @ts-nocheck
import { youtubeCustomPromptContent_detail as youtubeDetail } from '@/lib/prompts/templates/youtube/detail.js'
import { youtubeCustomPromptContent_short as youtubeShort } from '@/lib/prompts/templates/youtube/short.js'
import { chapterCustomPromptContent_detail as chapterDetail } from '@/lib/prompts/templates/chapter/detail.js'
import { chapterCustomPromptContent_short as chapterShort } from '@/lib/prompts/templates/chapter/short.js'
import { webCustomPromptContent_detail as webDetail } from '@/lib/prompts/templates/web/detail.js'
import { webCustomPromptContent_short as webShort } from '@/lib/prompts/templates/web/short.js'
import { courseSummaryCustomPromptContent_detail as courseSummaryDetail } from '@/lib/prompts/templates/courseSummary/detail.js'
import { courseSummaryCustomPromptContent_short as courseSummaryShort } from '@/lib/prompts/templates/courseSummary/short.js'
import { courseConceptsCustomPromptContent_detail as courseConceptsDetail } from '@/lib/prompts/templates/courseConcepts/detail.js'
import { courseConceptsCustomPromptContent_short as courseConceptsShort } from '@/lib/prompts/templates/courseConcepts/short.js'
import { selectedTextCustomPromptContent_detail as selectedTextDetail } from '@/lib/prompts/templates/selectedText/detail.js'
import { selectedTextCustomPromptContent_short as selectedTextShort } from '@/lib/prompts/templates/selectedText/short.js'

export const promptTemplates = {
  youtubeCustomPromptContent: [youtubeDetail, youtubeShort],
  chapterCustomPromptContent: [chapterShort, chapterDetail],
  webCustomPromptContent: [webDetail, webShort],
  courseSummaryCustomPromptContent: [courseSummaryDetail, courseSummaryShort],
  courseConceptsCustomPromptContent: [
    courseConceptsDetail,
    courseConceptsShort,
  ],
  selectedTextCustomPromptContent: [selectedTextDetail, selectedTextShort],
}
