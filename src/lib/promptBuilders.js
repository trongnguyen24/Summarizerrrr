// @ts-nocheck
import { settings } from '../stores/settingsStore.svelte.js'
import { youTubePromptTemplate } from './prompts/youTubePromptTemplate.js'
import { generalPromptTemplate } from './prompts/generalPromptTemplate.js'
import { chapterPromptTemplate } from './prompts/chapterPromptTemplate.js'
import { selectedTextPromptTemplate } from './prompts/selectedTextPromptTemplate.js'
import { udemySummaryPromptTemplate } from './prompts/udemySummaryPromptTemplate.js'
import { udemyConceptsPromptTemplate } from './prompts/udemyConceptsPromptTemplate.js'
import { parameterDefinitions } from './prompts/modules/parameterDefinitions.js'

export const promptBuilders = {
  youtube: {
    systemInstruction:
      'You are an assistant specializing in analyzing and summarizing YouTube videos based on the provided transcript. Your task is to create a concise, accurate, and structured summary, strictly adhering to the parameters and guidelines below. Only use information contained within the provided <Transcript>.',
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = promptBuilders.youtube.systemInstruction
      let userPrompt = youTubePromptTemplate

      if (settings.isSummaryAdvancedMode && settings.youtubePromptSelection) {
        systemInstruction = settings.youtubeCustomSystemInstructionContent || ''
        userPrompt = settings.youtubeCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
  general: {
    systemInstruction:
      'You are an expert in accurately, concisely, and effectively analyzing and summarizing website content. Your task is to process the provided text, analyze the main content and related sections (such as comments), and then create a structured summary according to the detailed parameters and instructions from the user. You must strictly adhere to the formatting rules and output constraints.',
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = promptBuilders.general.systemInstruction
      let userPrompt = generalPromptTemplate

      if (settings.isSummaryAdvancedMode && settings.webPromptSelection) {
        systemInstruction = settings.webCustomSystemInstructionContent || ''
        userPrompt = settings.webCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
  chapter: {
    systemInstruction:
      'You are a professional assistant in analyzing and summarizing timestamped YouTube video transcripts. Your task is to divide the transcript into logical chapters or sections based on content and time, then create a detailed summary for each section as requested by the user. You must strictly adhere to the specified output structure and format.',
    buildPrompt: (timestampedTranscript, lang, length, tone) => {
      let systemInstruction = promptBuilders.chapter.systemInstruction
      let userPrompt = chapterPromptTemplate

      if (settings.isSummaryAdvancedMode && settings.chapterPromptSelection) {
        systemInstruction = settings.chapterCustomSystemInstructionContent || ''
        userPrompt = settings.chapterCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LANG__/g, lang)
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, timestampedTranscript)
      return { systemInstruction, userPrompt }
    },
  },
  selectedText: {
    systemInstruction: `You are an AI tool integrated into the browser, specializing in analyzing and summarizing user-selected text content. Your goal is to provide accurate, concise, and customized summaries that align with user preferences.`,
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = promptBuilders.selectedText.systemInstruction
      let userPrompt = selectedTextPromptTemplate

      if (
        settings.isSummaryAdvancedMode &&
        settings.selectedTextPromptSelection
      ) {
        systemInstruction =
          settings.selectedTextCustomSystemInstructionContent || ''
        userPrompt = settings.selectedTextCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
  udemySummary: {
    systemInstruction:
      'You are an assistant specializing in analyzing and summarizing Udemy lectures based on the provided transcript. Your task is to create a concise, accurate, and structured summary, strictly adhering to the parameters and guidelines below. Only use information contained within the provided <Transcript>.',
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = promptBuilders.udemySummary.systemInstruction
      let userPrompt = udemySummaryPromptTemplate

      if (
        settings.isSummaryAdvancedMode &&
        settings.udemySummaryPromptSelection
      ) {
        systemInstruction =
          settings.udemySummaryCustomSystemInstructionContent || ''
        userPrompt = settings.udemySummaryCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
  udemyConcepts: {
    systemInstruction:
      'My goal is to gain a deeper understanding of specialized concepts mentioned in an online course. You need to use your extensive knowledge to provide detailed, in-depth, and easy-to-understand explanations of these terms.',
    buildPrompt: (text, lang, format, tone) => {
      let systemInstruction = promptBuilders.udemyConcepts.systemInstruction
      let userPrompt = udemyConceptsPromptTemplate

      if (
        settings.isSummaryAdvancedMode &&
        settings.udemyConceptsPromptSelection
      ) {
        systemInstruction =
          settings.udemyConceptsCustomSystemInstructionContent || ''
        userPrompt = settings.udemyConceptsCustomPromptContent || ''
      } else {
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
  promptEnhance: {
    systemInstruction: `You are an expert AI Prompt Engineer specializing in optimizing prompts for professional applications. You enhance prompts improving clarity and effectiveness.
`,
    buildPrompt: (text, lang) => {
      return {
        systemInstruction: promptBuilders.promptEnhance.systemInstruction,
        userPrompt: text.replace(/__LANG__/g, lang),
      }
    },
  },
}
