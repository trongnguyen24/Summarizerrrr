// @ts-nocheck
export const youTubePromptTemplate_medium = `
<TASK>
Provide a structured summary (100-200 words) of this YouTube video content, covering the main points clearly.
</TASK>

<INPUT_FORMAT>
The input transcript includes:
1. **Video title** wrapped in <title></title> tags at the beginning
2. **Timestamped transcript** in format [HH:MM:SS → HH:MM:SS] or [MM:SS → MM:SS]

Use the title to understand the video topic and timestamps to understand structure, but don't include them in your summary.
</INPUT_FORMAT>

<PARAMETERS>
- **Length:** __LENGTH_DESCRIPTION__
- **Language:** __LANG__
- **Tone:** __TONE_DESCRIPTION__
</PARAMETERS>

<OUTPUT_FORMAT>
## [Video Topic/Title]
[Brief overview of what the video covers]

## Main Points
- [Key point 1 - concise sentence]
- [Key point 2 - concise sentence]
- [Key point 3 - concise sentence]
- [Additional points if necessary, max 5 total]

## Key Takeaways
[Most important conclusions or actionable insights]
</OUTPUT_FORMAT>

<REQUIREMENTS>
✅ **Focused**: Main topics and important points only
✅ **Structured**: Clear bullet points for easy reading
✅ **Balanced**: 100-200 words maximum
✅ **Actionable**: Include practical takeaways when present
❌ **Avoid**: Detailed step-by-step instructions, minor examples
❌ **No**: Excessive sub-sections, lengthy explanations
</REQUIREMENTS>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
