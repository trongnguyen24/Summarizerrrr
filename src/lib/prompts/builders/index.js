import { settings } from '@/stores/settingsStore.svelte.js'
import {
  youtubeSummary,
  youtubeSummaryShort,
  youtubeSummaryMedium,
  youtubeChapter,
} from '../templates/youtube.js'
import {
  generalSummary,
  generalSummaryShort,
  generalSummaryMedium,
} from '../templates/general.js'
import { selectedText } from '../templates/selectedText.js'
import { courseSummary, courseConcepts } from '../templates/course.js'
import { systemInstructions } from '../systemInstructions.js'
import { replacePlaceholders } from '../utils.js'
import { toneDefinitions } from '../modules/toneDefinitions.js'

function getSystemRole(tone) {
  const toneDef = toneDefinitions[tone]
  return typeof toneDef === 'object' ? toneDef.systemRole : null
}

export const promptBuilders = {
  youtube: {
    buildPrompt: (text, lang, length, tone) => {
      let systemInstruction = getSystemRole(tone) || systemInstructions.youtube
      let userPrompt = youtubeSummary.userPrompt

      if (settings.isSummaryAdvancedMode && settings.youtubePromptSelection) {
        systemInstruction = settings.youtubeCustomSystemInstructionContent || ''
        userPrompt = settings.youtubeCustomPromptContent || ''
      } else {
        // Select template based on length
        if (length === 'short') {
          userPrompt = youtubeSummaryShort
        } else if (length === 'medium') {
          userPrompt = youtubeSummaryMedium
        } else {
          userPrompt = youtubeSummary.userPrompt // long version
        }
        userPrompt = replacePlaceholders(userPrompt, lang, length, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, text)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  general: {
    buildPrompt: (text, lang, length, tone) => {
      let systemInstruction = getSystemRole(tone) || systemInstructions.general
      let userPrompt = generalSummary.userPrompt

      if (settings.isSummaryAdvancedMode && settings.webPromptSelection) {
        systemInstruction = settings.webCustomSystemInstructionContent || ''
        userPrompt = settings.webCustomPromptContent || ''
      } else {
        // Select template based on length
        if (length === 'short') {
          userPrompt = generalSummaryShort
        } else if (length === 'medium') {
          userPrompt = generalSummaryMedium
        } else {
          userPrompt = generalSummary.userPrompt // long version
        }
        userPrompt = replacePlaceholders(userPrompt, lang, length, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, text)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  chapter: {
    buildPrompt: (timestampedTranscript, lang, length, tone) => {
      let systemInstruction = getSystemRole(tone) || systemInstructions.chapter
      let userPrompt = youtubeChapter.userPrompt

      if (settings.isSummaryAdvancedMode && settings.chapterPromptSelection) {
        systemInstruction = settings.chapterCustomSystemInstructionContent || ''
        userPrompt = settings.chapterCustomPromptContent || ''
      } else {
        userPrompt = replacePlaceholders(userPrompt, lang, length, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, timestampedTranscript)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  selectedText: {
    buildPrompt: (text, lang, length, tone) => {
      let systemInstruction = getSystemRole(tone) || systemInstructions.selectedText
      let userPrompt = selectedText.userPrompt

      if (
        settings.isSummaryAdvancedMode &&
        settings.selectedTextPromptSelection
      ) {
        systemInstruction =
          settings.selectedTextCustomSystemInstructionContent || ''
        userPrompt = settings.selectedTextCustomPromptContent || ''
      } else {
        userPrompt = replacePlaceholders(userPrompt, lang, length, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, text)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  courseSummary: {
    buildPrompt: (text, lang, length, tone) => {
      let systemInstruction = getSystemRole(tone) || systemInstructions.courseSummary
      let userPrompt = courseSummary.userPrompt

      if (
        settings.isSummaryAdvancedMode &&
        settings.courseSummaryPromptSelection
      ) {
        systemInstruction =
          settings.courseSummaryCustomSystemInstructionContent || ''
        userPrompt = settings.courseSummaryCustomPromptContent || ''
      } else {
        userPrompt = replacePlaceholders(userPrompt, lang, length, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, text)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  courseConcepts: {
    buildPrompt: (text, lang, tone) => {
      let systemInstruction = getSystemRole(tone) || systemInstructions.courseConcepts
      let userPrompt = courseConcepts.userPrompt

      if (
        settings.isSummaryAdvancedMode &&
        settings.courseConceptsPromptSelection
      ) {
        systemInstruction =
          settings.courseConceptsCustomSystemInstructionContent || ''
        userPrompt = settings.courseConceptsCustomPromptContent || ''
      } else {
        userPrompt = replacePlaceholders(userPrompt, lang, null, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, text)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  promptEnhance: {
    buildPrompt: (text, lang) => {
      return {
        systemInstruction: systemInstructions.promptEnhance,
        userPrompt: text.replace(/__LANG__/g, lang),
      }
    },
  },
}
