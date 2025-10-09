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

// Thêm vào cuối file
export const customActionTemplates = {
  analyze: {
    systemPrompt:
      'You are an expert content analyst. Analyze the given content systematically, focusing on structure, arguments, evidence, and logical flow.',
    userPrompt:
      'Analyze this content in __LANG__ focusing on:\n- Key arguments and main points\n- Logical structure and flow\n- Evidence and supporting details\n- Strengths and weaknesses\n- Conclusion and implications\n\nContent:\n__CONTENT__',
  },

  explain: {
    systemPrompt:
      'You are an expert educator who excels at making complex topics simple and accessible to everyone.',
    userPrompt:
      'Explain this content in clear, simple terms in __LANG__:\n- Break down complex concepts\n- Use analogies and examples when helpful\n- Define technical terms\n- Structure explanation logically\n- Make it engaging and easy to understand\n\nContent:\n__CONTENT__',
  },

  reply: {
    systemPrompt:
      'You are a thoughtful discussion partner who generates meaningful, constructive responses that encourage further dialogue.',
    userPrompt:
      'Generate a thoughtful response in __LANG__ to this content:\n- Provide additional perspectives or viewpoints\n- Ask follow-up questions that encourage deeper thinking\n- Offer constructive feedback or commentary\n- Suggest related ideas or connections\n- Maintain a respectful, engaging tone\n\nContent:\n__CONTENT__',
  },
}
