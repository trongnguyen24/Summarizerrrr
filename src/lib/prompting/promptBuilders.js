import { settings } from '@/stores/settingsStore.svelte.js'
import { youTubePromptTemplate } from '@/lib/prompts/youTubePromptTemplate.js'
import { youTubePromptTemplate_short } from '@/lib/prompts/youTubePromptTemplate_short.js'
import { youTubePromptTemplate_medium } from '@/lib/prompts/youTubePromptTemplate_medium.js'
import { generalPromptTemplate } from '@/lib/prompts/generalPromptTemplate.js'
import { generalPromptTemplate_short } from '@/lib/prompts/generalPromptTemplate_short.js'
import { generalPromptTemplate_medium } from '@/lib/prompts/generalPromptTemplate_medium.js'
import { chapterPromptTemplate } from '@/lib/prompts/chapterPromptTemplate.js'
import { selectedTextPromptTemplate } from '@/lib/prompts/selectedTextPromptTemplate.js'
import { courseSummaryPromptTemplate } from '@/lib/prompts/courseSummaryPromptTemplate.js'
import { courseConceptsPromptTemplate } from '@/lib/prompts/courseConceptsPromptTemplate.js'
import { systemInstructions } from './systemInstructions.js'
import { replacePlaceholders } from './promptUtils.js'

export const promptBuilders = {
  youtube: {
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = systemInstructions.youtube
      let userPrompt = youTubePromptTemplate

      if (settings.isSummaryAdvancedMode && settings.youtubePromptSelection) {
        systemInstruction = settings.youtubeCustomSystemInstructionContent || ''
        userPrompt = settings.youtubeCustomPromptContent || ''
      } else {
        // Select template based on length
        if (length === 'short') {
          userPrompt = youTubePromptTemplate_short
        } else if (length === 'medium') {
          userPrompt = youTubePromptTemplate_medium
        } else {
          userPrompt = youTubePromptTemplate // long version
        }
        userPrompt = replacePlaceholders(userPrompt, lang, length, format, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, text)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  general: {
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = systemInstructions.general
      let userPrompt = generalPromptTemplate

      if (settings.isSummaryAdvancedMode && settings.webPromptSelection) {
        systemInstruction = settings.webCustomSystemInstructionContent || ''
        userPrompt = settings.webCustomPromptContent || ''
      } else {
        // Select template based on length
        if (length === 'short') {
          userPrompt = generalPromptTemplate_short
        } else if (length === 'medium') {
          userPrompt = generalPromptTemplate_medium
        } else {
          userPrompt = generalPromptTemplate // long version
        }
        userPrompt = replacePlaceholders(userPrompt, lang, length, format, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, text)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  chapter: {
    buildPrompt: (timestampedTranscript, lang, length, tone) => {
      let systemInstruction = systemInstructions.chapter
      let userPrompt = chapterPromptTemplate

      if (settings.isSummaryAdvancedMode && settings.chapterPromptSelection) {
        systemInstruction = settings.chapterCustomSystemInstructionContent || ''
        userPrompt = settings.chapterCustomPromptContent || ''
      } else {
        userPrompt = replacePlaceholders(userPrompt, lang, length, null, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, timestampedTranscript)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  selectedText: {
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = systemInstructions.selectedText
      let userPrompt = selectedTextPromptTemplate

      if (
        settings.isSummaryAdvancedMode &&
        settings.selectedTextPromptSelection
      ) {
        systemInstruction =
          settings.selectedTextCustomSystemInstructionContent || ''
        userPrompt = settings.selectedTextCustomPromptContent || ''
      } else {
        userPrompt = replacePlaceholders(userPrompt, lang, length, format, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, text)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  courseSummary: {
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = systemInstructions.courseSummary
      let userPrompt = courseSummaryPromptTemplate

      if (
        settings.isSummaryAdvancedMode &&
        settings.courseSummaryPromptSelection
      ) {
        systemInstruction =
          settings.courseSummaryCustomSystemInstructionContent || ''
        userPrompt = settings.courseSummaryCustomPromptContent || ''
      } else {
        userPrompt = replacePlaceholders(userPrompt, lang, length, format, tone)
      }

      userPrompt = userPrompt
        .replace(/__CONTENT__/g, text)
        .replace(/__LANG__/g, lang)
      return { systemInstruction, userPrompt }
    },
  },
  courseConcepts: {
    buildPrompt: (text, lang, format, tone) => {
      let systemInstruction = systemInstructions.courseConcepts
      let userPrompt = courseConceptsPromptTemplate

      if (
        settings.isSummaryAdvancedMode &&
        settings.courseConceptsPromptSelection
      ) {
        systemInstruction =
          settings.courseConceptsCustomSystemInstructionContent || ''
        userPrompt = settings.courseConceptsCustomPromptContent || ''
      } else {
        userPrompt = replacePlaceholders(userPrompt, lang, null, format, tone)
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
