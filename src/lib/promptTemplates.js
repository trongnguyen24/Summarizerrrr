// @ts-nocheck
import { youtubeCustomPromptContent_detail as youtubeDetail } from '@/lib/prompts/templates/youtube/detail.js'
import { youtubeCustomPromptContent_short as youtubeShort } from '@/lib/prompts/templates/youtube/short.js'
import { chapterCustomPromptContent_detail as chapterDetail } from '@/lib/prompts/templates/chapter/detail.js'
import { chapterCustomPromptContent_short as chapterShort } from '@/lib/prompts/templates/chapter/short.js'
import { webCustomPromptContent_detail as webDetail } from '@/lib/prompts/templates/web/detail.js'
import { webCustomPromptContent_short as webShort } from '@/lib/prompts/templates/web/short.js'
import { udemySummaryCustomPromptContent_detail as udemySummaryDetail } from '@/lib/prompts/templates/udemySummary/detail.js'
import { udemySummaryCustomPromptContent_short as udemySummaryShort } from '@/lib/prompts/templates/udemySummary/short.js'
import { udemyConceptsCustomPromptContent_detail as udemyConceptsDetail } from '@/lib/prompts/templates/udemyConcepts/detail.js'
import { udemyConceptsCustomPromptContent_short as udemyConceptsShort } from '@/lib/prompts/templates/udemyConcepts/short.js'
import { selectedTextCustomPromptContent_detail as selectedTextDetail } from '@/lib/prompts/templates/selectedText/detail.js'
import { selectedTextCustomPromptContent_short as selectedTextShort } from '@/lib/prompts/templates/selectedText/short.js'

export const promptTemplates = {
  youtubeCustomPromptContent: [youtubeDetail, youtubeShort],
  chapterCustomPromptContent: [chapterShort, chapterDetail],
  webCustomPromptContent: [webDetail, webShort],
  udemySummaryCustomPromptContent: [udemySummaryDetail, udemySummaryShort],
  udemyConceptsCustomPromptContent: [udemyConceptsDetail, udemyConceptsShort],
  selectedTextCustomPromptContent: [selectedTextDetail, selectedTextShort],
}
