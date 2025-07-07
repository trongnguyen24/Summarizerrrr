// @ts-nocheck
export const chapterCustomPromptContent_short = {
  title: 'Simple prompt',
  systemInstruction: `You are a YouTube video analysis expert. Task:
- Create chapter summaries from transcripts
- Retain important information: figures, names, examples
- Write concisely, easy to understand`,
  userPrompt: `Analyze this transcript and create chapters:

__CONTENT__

Requirements:
- Language: English
- Create chapters by time
- Include: examples, figures, names of people/companies
- Chapter names: short and clear

Format:
## Video Summary:

### [Time] - [Chapter Name]
- Main content
- **Important keywords** (bold)
- Specific examples
- Figures/data (if any)

## General Conclusion
[Main message of the video]`,
}
